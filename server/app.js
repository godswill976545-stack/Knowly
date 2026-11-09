import 'dotenv/config'
import { Hono } from 'hono'
import { neon } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'
import * as cheerio from 'cheerio'
import { writeFileSync, unlinkSync } from 'node:fs'
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { extractStructuredArticle, cleanAndFormatArticle, generateCleanSummary } from './format-news.js'
import { ensureSchema } from './bootstrap-db.js'

const sql = neon(process.env.DATABASE_URL)

// Self-heal schema drift on the configured database before the first request
// (idempotent; runs once per serverless cold start).
await ensureSchema()

// Nous Research (OpenAI-compatible) — primary provider. Defaults are free models.
const NOUS_BASE_URL = (process.env.NOUS_BASE_URL || 'https://inference-api.nousresearch.com/v1').replace(/\/+$/, '')
const NOUS_API_KEY = (process.env.NOUS_API_KEY || '').trim()
// Verified working free models (2026-10). The catalog rotates quickly —
// retired models 404 and the chain falls through to the next one / Gemini.
const NOUS_MODELS = (process.env.NOUS_MODELS || 'poolside/laguna-s-2.1:free,meituan/longcat-2.5-preview:free')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)
const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-3.6-flash,gemini-2.5-flash,gemini-2.0-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)
// Comma-separated Google AI Studio keys. Requests rotate across healthy keys;
// a key that returns 429/quota goes on cooldown instead of failing the chat.
const GOOGLE_API_KEYS = (process.env.GOOGLE_API_KEYS || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean)
const KEY_COOLDOWN_MS = 60_000
const keyCooldownUntil = new Map()
let keyCursor = 0

// TEMP diagnostics: set EXPOSE_PROVIDER_ERRORS=1 while debugging provider
// outages to include the upstream error (truncated) in API responses.
const EXPOSE_PROVIDER_ERRORS = process.env.EXPOSE_PROVIDER_ERRORS === '1'

function pickKeys() {
  const now = Date.now()
  const healthy = GOOGLE_API_KEYS.filter((k) => (keyCooldownUntil.get(k) || 0) <= now)
  const pool = healthy.length ? healthy : GOOGLE_API_KEYS
  if (!pool.length) return []
  const start = keyCursor % pool.length
  keyCursor += 1
  return [...pool.slice(start), ...pool.slice(0, start)]
}

const DEMO_USER_ID = 1

// ---- In-memory rate limiting for the AI endpoints ----
// Vercel lambdas are ephemeral, so this is best-effort per instance, but it
// blunts single-client bursts that would burn the free-tier AI quota.
const RATE_WINDOW_MS = 60_000
const rateBuckets = new Map()

