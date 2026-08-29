import 'dotenv/config'
import { Hono } from 'hono'
import { neon } from '@neondatabase/serverless'
import * as cheerio from 'cheerio'
import { writeFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'

const sql = neon(process.env.DATABASE_URL)

const ZEN_BASE_URL = 'https://opencode.ai/zen/v1'
const ZEN_MODEL = process.env.ZEN_MODEL || 'nemotron-3-ultra-free'

const DEMO_USER_ID = 1

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

  return `You are Knowly — Benin's trusted guide for BOTH everyday law AND personal finance.

You help with:
- Benin laws, taxes, regulations, contracts, rights, permits
- Money: budgeting, saving, emergency funds, compound interest, inflation, investing basics, compound growth

${lawSection}

Rules:
- Explain in simple, everyday language a person without training can understand.
- Be neutral and educational. Never tell the user to buy, invest, sign, or take a specific legal/financial action.
- For LAW questions: when you use an excerpt, cite it inline as (Loi N° X-Y, Article Z). List used excerpts in "sources". If no excerpt was relevant, sources must be empty — do not invent citations.
- For MONEY questions: teach the concept clearly (use the user's numbers if they gave income/expenses/goals). Explain with a short example. No law citations needed.
- Never invent laws, article numbers, deadlines, or amounts.
- LANGUAGE: Answer in the same language as the user's message. If the message is in Yoruba, answer in Yoruba. If the message is in Fon, answer in French (Fon is for UI only, not for AI answers). If it is in English answer in English, otherwise default to French.
- /no_think

Respond with ONLY a JSON object, no markdown fences, no reasoning text before or after, matching exactly:
{
  "simple_terms": "Thorough explanation in plain language - 4 to 6 sentences. Cover what it is, how it works, and a concrete example relevant to Benin. Be detailed and educational.",
  "why_it_matters": "Detailed practical impact - 3 to 4 sentences. Explain who is affected, what changes for them, risks of ignoring it, and opportunities if they act. Be specific to Benin context.",
  "checks": ["4 to 6 specific, actionable things to verify or next steps - each 1 sentence, concrete and practical"],
  "sources": [{"law_ref": "...", "article_ref": "...", "detail": "short label of what was cited"}],
  "disclaimer": "This is an explanation, not legal advice. Verify important decisions with an appropriate professional or official authority."
}

Aim for thoroughness - the user explicitly wants longer, detailed answers. Do not be brief.`
}

function parseModelJson(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object in model response')
  return JSON.parse(cleaned.slice(start, end + 1))
}

