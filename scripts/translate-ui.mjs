import 'dotenv/config'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fr = JSON.parse(readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'translations', 'fr.json'), 'utf8'))

const ZEN_BASE_URL = 'https://opencode.ai/zen/v1'
const MODEL = process.env.ZEN_MODEL || 'nemotron-3-ultra-free'
const BATCH_SIZE = 15
const RETRIES = 2

const TARGETS = [
  { code: 'yo', name: 'Yoruba (Yorùbá), as spoken in Benin and Nigeria' },
  { code: 'fon', name: 'Fon (Fon gbè), as spoken in Benin' },
]

function parseModelJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object in model response')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function chunkEntries(entries, size) {
  const out = []
  for (let i = 0; i < entries.length; i += size) {
    out.push(entries.slice(i, i + size))
  }
  return out
}

async function translateBatch(targetName, batch) {
  const source = JSON.stringify(Object.fromEntries(batch), null, 2)
  const prompt = `Translate every value of this small UI dictionary from French into ${targetName}.
Keep each key exactly the same. Keep placeholders like {name}, {amount}, {months}, {pct}, {mins}, {message} unchanged.
Use plain everyday language. Return ONLY the JSON object, no markdown, no explanations.

${source}`

  const res = await fetch(`${ZEN_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENCODE_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: `${prompt}\n\n/no_think` }],
      temperature: 0.2,
      max_tokens: 1500,
      chat_template_kwargs: { thinking: false },
    }),
  })
  if (!res.ok) throw new Error(`Zen error ${res.status}`)
  const data = await res.json()
  return parseModelJson(data.choices?.[0]?.message?.content ?? '')
}

async function translateTarget(target) {
  const entries = Object.entries(fr)
  const batches = chunkEntries(entries, BATCH_SIZE)
  const result = {}
  let failedKeys = 0

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b]
    let translated = null
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      try {
        translated = await translateBatch(target.name, batch)
        break
      } catch (err) {
        process.stdout.write(`x`)
        if (attempt === RETRIES) translated = null
        await new Promise((r) => setTimeout(r, 1500))
      }
    }
    for (const [key, frValue] of batch) {
      const value = translated?.[key]
      if (typeof value === 'string' && value.trim() && value.trim() !== frValue.trim()) {
        result[key] = value.trim()
      } else {
        result[key] = frValue
        failedKeys += 1
      }
    }
    process.stdout.write(` ${b + 1}/${batches.length}\n`)
  }
  return { result, failedKeys }
}

const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]
const targets = only ? TARGETS.filter((t) => t.code === only) : TARGETS

for (const target of targets) {
  console.log(`Translating to ${target.code}...`)
  const { result, failedKeys } = await translateTarget(target)
  const outPath = path.join(__dirname, '..', 'src', 'i18n', 'translations', `${target.code}.json`)
  writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8')
  console.log(`  -> ${target.code}.json written (${Object.keys(fr).length} keys, ${failedKeys} fell back to French)`)
}
console.log('Done.')