function rateLimitOk(c, bucketKey, maxPerMinute) {
  const ip = (c.req.header('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const key = `${bucketKey}:${ip}`
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    if (rateBuckets.size > 5000) {
      for (const [k, v] of rateBuckets) {
        if (now - v.start > RATE_WINDOW_MS) rateBuckets.delete(k)
      }
    }
    rateBuckets.set(key, { start: now, count: 1 })
    return true
  }
  bucket.count += 1
  return bucket.count <= maxPerMinute
}

// clerkId -> db user id, to avoid an upsert on every request.
const clerkUserCache = new Map()
const CLERK_CACHE_MAX = 1000

// Resolve the caller to a db user id. Signed-in users (valid Clerk session
// token in `Authorization: Bearer ...`) get their own row, created on first
// use with blank profile/preferences. Guests and demo mode fall back to the
// shared demo user so the app keeps working without a session. A PRESENTED
// but invalid token is a hard 401 — silently downgrading an authenticated
// caller to the shared demo identity would let it read/write user 1's data.
async function currentUserId(c) {
  const auth = c.req.header('authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/)
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!match) return DEMO_USER_ID
  const unauthorized = () => Object.assign(new Error('Session invalide — reconnectez-vous.'), { status: 401 })
  if (!secretKey) {
    // Deployment misconfiguration (no CLERK_SECRET_KEY configured): fail loudly
    // in logs and /api/health, but degrade to the shared demo user instead of
    // hard-breaking every signed-in request. Once the secret is set, invalid
    // tokens below always get a hard 401.
    console.error('CLERK_SECRET_KEY is not configured — treating authenticated request as demo user. Set CLERK_SECRET_KEY to enable per-user data.')
    return DEMO_USER_ID
  }
  try {
    const payload = await verifyToken(match[1], { secretKey })
    const clerkId = payload.sub
    if (!clerkId) throw unauthorized()
    const cached = clerkUserCache.get(clerkId)
    if (cached) return cached
    const rows = await sql`
      INSERT INTO users (name, clerk_id)
      VALUES ('MonCheck User', ${clerkId})
      ON CONFLICT (clerk_id) DO UPDATE SET clerk_id = EXCLUDED.clerk_id
      RETURNING id`
    const id = rows[0].id
    await sql`INSERT INTO financial_profiles (user_id) VALUES (${id}) ON CONFLICT (user_id) DO NOTHING`
    await sql`INSERT INTO user_preferences (user_id) VALUES (${id}) ON CONFLICT (user_id) DO NOTHING`
    if (clerkUserCache.size >= CLERK_CACHE_MAX) {
      clerkUserCache.delete(clerkUserCache.keys().next().value)
    }
    clerkUserCache.set(clerkId, id)
    return id
  } catch (err) {
    if (err?.status === 401) throw err
    console.error('Clerk token verification failed:', err.message)
    throw unauthorized()
  }
}

const SYNONYM_GROUPS = [
  ['impôt', 'impots', 'taxe', 'taxes', 'fiscal', 'fisc', 'douane'],
  ['travail', 'emploi', 'employé', 'employe', 'salarié', 'salrie', 'embauche', 'licenciement'],
  ['entreprise', 'commerce', 'société', 'societe', 'business', 'entrepreneur'],
  ['terrain', 'foncier', 'propriété', 'propriete', 'terre', 'fonction', 'domaine'],
  ['mariage', 'divorce', 'famille', 'enfant', 'succession', 'héritage', 'heritage'],
  ['santé', 'sante', 'hôpital', 'hopital', 'maladie', 'médecin'],
  ['école', 'ecole', 'éducation', 'education', 'étudiant', 'etudiant', 'scolaire', 'université'],
  ['passeport', 'document', 'identité', 'identite', 'état civil', 'etat civil'],
  ['investir', 'épargne', 'epargne', 'argent', 'banque', 'crédit', 'credit', 'prêt', 'pret'],
]

function expandQuery(question) {
  const lower = question.toLowerCase()
  const extras = []
  for (const group of SYNONYM_GROUPS) {
    if (group.some((w) => lower.includes(w))) extras.push(...group)
  }
  const words = question.split(/\s+/).filter((w) => w.length > 3)
  return [...new Set([...words, ...extras])].join(' | ')
}

const FINANCE_KEYWORDS = ['budget', 'épargne', 'epargne', 'argent', 'income', 'expense', 'saving', 'invest', 'compound', 'interest', 'inflation', 'emergency fund', '50/30/20', 'salary', 'salaire', 'dépenses', 'depenses', 'revenus', 'money', 'financial', 'financier']
const LEGAL_KEYWORDS = ['loi', 'law', 'article', 'décret', 'decret', 'arrêté', 'arrete', 'règlement', 'reglement', 'tribunal', 'contrat', 'bail', 'licenciement', 'impôt', 'taxe', 'douane', 'permis', 'autorisation', 'juridique', 'legal', 'code', 'ordonnance']

function detectIntent(question) {
  const q = question.toLowerCase()
  const isFinance = FINANCE_KEYWORDS.some((k) => q.includes(k))
  const isLegal = LEGAL_KEYWORDS.some((k) => q.includes(k))
  if (isFinance && !isLegal) return 'finance'
  if (isLegal && !isFinance) return 'legal'
  if (isFinance && isLegal) return 'mixed'
  return 'general'
}

async function retrieveLawContext(question) {
  const intent = detectIntent(question)
  if (intent === 'finance') return []

  try {
    const direct = await sql`
      SELECT law_ref, law_title, article_ref, content, page,
             ts_rank(content_tsv, websearch_to_tsquery('french', ${question})) AS rank
      FROM law_chunks
      WHERE content_tsv @@ websearch_to_tsquery('french', ${question})
      ORDER BY rank DESC
      LIMIT 6`
    const relevant = direct.filter((r) => Number(r.rank) >= 0.02)
    if (relevant.length >= 2) return relevant
    if (direct.length >= 3 && Number(direct[0].rank) >= 0.05) return direct

    const expanded = expandQuery(question)
    const expandedRows = await sql`
      SELECT law_ref, law_title, article_ref, content, page,
             ts_rank(content_tsv, websearch_to_tsquery('french', ${expanded})) AS rank
      FROM law_chunks
      WHERE content_tsv @@ websearch_to_tsquery('french', ${expanded})
      ORDER BY rank DESC
      LIMIT 6`
    const relevantExp = expandedRows.filter((r) => Number(r.rank) >= 0.02)
    if (relevantExp.length > 0) return relevantExp

    return []
  } catch (err) {
    console.error('Law retrieval failed:', err.message)
    return []
  }
}

function buildLawBlock(rows) {
  if (!rows.length) return 'No specific law excerpts are available in the database for this question.'
  return rows
    .map((r, i) => {
      const ref = [r.law_ref, r.article_ref].filter(Boolean).join(', ')
      const snippet = r.content.replace(/\s+/g, ' ').slice(0, 900)
      return `[${i + 1}] ${ref}${r.page ? ` (page ${r.page})` : ''}:\n${snippet}`
    })
    .join('\n\n')
}

function buildSystemPrompt(lawBlock, hasLaws) {
  const lawSection = hasLaws
    ? `Official law excerpts relevant to this question (cite them when used):
${lawBlock}`
    : `No specific law excerpts matched this question — answer from general knowledge. Leave sources empty.`

  return `You are MonCheck — Benin's trusted guide for BOTH everyday law AND personal finance.

You help with:
- Benin laws, taxes, regulations, contracts, rights, permits
- Money: budgeting, saving, emergency funds, compound interest, inflation, investing basics, compound growth

${lawSection}

Rules:
- Explain in simple, everyday language a person without training can understand. Short sentences. Define any legal or financial term the first time you use it (e.g. "TVA means..."). Always give one concrete example relevant to Benin (market seller, taxi driver, student, small shop).
- Be neutral and educational. Never tell the user to buy, invest, sign, or take a specific legal/financial action.
- For LAW questions: when you use an excerpt, cite it inline as (Loi N° X-Y, Article Z). List used excerpts in "sources". If no excerpt was relevant, sources must be empty — do not invent citations.
- For MONEY questions: teach the concept clearly (use the user's numbers if they gave income/expenses/goals). Explain with a short example. No law citations needed.
- Always connect the two halves in "money_link": for a LAW answer, explain in 1-2 sentences what it means for the wallet/budget/savings/business costs in CFA (or say there is no direct money impact). For a MONEY answer, name the one law or official rule to double-check if relevant (or say none).
- Never invent laws, article numbers, deadlines, or amounts.
- LANGUAGE: Answer in the same language as the user's message. If the message is in Yoruba, answer in Yoruba. If the message is in Fon, answer in French (Fon is for UI only, not for AI answers). If it is in English answer in English, otherwise default to French.
- /no_think

Respond with ONLY a JSON object, no markdown fences, no reasoning text before or after, matching exactly:
{
  "simple_terms": "Thorough explanation in plain language - 4 to 6 sentences. Cover what it is, how it works, and a concrete example relevant to Benin. Be detailed and educational.",
  "why_it_matters": "Detailed practical impact - 3 to 4 sentences. Explain who is affected, what changes for them, risks of ignoring it, and opportunities if they act. Be specific to Benin context.",
  "money_link": "1-2 sentences linking this topic to the user's money in CFA, or the law to check for a money question. Plain language.",
  "checks": ["4 to 6 specific, actionable things to verify or next steps - each 1 sentence, concrete and practical"],
  "sources": [{"law_ref": "...", "article_ref": "...", "detail": "short label of what was cited"}],
  "disclaimer": "MonCheck provides educational information, not legal or financial advice. Verify important decisions with a qualified professional or official authority."
}

Aim for thoroughness - the user explicitly wants longer, detailed answers. Do not be brief.`
}

function stripFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function extractBalancedJson(text) {
  const cleaned = stripFences(text)
  const start = cleaned.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
    } else {
      if (ch === '"') inString = true
      else if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) return cleaned.slice(start, i + 1)
      }
    }
  }
  // Truncated — return from start to end for repair attempt
  return cleaned.slice(start)
}

function repairJson(str) {
  let s = str.trim()
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1')
  // Close unclosed strings (rare): if odd quotes, append
  // Auto-close missing braces/brackets
  let openBraces = 0
  let openBrackets = 0
  let inStr = false
  let esc = false
  for (const ch of s) {
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
    } else {
      if (ch === '"') inStr = true
      else if (ch === '{') openBraces++
      else if (ch === '}') openBraces--
      else if (ch === '[') openBrackets++
      else if (ch === ']') openBrackets--
    }
  }
  if (inStr) s += '"'
  while (openBrackets > 0) { s += ']'; openBrackets-- }
  while (openBraces > 0) { s += '}'; openBraces-- }
  // Fix unterminated last string value: ensure last quote closed already handled
  return s
}