async function callZen(message, systemPrompt) {
  const res = await fetch(`${ZEN_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENCODE_API_KEY}`,
    },
    body: JSON.stringify({
      model: ZEN_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${message}\n\n/no_think` },
      ],
      temperature: 0.35,
      max_tokens: 1400,
      chat_template_kwargs: { thinking: false },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Zen API error ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

const FALLBACK_EXPLANATION = {
  simple_terms:
    'The AI assistant is not available right now. As a general guide: read the document for a deadline, an amount, and an action required. Those three details usually decide what you need to do.',
  why_it_matters:
    'Missing a deadline or ignoring a request from a government office can lead to penalties.',
  checks: ['The deadline date', 'The amount requested, if any', 'Which office sent the document'],
  sources: [],
  disclaimer:
    'This is an explanation, not legal advice. Verify important decisions with an appropriate professional or official authority.',
}

const app = new Hono().basePath('/api')

app.get('/health', (c) => c.json({ ok: true, db: !!process.env.DATABASE_URL, model: ZEN_MODEL }))

app.get('/alerts', async (c) => {
  const rows = await sql`
    SELECT id, title, summary, content, category, severity, source_name,
           source_url, published_date, effective_date, verification_status, last_verified
    FROM regulations
    WHERE verification_status = 'verified'
    ORDER BY published_date DESC`
  return c.json(rows)
})

app.get('/financial-profile', async (c) => {
  const rows = await sql`
    SELECT monthly_income, monthly_expenses, savings, currency, updated_at
    FROM financial_profiles
    WHERE user_id = ${DEMO_USER_ID}`
  if (!rows.length) return c.json({ error: 'No financial profile found' }, 404)
  return c.json(rows[0])
})

app.get('/goals', async (c) => {
  const rows = await sql`
    SELECT id, name, category, target_amount, current_amount, deadline
    FROM goals
    WHERE user_id = ${DEMO_USER_ID}
    ORDER BY created_at`
  return c.json(rows)
})

app.patch('/goals', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const id = Number(body.id)
  const amount = Number(body.current_amount)
  if (!Number.isInteger(id) || !Number.isFinite(amount) || amount < 0) {
    return c.json({ error: 'Invalid goal id or amount' }, 400)
  }
  const rows = await sql`
    UPDATE goals
    SET current_amount = ${Math.round(amount)}
    WHERE id = ${id} AND user_id = ${DEMO_USER_ID}
    RETURNING id, name, category, target_amount, current_amount`
  if (!rows.length) return c.json({ error: 'Goal not found' }, 404)
  return c.json(rows[0])
})

app.get('/preferences', async (c) => {
  const rows = await sql`
    SELECT topics, notification_prefs, language
    FROM user_preferences
    WHERE user_id = ${DEMO_USER_ID}`
  if (!rows.length) return c.json({ topics: [], notification_prefs: {}, language: null })
  return c.json(rows[0])
})

app.patch('/preferences', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const topics = Array.isArray(body.topics) ? body.topics.filter((t) => typeof t === 'string') : null
  const language = typeof body.language === 'string' && body.language.trim() ? body.language.trim() : null
  if (!topics && !language) {
    return c.json({ error: 'topics (array) or language (string) is required' }, 400)
  }
  if (topics) {
    await sql`UPDATE user_preferences SET topics = ${topics} WHERE user_id = ${DEMO_USER_ID}`
  }
  if (language) {
    await sql`UPDATE user_preferences SET language = ${language} WHERE user_id = ${DEMO_USER_ID}`
  }
  const rows = await sql`
    SELECT topics, language
    FROM user_preferences
    WHERE user_id = ${DEMO_USER_ID}`
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
  const body = await c.req.json().catch(() => ({}))
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return c.json({ error: 'message is required' }, 400)

  let explanation
  let usedFallback = false

  if (!process.env.OPENCODE_API_KEY) {
    explanation = FALLBACK_EXPLANATION
    usedFallback = true
  } else {
    try {
      const lawRows = await retrieveLawContext(message)
      const hasLaws = lawRows.length > 0
      const raw = await callZen(message, buildSystemPrompt(buildLawBlock(lawRows), hasLaws))
      const parsed = parseModelJson(raw)
      explanation = {
        simple_terms: String(parsed.simple_terms ?? ''),
        why_it_matters: String(parsed.why_it_matters ?? ''),
        checks: Array.isArray(parsed.checks) ? parsed.checks.map(String) : [],
        sources: Array.isArray(parsed.sources) ? parsed.sources : [],
        disclaimer:
          String(
            parsed.disclaimer ??
              'This is an explanation, not legal advice. Verify important decisions with an appropriate professional or official authority.'
          ),
      }
    } catch (err) {
      console.error('Zen call failed:', err.message)
      return c.json({ error: `AI provider failed: ${err.message}` }, 502)
    }
  }

  sql`
    INSERT INTO ai_conversations (user_id, message, response)
    VALUES (${DEMO_USER_ID}, ${message}, ${JSON.stringify({ ...explanation, usedFallback })})`.catch(
    (err) => console.error('Conversation log failed:', err.message)
  )

  return c.json({ ...explanation, stub: usedFallback })
})

// ---- Live News cron (auto-published) ----
async function fetchAndIngestNews() {
  const sources = await sql`SELECT id, source_name, url, category FROM news_sources WHERE is_active = true`
  let inserted = 0
  for (const src of sources) {
    try {
      const res = await fetch(src.url, { headers: { 'User-Agent': 'KnowlyBot/1.0' }, signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue
      const html = await res.text()
      const $$ = cheerio.load(html)
      $$('style, script, nav, header, footer, .nav, .menu, .sidebar, .breadcrumb, .pagination, .sidebar, .header, .footer, .nav, noscript, iframe, .cookie, .cookie-banner, .popup, .modal, aside, .ads, .advertisement, .navigation, .menu, .sidebar, .breadcrumb, .pagination, .header, .footer, .navbar, .menu-toggle, .mobile-menu, .header-top, .header-bottom, .top-bar, .bottom-bar, .social-links, .share-buttons, .tags, .categories, .author-box, .related-posts, .comments, .comment-form, .sidebar-left, .sidebar-right, .widget, .widget-area, .nav-menu, .main-menu, .site-header, .site-footer, .page-header, .page-footer, .post-meta, .entry-meta, .post-meta, .entry-meta, .byline, .post-date, .post-author, .post-tags, .post-categories, .post-navigation, .prev-post, .next-post, .pagination, .page-numbers, .related-posts, .related-articles, .similar-posts, .recommended-posts, .popular-posts, .recent-posts, .latest-posts, .featured-posts, .trending-posts, .popular-posts, .post-tags, .post-categories, .tag-cloud, .tag-cloud, .category-list, .archive-list, .search-form, .search-box, .search-input, .search-button, .subscribe-form, .newsletter-form, .email-signup, .rss-link, .feed-link, .social-icons, .social-links, .follow-us, .connect-with-us, .back-to-top, .scroll-to-top, .go-to-top').remove()
      
      const candidates = []
      $('article a, .post-title a, .news-title a, .entry-title a, h2 a, h3 a, h1 a').each((_, el) => {
        const title = $(el).text().trim().replace(/\s+/g, ' ')
        let href = $(el).attr('href')
        if (!href) return
        try { href = new URL(href, src.url).href } catch {}
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
        try {
          const artRes = await fetch(href, { headers: { 'User-Agent': 'KnowlyBot/1.0' }, signal: AbortSignal.timeout(8000) })
          if (artRes.ok) {
            const artHtml = await artRes.text()
            const $$ = cheerio.load(artHtml)
            $$('style, script, nav, header, footer, .nav, .menu, .sidebar, .breadcrumb, .pagination, .sidebar, .header, .footer, .nav, noscript, iframe, .cookie, .cookie-banner, .popup, .modal, aside, .ads, .advertisement, .navigation, .menu, .sidebar, .breadcrumb, .pagination, .header, .footer, .navbar, .menu-toggle, .mobile-menu, .header-top, .header-bottom, .top-bar, .bottom-bar, .social-links, .share-buttons, .tags, .categories, .author-box, .related-posts, .comments, .comment-form, .sidebar-left, .sidebar-right, .widget, .widget-area, .nav-menu, .main-menu, .site-header, .site-footer, .page-header, .page-footer, .post-meta, .entry-meta, .post-meta, .entry-meta, .byline, .post-date, .post-author, .post-tags, .post-categories, .post-navigation, .prev-post, .next-post, .pagination, .page-numbers, .related-posts, .related-articles, .similar-posts, .recommended-posts, .popular-posts, .recent-posts, .latest-posts, .featured-posts, .trending-posts, .popular-posts, .post-tags, .post-categories, .tag-cloud, .tag-cloud, .category-list, .archive-list, .search-form, .search-box, .search-input, .search-button, .subscribe-form, .newsletter-form, .email-signup, .rss-link, .feed-link, .social-icons, .social-links, .follow-us, .connect-with-us, .back-to-top, .scroll-to-top, .go-to-top').remove()
            
            const candidates = [
              $$('article .entry-content').text(),
              $$('article .content').text(),
              $$('article .post-content').text(),
              $$('article .article-content').text(),
              $$('article .post-body').text(),
              $$('article .entry').text(),
              $$('article .post-body').text(),
              $$('article .article-content').text(),
              $$('article .post-body').text(),
              $$('article .entry').text(),
              $$('article .post-body').text(),
              $$('article .article-content').text(),
              $$('article .post-body').text(),
              $$('article .entry').text(),
              $$('article .post-body').text(),
              $$('article .article-content').text(),
              $$('article .post-body').text(),
              $$('article .entry').text(),
              $$('article .post-body').text(),
              $$('article .article-content').text(),
              $$('article .post-body').text(),
              $$('article .entry').text(),
              $$('article .post-body').text(),
              $$('article .article-content').text(),
              $$('article .post-body').text(),
              $$('article .entry').text(),
              $$('article .post-body').text(),
              $$('article .article-content').text(),
              $$('article .post-body').text(),
              $$('article .entry').text(),
              $$('article .post-body').text(),
              $$('article .article-content').text(),
              $$('article .post-body').text(),
              $$('article .entry').text(),
            ]
            
            let body = ''
            for (const cand of candidates) {
              const cleaned = cand.trim().replace(/\s+/g, ' ')
              if (cleaned.length > 200 && 
                  !cleaned.includes('var(--') && 
                  !cleaned.includes('.title-h') &&
                  !cleaned.includes('font-weight:') &&
                  !cleaned.includes('margin-top:') &&
                  !cleaned.includes('color: var(') &&
                  !cleaned.includes('.title-h') &&
                  !cleaned.includes('font-size:') &&
                  !cleaned.includes('margin-bottom:') &&
                  !cleaned.includes('margin-top:') &&
                  !cleaned.includes('padding:') &&
                  !cleaned.includes('border-radius:') &&
                  !cleaned.includes('box-shadow:') &&
                  !cleaned.includes('background-color:') &&
                  !cleaned.includes('border:') &&
                  !cleaned.includes('display:') &&
                  !cleaned.includes('flex') &&
                  !cleaned.includes('justify-content:') &&
                  !cleaned.includes('align-items:') &&
                  !cleaned.includes('position:') &&
                  !cleaned.includes('z-index:') &&
                  !cleaned.includes('overflow:') &&
                  !cleaned.includes('white-space:') &&
                  !cleaned.includes('text-overflow:') &&
                  !cleaned.includes('line-height:') &&
                  !cleaned.includes('letter-spacing:') &&
                  !cleaned.includes('text-transform:') &&
                  !cleaned.includes('font-family:') &&
                  !cleaned.includes('background:') &&
                  !cleaned.includes('color:') &&
                  !cleaned.includes('opacity:') &&
                  !cleaned.includes('transition:') &&
                  !cleaned.includes('transform:') &&
                  !cleaned.includes('cursor:') &&
                  !cleaned.includes('pointer-events:') &&
                  !cleaned.includes('user-select:') &&
                  !cleaned.includes('outline:') &&
                  !cleaned.includes('::') &&
                  !cleaned.includes('@media') &&
                  !cleaned.includes('@keyframes') &&
                  !cleaned.includes('!important') &&
                  !cleaned.includes('Lire l\'article') &&
                  !cleaned.includes('Lire la suite') &&
                  !cleaned.includes('Voir plus') &&
                  !cleaned.includes('Voir l\'article') &&
                  !cleaned.includes('Read more') &&
                  !cleaned.includes('Read article') &&
                  !cleaned.includes('Read full') &&
                  !cleaned.includes('...') &&
                  !cleaned.match(/^[^{]*\{[^}]*\{/)) {
                body = cleaned
                break
              }
            }
            
            if (!body) {
              const fallback = $$('main, #main, #content, .main-content, #main-content').text().trim().replace(/\s+/g, ' ')
              if (fallback.length > 200 && 
                  !fallback.includes('var(--') &&
                  !fallback.includes('font-weight:') &&
                  !fallback.includes('margin-top:') &&
                  !fallback.includes('Lire l\'article') &&
                  !fallback.includes('Lire la suite')) {
                body = fallback
              }
            }
            
            if (body) {
              body = body
                .split(/(?<=[.!?])\s+/)
                .filter(s => {
                  const trimmed = s.trim()
                  const ok = trimmed.length > 15 && 
                         !trimmed.match(/^[\s]*[\.#\w-]+\s*\{/) && 
                         !trimmed.includes('var(--') &&
                         !trimmed.includes('font-weight:') &&
                         !trimmed.includes('margin-top:') &&
                         !trimmed.includes('color:') &&
                         !trimmed.includes('font-size:') &&
                         !trimmed.includes('{') &&
                         !trimmed.includes('}') &&
                         !trimmed.includes(';') &&
                         !trimmed.includes(':') &&
                         !trimmed.includes('Lire l\'article') &&
                         !trimmed.includes('Lire la suite') &&
                         !trimmed.includes('Voir plus') &&
                         !trimmed.includes('Voir l\'article') &&
                         !trimmed.includes('Read more') &&
                         !trimmed.includes('Read article') &&
                         trimmed.length > 20
                  return true
                })
                .join(' ')
                .trim()
            }
            
            if (body.length > 120) {
              content = body.slice(0, 4000)
              const sentences = body.match(/[^.!?]+[.!?]+/g) || [body]
              summary = sentences.slice(0, 2).join(' ').trim().slice(0, 320)
            }
          }
        } catch {}
        const severity = /urgent|important|critical|tax|impôt/i.test(title) ? 'critical' : 'info'
        await sql`
          INSERT INTO regulations (title, summary, content, category, severity, source_name, source_url, published_date, verification_status)
          VALUES (${title}, ${summary}, ${content}, ${src.category}, ${severity}, ${src.source_name}, ${href}, CURRENT_DATE, 'verified')`
        inserted++
      }
      await sql`UPDATE news_sources SET last_fetched = now() WHERE id = ${src.id}`
    } catch (e) {
      console.error(`Fetch ${src.source_name} failed:`, e.message)
    }
  }
  return inserted
}

app.get('/cron/fetch-news', async (c) => {
  if (process.env.CRON_SECRET) {
    const auth = c.req.header('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) return c.json({ error: 'Unauthorized' }, 401)
  }
  const inserted = await fetchAndIngestNews()
  return c.json({ inserted, at: new Date().toISOString() })
})
app.post('/cron/fetch-news', async (c) => {
  if (process.env.CRON_SECRET) {
    const auth = c.req.header('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) return c.json({ error: 'Unauthorized' }, 401)
  }
  const inserted = await fetchAndIngestNews()
  return c.json({ inserted, at: new Date().toISOString() })
})

// ---- Document upload + OCR -> explain (same AI, with extracted text) ----
async function extractTextFromFile(file) {
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
    const tmp = path.join(os.tmpdir(), `knowly-upload-${Date.now()}${path.extname(name) || '.png'}`)
    writeFileSync(tmp, buf)
    try {
      const text = execFileSync('node', [path.join(process.cwd(), 'db', 'ocr-worker.js'), tmp], { timeout: 60000, encoding: 'utf8' })
      return text.trim().slice(0, 8000)
    } finally {
      try { unlinkSync(tmp) } catch {}
    }
  }

  const asText = buf.toString('utf8').trim()
  if (asText.length > 20 && /^[\x09\x0A\x0D\x20-\x7E]/.test(asText.slice(0, 100))) return asText.slice(0, 8000)
  throw new Error('Could not extract text from this file type')
}

app.post('/explain/upload', async (c) => {
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
  try {
    const lawRows = await retrieveLawContext(combined)
    const hasLaws = lawRows.length > 0
    const raw = await callZen(combined, buildSystemPrompt(buildLawBlock(lawRows), hasLaws))
    const parsed = parseModelJson(raw)
    explanation = {
      simple_terms: String(parsed.simple_terms ?? ''),
      why_it_matters: String(parsed.why_it_matters ?? ''),
      checks: Array.isArray(parsed.checks) ? parsed.checks.map(String) : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      disclaimer: String(parsed.disclaimer ?? 'This is an explanation, not legal advice. Verify important decisions with an appropriate professional or official authority.'),
    }
  } catch (err) {
    return c.json({ error: `AI provider failed: ${err.message}` }, 502)
  }

  const encoder = new TextEncoder()
  const sendWord = (controller, section, word) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: word, section })}\n\n`))
  const wordDelay = 40
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (const sec of [{ key: 'simple_terms', text: explanation.simple_terms }, { key: 'why_it_matters', text: explanation.why_it_matters }]) {
          for (const w of sec.text.split(/(\s+)/)) { if (!w) continue; sendWord(controller, sec.key, w); await new Promise((r) => setTimeout(r, wordDelay)) }
        }
        for (let i = 0; i < explanation.checks.length; i++) {
          const words = explanation.checks[i].split(/(\s+)/)
          for (const w of words) { if (!w) continue; sendWord(controller, 'checks', w); await new Promise((r) => setTimeout(r, wordDelay)) }
          sendWord(controller, 'checks', '\n'); await new Promise((r) => setTimeout(r, wordDelay))
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sources: explanation.sources, disclaimer: explanation.disclaimer, stub: false })}\n\n`))
        controller.close()
        sql`INSERT INTO ai_conversations (user_id, message, response) VALUES (${DEMO_USER_ID}, ${combined.slice(0, 2000)}, ${JSON.stringify(explanation)})`.catch(() => {})
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)); controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
})

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app