function fallbackExtract(text) {
  const getField = (name) => {
    const re = new RegExp(`"${name}"\\s*:\\s*"((?:\\\\"|[^"])*)"`, 's')
    const m = text.match(re)
    if (m) return m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n')
    // Try single-quoted or unquoted extraction as last resort
    const re2 = new RegExp(`${name}\\s*:\\s*"([^"]+)"`, 'i')
    const m2 = text.match(re2)
    return m2 ? m2[1] : null
  }
  const checksRe = /"checks"\s*:\s*\[([\s\S]*?)\]/
  const checksMatch = text.match(checksRe)
  let checks = []
  if (checksMatch) {
    const inner = checksMatch[1]
    const items = [...inner.matchAll(/"((?:\\"|[^"])*)"/g)].map((m) => m[1].replace(/\\"/g, '"'))
    if (items.length) checks = items
  }
  const simple = getField('simple_terms')
  const why = getField('why_it_matters')
  if (!simple && !why) return null
  return {
    simple_terms: simple || text.slice(0, 500).replace(/^\W+/, '').trim(),
    why_it_matters: why || '',
    money_link: getField('money_link') || '',
    checks: checks.length ? checks : ['Vérifiez la date limite', 'Vérifiez le montant ou la condition', 'Vérifiez l\'autorité émettrice'],
    sources: [],
    disclaimer: 'MonCheck provides educational information, not legal or financial advice. Verify important decisions with a qualified professional or official authority.',
  }
}

function parseModelJson(text) {
  const raw = text.trim()
  if (!raw) throw new Error('Empty model response')
  const candidate = extractBalancedJson(raw)
  if (!candidate) throw new Error('No JSON object in model response')
  const attempts = []
  attempts.push(candidate)
  attempts.push(repairJson(candidate))
  // Also try full cleaned text slice
  const cleaned = stripFences(raw)
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    const slice = cleaned.slice(start, end + 1)
    if (!attempts.includes(slice)) attempts.push(slice)
    const repairedSlice = repairJson(slice)
    if (!attempts.includes(repairedSlice)) attempts.push(repairedSlice)
  }
  let lastErr = null
  for (const attempt of attempts) {
    try {
      const normalized = attempt.replace(/,\s*([}\]])/g, '$1')
      return JSON.parse(normalized)
    } catch (e) {
      lastErr = e
    }
  }
  // Regex fallback — salvage what we can
  const salvaged = fallbackExtract(raw)
  if (salvaged) return salvaged
  throw new Error(`JSON parse failed: ${lastErr?.message || 'unknown'} | preview: ${raw.slice(0, 250).replace(/\n/g, ' ')}`)
}

async function callNousOnce(message, systemPrompt, model) {
  const res = await fetch(`${NOUS_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NOUS_API_KEY}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.3,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`Nous API error ${res.status}: ${body.slice(0, 300)}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  const text = (typeof content === 'string' ? content : JSON.stringify(content ?? '')).trim()
  if (!text) throw new Error('Empty response from AI provider')
  return text
}

async function callGeminiOnce(message, systemPrompt, apiKey, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  // Key goes in a header, not the query string — keys in URLs leak into
  // upstream logs, proxies, and error pipelines.
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1800,
        responseMimeType: 'application/json',
      },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  const content = parts.map((p) => p.text || '').join('').trim()
  if (!content) throw new Error('Empty response from AI provider')
  return content
}

// Primary: Nous free models. Fallback: Gemini key pool. Throws if neither is
// configured or all attempts fail; callers degrade to FALLBACK_EXPLANATION.
async function callAi(message, systemPrompt) {
  let lastErr = null
  if (NOUS_API_KEY) {
    for (const model of NOUS_MODELS) {
      try {
        return await callNousOnce(message, systemPrompt, model)
      } catch (err) {
        lastErr = err
        // 401/402 = key or payment problem: retrying other models won't help,
        // drop straight to the Gemini fallback.
        if (err.status === 401 || err.status === 402) {
          console.error(`Nous ${model} auth/payment failed (${err.status}), trying fallback provider`)
          break
        }
        // Free-tier bursts: one retry after a short pause before moving on.
        if (err.status === 429) {
          await new Promise((r) => setTimeout(r, 2500))
          try {
            return await callNousOnce(message, systemPrompt, model)
          } catch (retryErr) {
            lastErr = retryErr
            if (retryErr.status === 401 || retryErr.status === 402) {
              console.error(`Nous ${model} auth/payment failed on retry (${retryErr.status}), trying fallback provider`)
              break
            }
            console.error(`Nous ${model} retry failed (${retryErr.status || '?'}), trying next model`)
            continue
          }
        }
        console.error(`Nous ${model} failed (${err.status || '?'}), trying next model`)
      }
    }
  }
  if (GOOGLE_API_KEYS.length) {
    for (const model of GEMINI_MODELS) {
      const keys = pickKeys()
      let modelDead = false
      for (const key of keys) {
        try {
          return await callGeminiOnce(message, systemPrompt, key, model)
        } catch (err) {
          lastErr = err
          // 404 = model retired/unknown → stop burning keys, try next model.
          if (err.status === 404) {
            console.error(`Gemini model ${model} unavailable, trying next model`)
            modelDead = true
            break
          }
          // Quota / rate-limit / server errors: cool this key down, try next key.
          if (err.status === 429 || (err.status >= 500 && err.status <= 599)) {
            keyCooldownUntil.set(key, Date.now() + KEY_COOLDOWN_MS)
          }
          console.error(`Gemini ${model} key ...${key.slice(-6)} failed (${err.status || '?'}), trying next key`)
        }
      }
      if (modelDead) continue
      // Keys exhausted for this model but model may be fine (e.g. all cooling
      // down) — still try the next model rather than failing outright.
    }
  }
  throw lastErr || new Error('No AI provider configured (NOUS_API_KEY or GOOGLE_API_KEYS)')
}

const FALLBACK_EXPLANATION = {
  simple_terms:
    'The AI assistant is not available right now. As a general guide: read the document for a deadline, an amount, and an action required. Those three details usually decide what you need to do.',
  why_it_matters:
    'Missing a deadline or ignoring a request from a government office can lead to penalties.',
  money_link:
    'No specific money impact can be confirmed while the AI is offline. Check the amount on the document against your budget before paying anything.',
  checks: ['The deadline date', 'The amount requested, if any', 'Which office sent the document'],
  sources: [],
  disclaimer:
    'MonCheck provides educational information, not legal or financial advice. Verify important decisions with a qualified professional or official authority.',
}

const app = new Hono().basePath('/api')

// Booleans only — no deployment ids, model lists, or key counts on a
// public endpoint.
app.get('/health', (c) => c.json({ ok: true, db: !!process.env.DATABASE_URL, clerk: !!process.env.CLERK_SECRET_KEY }))

app.get('/alerts', async (c) => {
  const typeFilter = c.req.query('type')
  let rows
  if (typeFilter === 'law' || typeFilter === 'news') {
    rows = await sql`
      SELECT id, title, summary, content, category, severity, type, enforcement_note, source_name,
             source_url, published_date, effective_date, verification_status, last_verified
      FROM regulations
      WHERE verification_status = 'verified' AND type = ${typeFilter}
      ORDER BY published_date DESC`
  } else {
    rows = await sql`
      SELECT id, title, summary, content, category, severity, type, enforcement_note, source_name,
             source_url, published_date, effective_date, verification_status, last_verified
      FROM regulations
      WHERE verification_status = 'verified'
      ORDER BY published_date DESC`
  }
  const sanitized = rows.map((r) => ({
    ...r,
    summary: generateCleanSummary(r.summary || r.content, r.title),
    content: cleanAndFormatArticle(r.content || r.summary, r.title),
  }))
  return c.json(sanitized)
})

app.get('/reminders', async (c) => {
  const rows = await sql`
    SELECT id, title, summary, category, severity, enforcement_note, source_name, effective_date
    FROM regulations
    WHERE verification_status = 'verified'
      AND type = 'law'
      AND severity = 'critical'
      AND enforcement_note IS NOT NULL
    ORDER BY published_date DESC`
  return c.json(rows)
})

app.get('/financial-profile', async (c) => {
  const userId = await currentUserId(c)
  const rows = await sql`
    SELECT monthly_income, monthly_expenses, savings, currency, updated_at
    FROM financial_profiles
    WHERE user_id = ${userId}`
  if (!rows.length) return c.json({ error: 'No financial profile found' }, 404)
  return c.json(rows[0])
})

app.patch('/financial-profile', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const income = Number(body.monthly_income)
  const expenses = Number(body.monthly_expenses)
  const savings = Number(body.savings)
  const MAX_AMOUNT = 999_999_999
  if (!Number.isFinite(income) || !Number.isFinite(expenses) || !Number.isFinite(savings) ||
      income < 0 || expenses < 0 || savings < 0 ||
      income > MAX_AMOUNT || expenses > MAX_AMOUNT || savings > MAX_AMOUNT) {
    return c.json({ error: 'Invalid values' }, 400)
  }
  const userId = await currentUserId(c)
  const rows = await sql`
    UPDATE financial_profiles
    SET monthly_income = ${Math.round(income)}, monthly_expenses = ${Math.round(expenses)}, savings = ${Math.round(savings)}, updated_at = now()
    WHERE user_id = ${userId}
    RETURNING monthly_income, monthly_expenses, savings, currency, updated_at`
  if (!rows.length) return c.json({ error: 'Profile not found' }, 404)
  return c.json(rows[0])
})

app.get('/goals', async (c) => {
  const userId = await currentUserId(c)
  const rows = await sql`
    SELECT id, name, category, target_amount, current_amount, emoji, deadline
    FROM goals
    WHERE user_id = ${userId}
    ORDER BY created_at DESC`
  return c.json(rows)
})

app.post('/goals', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0, 120)
  const targetAmount = Number(body.target_amount)
  const emoji = body.emoji ? String(body.emoji).slice(0, 16) : null
  if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0 || targetAmount > 999_999_999) {
    return c.json({ error: 'Name and valid target_amount required' }, 400)
  }
  const userId = await currentUserId(c)
  const rows = await sql`
    INSERT INTO goals (user_id, name, target_amount, emoji)
    VALUES (${userId}, ${name}, ${Math.round(targetAmount)}, ${emoji})
    RETURNING id, name, category, target_amount, current_amount, emoji`
  return c.json(rows[0])
})

app.patch('/goals', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const id = Number(body.id)
  const amount = Number(body.current_amount)
  if (!Number.isInteger(id) || !Number.isFinite(amount) || amount < 0 || amount > 999_999_999) {
    return c.json({ error: 'Invalid goal id or amount' }, 400)
  }
  const rows = await sql`
    UPDATE goals
    SET current_amount = ${Math.round(amount)}
    WHERE id = ${id} AND user_id = ${await currentUserId(c)}
    RETURNING id, name, category, target_amount, current_amount, emoji`
  if (!rows.length) return c.json({ error: 'Goal not found' }, 404)
  return c.json(rows[0])
})

app.post('/daily-log', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const income = Number(body.income) || 0
  const expenses = Number(body.expenses) || 0
  const savings = Number(body.savings) || 0
  const source = body.source === 'voice' ? 'voice' : 'manual'
  const userId = await currentUserId(c)
  const rows = await sql`
    INSERT INTO daily_logs (user_id, income, expenses, savings, source)
    VALUES (${userId}, ${Math.round(income)}, ${Math.round(expenses)}, ${Math.round(savings)}, ${source})
    ON CONFLICT (user_id, log_date) DO UPDATE SET
      income = daily_logs.income + EXCLUDED.income,
      expenses = daily_logs.expenses + EXCLUDED.expenses,
      savings = daily_logs.savings + EXCLUDED.savings,
      source = EXCLUDED.source
    RETURNING id, log_date, income, expenses, savings, source`
  return c.json(rows[0])
})

app.get('/daily-log', async (c) => {
  const userId = await currentUserId(c)
  const rows = await sql`
    SELECT id, log_date, income, expenses, savings, source
    FROM daily_logs
    WHERE user_id = ${userId} AND log_date = CURRENT_DATE`
  return c.json(rows[0] || null)
})

// ---- Financial check-in (MonCheck AI money coach) ----
const CHECKIN_TYPES = ['daily', 'weekly', 'monthly']
const CHECKIN_LANGS = ['en', 'fr', 'yo', 'fon']
const MAX_CHECKIN_AMOUNT = 999_999_999
const PERIOD_WORD = { daily: { en: 'day', fr: 'journée' }, weekly: { en: 'week', fr: 'semaine' }, monthly: { en: 'month', fr: 'mois' } }
const LANG_INSTRUCTION = {
  en: 'Answer in very simple English.',
  fr: 'Réponds en français très simple, comme on parle tous les jours.',
  yo: 'Answer in simple everyday spoken Yoruba (Yorùbá) — the way people talk at home, not school Yoruba.',
  fon: 'Answer in simple everyday spoken Fon (Fongbe) as spoken in Benin — like a friend talking at the market.',
}

// Deterministic next-period plan: needs first, then debt, then a wants cap
// (30% of what's left), then savings — capped by the user's goal percentage.
// Numbers stay server-side so they're reliable even when the AI is offline.
function buildCheckinPlan({ income, needs, debt, wants, goalPct }) {
  const available = income - needs - debt
  const wantsCap = available > 0 ? Math.min(wants, Math.floor(available * 0.3)) : 0
  const save = available > 0 ? Math.max(0, Math.min(Math.floor((income * goalPct) / 100), available - wantsCap)) : 0
  return { needs, debt, wants: wantsCap, save }
}

function fmtAmount(n, currency) {
  return `${Number(n).toLocaleString('fr-FR')} ${currency}`
}

function fallbackCheckinSays({ type, income, needs, wants, debt, feeling, goalPct, plan, currency }, balance, prev, lang) {
  const period = PERIOD_WORD[type]?.[lang === 'en' ? 'en' : 'fr'] || 'day'
  const periodFr = PERIOD_WORD[type]?.fr || 'jour'
  const spent = needs + wants + debt
  const debtPct = income > 0 ? Math.round((debt / income) * 100) : 0
  const says = []
  if (lang === 'en') {
    if (balance < 0) {
      says.push(`Okay, let's not sugarcoat it: you spent ${fmtAmount(-balance, currency)} more than you earned this ${period}. That's a hole, and holes get deeper if you ignore them.`)
    } else if (balance === 0) {
      says.push(`You ended this ${period} at exactly zero. Balanced is safe — but zero means the next surprise goes straight into debt.`)
    } else {
      says.push(`Good news first: you kept ${fmtAmount(balance, currency)} from this ${period}. That's money you controlled, not money that disappeared.`)
    }
    if (debt > 0 && debtPct >= 40) {
      says.push(`Debt and other costs are ${debtPct}% of your income. Pick one debt and attack it; spreading small payments everywhere feels busy but goes nowhere.`)
    }
    if (prev) {
      const prevBalance = prev.income - prev.needs - prev.wants - prev.debt
      if (balance > prevBalance) says.push(`Compared to your last check-in, this one is better. Keep whatever you did this ${period} going.`)
      else if (balance < prevBalance) says.push(`Compared to your last check-in, this one is worse. Look at where the extra went and close that door first.`)
      else says.push(`Compared to your last check-in, you're about the same. Consistent is okay, but your goal needs a push.`)
    }
    if (plan.save <= 0 && goalPct > 0) {
      says.push(`Heads up: even with zero fun money, your goal doesn't fit. I've lowered what you can save. Lower the goal or raise income, and do it on purpose.`)
    }
    return says
  }
  if (balance < 0) {
    says.push(`Disons les choses clairement : cette ${periodFr}, vous avez dépensé ${fmtAmount(-balance, currency)} de plus que ce que vous avez gagné. C'est un trou, et un trou se creuse si on l'ignore.`)
  } else if (balance === 0) {
    says.push(`Vous terminez cette ${periodFr} à exactement zéro. C'est sûr — mais zéro veut dire que la prochaine surprise ira droit dans la dette.`)
  } else {
    says.push(`Bonne nouvelle d'abord : il vous reste ${fmtAmount(balance, currency)} de cette ${periodFr}. C'est de l'argent que vous avez contrôlé, pas de l'argent disparu.`)
  }
  if (debt > 0 && debtPct >= 40) {
    says.push(`Les dettes et autres charges représentent ${debtPct}% de votre revenu. Choisissez UNE dette et attaquez-la ; payer un peu partout donne l'impression d'agir mais ne fait avancer à rien.`)
  }
  if (prev) {
    const prevBalance = prev.income - prev.needs - prev.wants - prev.debt
    if (balance > prevBalance) says.push(`Comparé à votre dernier bilan, celui-ci est meilleur. Gardez ce que vous avez bien fait cette ${periodFr}.`)
    else if (balance < prevBalance) says.push(`Comparé à votre dernier bilan, celui-ci est moins bon. Regardez où est passé l'écart et fermez cette porte d'abord.`)
    else says.push(`Comparé à votre dernier bilan, vous êtes à peu près pareil. C'est régulier — mais votre objectif a besoin d'un coup de pouce.`)
  }
  if (plan.save <= 0 && goalPct > 0) {
    says.push(`Attention : même sans argent de plaisir, votre objectif ne rentre pas. J'ai baissé ce que vous pouvez mettre de côté. Baissez l'objectif ou augmentez les revenus — et décidez-le volontairement.`)
  }
  return says
}

function buildCheckinPrompt(d, prev, lang) {
  const period = PERIOD_WORD[d.type]?.en || 'day'
  return `You are MonCheck AI, a warm and encouraging money coach for ordinary people in Benin. The user just finished a ${d.type} money check-in.
Numbers: income ${d.income} ${d.currency}; needs ${d.needs}; wants ${d.wants}; debt/other ${d.debt}; how spending felt: "${d.feeling}"; savings goal: ${d.goalPct}% of income.
${d.regret ? `A purchase they regret: "${d.regret}". Mention it kindly in one line.` : ''}
${prev ? `Previous check-in: income ${prev.income}, needs ${prev.needs}, wants ${prev.wants}, debt ${prev.debt}. Compare briefly and kindly.` : 'This is their first check-in — welcome them.'}
The realistic plan already computed for the next ${period}: needs ${d.plan.needs}, debt ${d.plan.debt}, wants cap ${d.plan.wants}, save ${d.plan.save}. Do not change these numbers.
${LANG_INSTRUCTION[lang] || LANG_INSTRUCTION.fr}
Write "says": 3 to 5 VERY short paragraphs (1-2 sentences each), spoken like a warm friend from the neighborhood who wants this person to win:
1) Start with something they did RIGHT, even something small — always encourage first.
2) Then tell the truth gently: if they spent more than they earned, say it simply and remind them that small changes fix big holes.
3) If debt/other is big: pick ONE debt, pay it a little every ${period}, and forget the others for now — that is how people get out.
4) If there is a previous check-in, compare in one friendly line. If the savings goal does not fit, say you lowered it for now, and that they can grow it by raising income or lowering spending — one small step at a time.
5) End with strong encouragement: one small thing to do next, and belief in them.
VERY basic words — like talking to a friend at the market. No banking words. No shame. Short sentences. Amounts in ${d.currency}.
- /no_think
Respond with ONLY a JSON object, no markdown fences, matching exactly:
{"says": ["paragraph 1", "paragraph 2", "paragraph 3"]}`
}

app.post('/checkins', async (c) => {
  if (!rateLimitOk(c, 'checkin', 10)) {
    return c.json({ error: 'Trop de requêtes. Réessayez dans une minute.' }, 429)
  }
  const body = await c.req.json().catch(() => ({}))
  const type = CHECKIN_TYPES.includes(body.type) ? body.type : 'weekly'
  const currency = typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim().slice(0, 8) : 'FCFA'
  const num = (v) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 && n <= MAX_CHECKIN_AMOUNT ? Math.round(n) : null
  }
  const income = num(body.income)
  const needs = num(body.needs) ?? 0
  const wants = num(body.wants) ?? 0
  const debt = num(body.debt) ?? 0
  const goalPctRaw = num(body.savingsGoalPct)
  const goalPct = goalPctRaw === null ? 10 : Math.min(goalPctRaw, 90)
  const feeling = typeof body.feeling === 'string' && body.feeling.trim() ? body.feeling.trim().slice(0, 60) : null
  const regret = typeof body.regret === 'string' && body.regret.trim() ? body.regret.trim().slice(0, 200) : null
  const lang = CHECKIN_LANGS.includes(body.lang) ? body.lang : 'fr'
  if (income === null || income <= 0) return c.json({ error: 'Money that came in is required' }, 400)
  if (needs === null || wants === null || debt === null) return c.json({ error: 'Invalid amounts' }, 400)

  const userId = await currentUserId(c)
  const prev = (await sql`
    SELECT income, needs, wants, debt, created_at
    FROM money_checkins
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 1`)[0] || null

  const plan = buildCheckinPlan({ income, needs, debt, wants, goalPct })
  const balance = income - needs - wants - debt

  let says
  try {
    const prompt = buildCheckinPrompt({ type, currency, income, needs, wants, debt, feeling, goalPct, regret, plan }, prev, lang)
    const raw = await callAi(prompt, `You are MonCheck AI. ${LANG_INSTRUCTION[lang] || LANG_INSTRUCTION.fr} Be warm, encouraging and honest — like a friend who wants this person to win. Very basic everyday words. /no_think\nRespond with ONLY a JSON object, no markdown fences, matching exactly:\n{"says": ["paragraph 1", "paragraph 2", "paragraph 3"]}`)
    const parsed = parseModelJson(raw)
    // Models vary: says may arrive as an array, a single string, or under
    // another key. Accept anything usable — 1+ non-empty paragraphs.
    let rawSays = parsed.says ?? parsed.paragraphs ?? parsed.messages ?? parsed.advice ?? parsed.text
    if (typeof rawSays === 'string') {
      rawSays = rawSays.split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean)
    }
    // Small free-tier models sometimes loop on low-resource languages — cap
    // each paragraph, and drop near-duplicates so one runaway answer can't
    // flood the UI with the same line five times.
    const capParagraph = (s) => {
      const clean = String(s).trim()
      if (clean.length <= 420) return clean
      const cut = clean.slice(0, 420)
      const end = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'))
      return (end > 200 ? cut.slice(0, end + 1) : cut) + '…'
    }
    const seenKeys = new Set()
    const dedupe = (p) => {
      const key = p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 60)
      if (seenKeys.has(key)) return false
      seenKeys.add(key)
      return true
    }
    says = Array.isArray(rawSays) ? rawSays.map((s) => capParagraph(s)).filter(Boolean).filter(dedupe).slice(0, 5) : null
    if (says && says.join('').length > 1600) {
      const kept = []
      let total = 0
      for (const p of says) { if (total + p.length > 1600) break; kept.push(p); total += p.length }
      says = kept.length ? kept : null
    }
    if (!says || says.length === 0) says = null
    if (!says) throw new Error('Empty says')
  } catch (err) {
    console.error('Check-in AI failed, using fallback:', err.message)
    says = fallbackCheckinSays({ type, income, needs, wants, debt, feeling, goalPct, plan, currency }, balance, prev, lang)
  }

  const outcome = balance < 0
    ? (lang === 'en' ? `over by ${fmtAmount(-balance, currency)}` : `dépassé de ${fmtAmount(-balance, currency)}`)
    : balance === 0
      ? (lang === 'en' ? 'balanced' : 'équilibre parfait')
      : (lang === 'en' ? `saved ${fmtAmount(balance, currency)}` : `économisé ${fmtAmount(balance, currency)}`)

  const rows = await sql`
    INSERT INTO money_checkins (user_id, type, currency, income, needs, wants, debt, feeling, savings_goal_pct, regret, says, plan, outcome)
    VALUES (${userId}, ${type}, ${currency}, ${income}, ${needs}, ${wants}, ${debt}, ${feeling}, ${goalPct}, ${regret},
            ${JSON.stringify(says)}::jsonb, ${JSON.stringify(plan)}::jsonb, ${outcome})
    RETURNING id, created_at`
  return c.json({ id: rows[0].id, says, plan, outcome, balance })
})

app.get('/checkins', async (c) => {
  const userId = await currentUserId(c)
  const rows = await sql`
    SELECT id, type, currency, income, needs, wants, debt, outcome, created_at
    FROM money_checkins
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 12`
  return c.json(rows)
})

app.get('/preferences', async (c) => {
  const rows = await sql`
    SELECT topics, notification_prefs, language
    FROM user_preferences
    WHERE user_id = ${await currentUserId(c)}`
  if (!rows.length) return c.json({ topics: [], notification_prefs: {}, language: null })
  return c.json(rows[0])
})

app.patch('/preferences', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const topics = Array.isArray(body.topics)
    ? body.topics.filter((t) => typeof t === 'string').map((t) => t.slice(0, 60)).slice(0, 20)
    : null
  const language = typeof body.language === 'string' && body.language.trim()
    ? body.language.trim().slice(0, 10)
    : null
  if (!topics && !language) {
    return c.json({ error: 'topics (array) or language (string) is required' }, 400)
  }
  const userId = await currentUserId(c)
  if (topics) {
    await sql`UPDATE user_preferences SET topics = ${topics} WHERE user_id = ${userId}`
  }
  if (language) {
    await sql`UPDATE user_preferences SET language = ${language} WHERE user_id = ${userId}`
  }
  const rows = await sql`
    SELECT topics, language
    FROM user_preferences
    WHERE user_id = ${userId}`
  if (!rows.length) return c.json({ error: 'Preferences not found' }, 404)
  return c.json(rows[0])
})

app.get('/laws/status', async (c) => {
  const rows = await sql`
    SELECT file_name, law_title, law_ref, pages, chunk_count, ocr_pages, status, ingested_at
    FROM documents
    ORDER BY file_name`
  return c.json(rows)
})

app.post('/explain', async (c) => {
  if (!rateLimitOk(c, 'explain', 10)) {
    return c.json({ error: 'Trop de requêtes. Réessayez dans une minute.' }, 429)
  }
  const body = await c.req.json().catch(() => ({}))
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return c.json({ error: 'message is required' }, 400)

  let explanation
  let usedFallback = false
  let providerError = null

  if (!NOUS_API_KEY && !GOOGLE_API_KEYS.length) {
    explanation = FALLBACK_EXPLANATION
    usedFallback = true
  } else {
    try {
      const lawRows = await retrieveLawContext(message)
      const hasLaws = lawRows.length > 0
      const raw = await callAi(message, buildSystemPrompt(buildLawBlock(lawRows), hasLaws))
      let parsed
      try {
        parsed = parseModelJson(raw)
      } catch (parseErr) {
        console.error('JSON parse failed, raw preview:', raw.slice(0, 600), 'err:', parseErr.message)
        // Try to salvage raw text into a graceful response instead of 502
        const salvaged = fallbackExtract(raw)
        if (salvaged) {
          parsed = salvaged
          console.warn('Salvaged response via fallbackExtract')
        } else {
          // Last resort: use raw as simple_terms
          parsed = {
            simple_terms: raw.slice(0, 1200).replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim() || 'Le service a répondu mais le format était inattendu. Voici le texte brut : ' + raw.slice(0, 800),
            why_it_matters: 'Vérifiez les informations avec la source officielle.',
            money_link: '',
            checks: ['Vérifiez la source citée', 'Vérifiez la date d’effet', 'Consultez l’autorité compétente si nécessaire'],
            sources: [],
            disclaimer: 'MonCheck provides educational information, not legal or financial advice. Verify important decisions with a qualified professional or official authority.',
          }
        }
      }
      explanation = {
        simple_terms: String(parsed.simple_terms ?? '').slice(0, 3000) || 'Explication indisponible — réessayez.',
        why_it_matters: String(parsed.why_it_matters ?? '').slice(0, 2000),
        money_link: String(parsed.money_link ?? '').slice(0, 1000),
        checks: Array.isArray(parsed.checks) ? parsed.checks.map(String).slice(0, 8) : [],
        sources: Array.isArray(parsed.sources) ? parsed.sources.slice(0, 10) : [],
        disclaimer:
          String(
            parsed.disclaimer ??
              'MonCheck provides educational information, not legal or financial advice. Verify important decisions with a qualified professional or official authority.'
          ),
      }
      if (!explanation.simple_terms || explanation.simple_terms.length < 10) {
        throw new Error('Model returned empty explanation')
      }
    } catch (err) {
      console.error('AI call failed, using fallback:', err.message)
      // Surfaced in the response only when explicitly enabled (truncated, no
      // secrets) so intermittent provider failures can be diagnosed from the
      // client side. Off by default: upstream bodies can contain account
      // identifiers and shouldn't ship to end users.
      providerError = String(err?.message || err).slice(0, 200)
      const diagSuffix = EXPOSE_PROVIDER_ERRORS && providerError ? ` [Diagnostic : ${providerError}]` : ''
      // If AI providers fail (e.g. free tier restriction, quota, network), return a
      // useful fallback instead of 502 so the chat still works in production.
      explanation = {
        ...FALLBACK_EXPLANATION,
        simple_terms: FALLBACK_EXPLANATION.simple_terms + ' (Mode hors-ligne – le service IA est temporairement indisponible.)' + diagSuffix,
      }
      usedFallback = true
    }
  }

  // Awaited (not fire-and-forget): the serverless function can freeze right
  // after the response returns, dropping un-awaited promise work.
  await sql`
    INSERT INTO ai_conversations (user_id, message, response)
    VALUES (${await currentUserId(c)}, ${message}, ${JSON.stringify({ ...explanation, usedFallback })})`.catch(
    (err) => console.error('Conversation log failed:', err.message)
  )

  return c.json({ ...explanation, stub: usedFallback, providerError: EXPOSE_PROVIDER_ERRORS ? providerError : undefined })
})

// ---- Live News cron ----
// Scraped rows are stored as 'unverified': content from an external page must
// never reach users as official law/finance guidance without a human flipping
// the flag (see scripts/approve-regulations.mjs). /api/alerts and
// /api/reminders only surface 'verified' rows.

const MAX_FETCH_BYTES = 2 * 1024 * 1024

// Reads at most MAX_FETCH_BYTES before aborting — a gzip-bomb or multi-GB
// response from a source must not exhaust the serverless function memory.
async function fetchCappedText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'MonCheckBot/1.0' }, signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const declared = Number(res.headers.get('content-length') || 0)
  if (declared > MAX_FETCH_BYTES) throw new Error('Response too large')
  const reader = res.body?.getReader()
  if (!reader) return ''
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_FETCH_BYTES) {
      reader.cancel().catch(() => {})
      throw new Error('Response too large')
    }
    chunks.push(value)
  }
  const buf = new Uint8Array(size)
  let off = 0
  for (const chunk of chunks) { buf.set(chunk, off); off += chunk.length }
  return new TextDecoder('utf-8').decode(buf)
}

// Only follow links that stay on the source's own origin — a compromised or
// malicious source page must not turn the scraper into an SSRF fetcher or
// smuggle links from unrelated hosts into the alerts feed.
function sameOriginHref(href, baseUrl) {
  try {
    const u = new URL(href, baseUrl)
    const base = new URL(baseUrl)
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.origin !== base.origin) return null
    return u.href
  } catch {
    return null
  }
}

async function fetchAndIngestNews() {
  const sources = await sql`SELECT id, source_name, url, category FROM news_sources WHERE is_active = true`
  let inserted = 0
  for (const src of sources) {
    try {
      const html = await fetchCappedText(src.url)
      const $ = cheerio.load(html)
      $('style, script, nav, header, footer, aside, .cookie, .cookie-banner, .popup, .modal, .ads').remove()

      const candidates = []
      $('article a, .post-title a, .news-title a, .entry-title a, h2 a, h3 a, h1 a').each((_, el) => {
        const title = $(el).text().trim().replace(/\s+/g, ' ')
        const href = sameOriginHref($(el).attr('href'), src.url)
        if (!href) return
        if (title.length > 20 && title.length < 200 && candidates.length < 6) candidates.push({ title, href })
      })

      if (candidates.length < 2) {
        $('h1, h2, h3').each((_, el) => {
          const title = $(el).text().trim().replace(/\s+/g, ' ')
          if (title.length > 20 && title.length < 200 && candidates.length < 3) candidates.push({ title, href: src.url })
        })
      }

      for (const { title, href } of candidates.slice(0, 2)) {
        const exists = await sql`SELECT id FROM regulations WHERE title = ${title} LIMIT 1`
        if (exists.length) continue

        let content = ''
        let summary = title
        let articleTitle = title

        try {
          const artHtml = await fetchCappedText(href)
          const structured = extractStructuredArticle(artHtml, title)
          articleTitle = structured.title || title
          summary = structured.summary || title
          content = structured.content || ''
        } catch {}

        if (!content || content.length < 50) {
          content = cleanAndFormatArticle(summary, title)
        }

        // Severity stays 'info' — reclassification (e.g. critical law) is part
        // of the human approval step.
        const lawKeywords = /loi|décret|arrêté|article|code|règlement|taxe|impôt|douane|permis|autorisation/i
        const type = lawKeywords.test(articleTitle) || lawKeywords.test(summary) ? 'law' : 'news'
        await sql`
          INSERT INTO regulations (title, summary, content, category, severity, type, source_name, source_url, published_date, verification_status)
          VALUES (${articleTitle}, ${summary}, ${content}, ${src.category}, 'info', ${type}, ${src.source_name}, ${href}, CURRENT_DATE, 'unverified')`
        inserted++
      }
      await sql`UPDATE news_sources SET last_fetched = now() WHERE id = ${src.id}`
    } catch (e) {
      console.error(`Fetch ${src.source_name} failed:`, e.message)
    }
  }
  return inserted
}

// Cron trigger guard. Vercel injects `Authorization: Bearer $CRON_SECRET` when
// that env var is configured and tags its own scheduled invocations with the
// `x-vercel-cron` header. With a secret set, only that Bearer token passes.
// Without one, only Vercel's own cron calls (or local dev) may trigger the job.
function cronAuthorized(c) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    // Timing-safe: compare SHA-256 digests so lengths always match.
    const expected = createHash('sha256').update(`Bearer ${secret}`).digest()
    const provided = createHash('sha256').update(c.req.header('authorization') || '').digest()
    return timingSafeEqual(expected, provided)
  }
  if (c.req.header('x-vercel-cron')) return true
  return process.env.VERCEL_ENV !== 'production'
}

async function handleCronFetchNews(c) {
  if (!cronAuthorized(c)) return c.json({ error: 'Unauthorized' }, 401)
  const inserted = await fetchAndIngestNews()
  // Retention: AI conversation logs can contain OCR'd document text (IDs,
  // official letters) — drop anything older than 30 days.
  await sql`DELETE FROM ai_conversations WHERE created_at < now() - interval '30 days'`.catch((err) =>
    console.error('Conversation retention cleanup failed:', err.message)
  )
  return c.json({ inserted, at: new Date().toISOString() })
}

app.get('/cron/fetch-news', handleCronFetchNews)
app.post('/cron/fetch-news', handleCronFetchNews)

// ---- Document upload + OCR -> explain (same AI, with extracted text) ----
async function extractTextFromFile(file) {
  if (file.size && file.size > 10 * 1024 * 1024) throw new Error('File too large (max 10MB)')
  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.length > 10 * 1024 * 1024) throw new Error('File too large (max 10MB)')
  const type = file.type || ''
  const name = file.name || 'document'

  if (type.includes('pdf') || name.toLowerCase().endsWith('.pdf')) {
    try {
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const doc = await getDocument({ data: new Uint8Array(buf), useSystemFonts: true, isEvalSupported: false }).promise
      let full = ''
      const pages = Math.min(doc.numPages, 10)
      for (let i = 1; i <= pages; i++) {
        const page = await doc.getPage(i)
        const tc = await page.getTextContent()
        let t = ''
        for (const it of tc.items) { t += it.str + (it.hasEOL ? '\n' : '') }
        full += t + '\n'
      }
      if (full.trim().length > 30) return full.trim().slice(0, 8000)
    } catch {}
  }

  if (type.startsWith('image/') || name.match(/\.(png|jpg|jpeg|webp)$/i)) {
    // UUID name: two uploads in the same millisecond must not clobber each
    // other's temp file, and the name should not be guessable in a shared tmpdir.
    const tmp = path.join(os.tmpdir(), `moncheck-upload-${randomUUID()}${path.extname(name) || '.png'}`)
    writeFileSync(tmp, buf)
    try {
      const text = execFileSync('node', [path.join(process.cwd(), 'db', 'ocr-worker.js'), tmp], { timeout: 60000, encoding: 'utf8' })
      return text.trim().slice(0, 8000)
    } finally {
      try { unlinkSync(tmp) } catch {}
    }
  }

  const asText = buf.toString('utf8').trim()
  // Plain-ASCII heuristic without a control-char regex (lint: no-control-regex).
  const looksLikeText = [...asText.slice(0, 100)].every((ch) => {
    const code = ch.codePointAt(0)
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126)
  })
  if (asText.length > 20 && looksLikeText) return asText.slice(0, 8000)
  throw new Error('Could not extract text from this file type')
}

app.post('/explain/upload', async (c) => {
  if (!rateLimitOk(c, 'explain-upload', 5)) {
    return c.json({ error: 'Trop de requêtes. Réessayez dans une minute.' }, 429)
  }
  let file
  let extraMessage = ''
  try {
    const body = await c.req.parseBody()
    file = body['file']
    extraMessage = typeof body['message'] === 'string' ? body['message'].trim() : ''
    if (!file || typeof file === 'string') return c.json({ error: 'file is required (field name: file)' }, 400)
  } catch {
    return c.json({ error: 'Invalid multipart body' }, 400)
  }

  let extracted
  try {
    extracted = await extractTextFromFile(file)
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
  if (!extracted || extracted.length < 10) return c.json({ error: 'No text found in document' }, 400)

  const combined = extraMessage ? `Document text:\n${extracted}\n\nUser question: ${extraMessage}` : extracted

  let explanation
  let providerError = null
  try {
    const lawRows = await retrieveLawContext(combined)
    const hasLaws = lawRows.length > 0
    const raw = await callAi(combined, buildSystemPrompt(buildLawBlock(lawRows), hasLaws))
    let parsed
    try {
      parsed = parseModelJson(raw)
    } catch {
      const salvaged = fallbackExtract(raw)
      if (salvaged) parsed = salvaged
      else parsed = {
        simple_terms: raw.slice(0, 1200).replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim() || 'Le document a été lu mais la réponse était mal formatée.',
        why_it_matters: 'Vérifiez les informations avec la source officielle.',
        money_link: '',
        checks: ['Vérifiez la date limite', 'Vérifiez le montant', 'Vérifiez l’autorité émettrice'],
        sources: [],
        disclaimer: 'MonCheck provides educational information, not legal or financial advice. Verify important decisions with a qualified professional or official authority.',
      }
    }
    explanation = {
      simple_terms: String(parsed.simple_terms ?? '').slice(0, 3000),
      why_it_matters: String(parsed.why_it_matters ?? '').slice(0, 2000),
      money_link: String(parsed.money_link ?? '').slice(0, 1000),
      checks: Array.isArray(parsed.checks) ? parsed.checks.map(String).slice(0, 8) : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources.slice(0, 10) : [],
      disclaimer: String(parsed.disclaimer ?? 'MonCheck provides educational information, not legal or financial advice. Verify important decisions with a qualified professional or official authority.'),
    }
  } catch (err) {
    console.error('Upload AI call failed, using fallback:', err.message)
    providerError = String(err?.message || err).slice(0, 200)
    explanation = {
      ...FALLBACK_EXPLANATION,
      simple_terms: FALLBACK_EXPLANATION.simple_terms + ' (Mode hors-ligne – document lu mais IA indisponible.)',
    }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (obj) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)) } catch { closed = true }
      }
      // Sentence-level chunks with a tiny delay: keeps the progressive feel
      // while bounding total stream time far below the 60s serverless budget
      // (the old per-word 40ms pacing could exceed it on long answers and get
      // the function killed mid-stream).
      const sentenceChunks = (text) =>
        text
          .split(/(?<=[.!?])\s+/)
          .flatMap((s) => (s.length > 200 ? s.match(/.{1,200}(\s|$)/g) ?? [s] : [s]))
          .filter(Boolean)
      try {
        for (const sec of [{ key: 'simple_terms', text: explanation.simple_terms }, { key: 'why_it_matters', text: explanation.why_it_matters }]) {
          for (const chunk of sentenceChunks(sec.text)) {
            send({ token: chunk, section: sec.key })
            await new Promise((r) => setTimeout(r, 15))
          }
        }
        for (const check of explanation.checks) {
          send({ token: check, section: 'checks' })
          send({ token: '\n', section: 'checks' })
          await new Promise((r) => setTimeout(r, 15))
        }
        // Awaited before the closing frame: the function can freeze right
        // after the stream ends, dropping fire-and-forget writes.
        await sql`INSERT INTO ai_conversations (user_id, message, response) VALUES (${await currentUserId(c)}, ${combined.slice(0, 2000)}, ${JSON.stringify(explanation)})`.catch(() => {})
        send({ done: true, sources: explanation.sources, disclaimer: explanation.disclaimer, money_link: explanation.money_link || '', stub: false, providerError: EXPOSE_PROVIDER_ERRORS ? providerError : undefined })
        closed = true
        controller.close()
      } catch (err) {
        send({ error: err.message })
        try { if (!closed) { closed = true; controller.close() } } catch {}
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
})

app.onError((err, c) => {
  if (err?.status === 401) return c.json({ error: err.message }, 401)
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app