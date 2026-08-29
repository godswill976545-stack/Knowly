import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas, DOMMatrix, Path2D } from '@napi-rs/canvas'
import { execFileSync } from 'node:child_process'
import { pipeline } from '@xenova/transformers'

globalThis.DOMMatrix ??= DOMMatrix
globalThis.Path2D ??= Path2D

const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')

const sql = neon(process.env.DATABASE_URL)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LAWS_DIR = path.join(__dirname, '..', 'laws')

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const MAX_PAGES = (() => {
  const arg = args.find((a) => a.startsWith('--max-pages='))
  return arg ? Number(arg.split('=')[1]) : null
})()
const ONLY_FILE = (() => {
  const arg = args.find((a) => a.startsWith('--file='))
  return arg ? arg.split('=')[1] : null
})()

const EMBED_MODEL = 'Xenova/multilingual-e5-small'
const MIN_TEXT_FOR_PAGE = 30
const MAX_CHUNK_CHARS = 2400
const WINDOW_CHARS = 1800
const WINDOW_OVERLAP = 150
const EMBED_BATCH = 16
const INSERT_BATCH = 20

function log(...parts) {
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...parts)
}

function lawRefFromFileName(fileName) {
  const m = fileName.match(/^(loi|decret|arrete)-(\d{2,4})-(\d+)/i)
  if (!m) return fileName.replace(/\.pdf$/i, '')
  const type = m[1].toLowerCase() === 'loi' ? 'Loi' : m[1].toLowerCase() === 'decret' ? 'Décret' : 'Arrêté'
  return `${type} N° ${m[2]}-${m[3]}`
}

function extractTitle(firstPageText, fallback) {
  const lines = firstPageText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3)
  const joined = lines.slice(0, 6).join(' ')
  const cleaned = joined.replace(/\s+/g, ' ').trim()
  return cleaned.length > 10 ? cleaned.slice(0, 160) : fallback
}

async function extractPageText(page) {
  const tc = await page.getTextContent()
  let text = ''
  for (const item of tc.items) {
    text += item.str
    if (item.hasEOL) text += '\n'
  }
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

async function ocrPage(page, pageNum, fileName) {
  const viewport = page.getViewport({ scale: 2 })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport, canvas })
  const png = await canvas.encode('png')
  const tmp = path.join(__dirname, `ocr-tmp-${process.pid}.png`)
  writeFileSync(tmp, png)
  try {
    const text = execFileSync('node', [path.join(__dirname, 'ocr-worker.js'), tmp], {
      timeout: 180000,
      encoding: 'utf8',
    })
    log(`    OCR page ${pageNum} of ${fileName} -> ${text.trim().length} chars`)
    return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  } finally {
    try {
      unlinkSync(tmp)
    } catch {}
  }
}

function buildPageJoined(pageTexts) {
  let full = ''
  const pageOffsets = []
  pageTexts.forEach((text, idx) => {
    pageOffsets.push({ page: idx + 1, start: full.length })
    full += `\n\n[[PAGE ${idx + 1}]]\n` + text
  })
  return { full, pageOffsets }
}

function pageForOffset(pageOffsets, offset) {
  let page = pageOffsets[0]?.page ?? null
  for (const marker of pageOffsets) {
    if (marker.start <= offset) page = marker.page
    else break
  }
  return page
}

function splitArticles(full, pageOffsets) {
  const marks = []
  const re = /(?:^|\n)\s*(?:ARTICLE|Article)\s+(?:1er|1er\b|premier|PREMIER|\d+(?:\s*(?:bis|ter))?)\s*(?:\n|:|\.|-)/g
  let m
  while ((m = re.exec(full)) !== null) {
    marks.push(m.index + (m[0].startsWith('\n') ? 1 : 0))
    re.lastIndex = m.index + m[0].length
  }
  const chunks = []
  if (marks.length < 2) return chunks
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i]
    const end = i + 1 < marks.length ? marks[i + 1] : full.length
    const slice = full.slice(start, end).trim()
    if (slice.length < 40) continue
    const firstLine = slice.split('\n')[0].trim()
    chunks.push({
      article_ref: firstLine.replace(/\s+/g, ' ').slice(0, 60),
      content: slice,
      page: pageForOffset(pageOffsets, start),
    })
  }
  return chunks
}

function windowChunks(full, pageOffsets) {
  const chunks = []
  let start = 0
  while (start < full.length) {
    const end = Math.min(start + WINDOW_CHARS, full.length)
    const slice = full.slice(start, end).trim()
    if (slice.length > 60) {
      chunks.push({
        article_ref: null,
        content: slice,
        page: pageForOffset(pageOffsets, start),
      })
    }
    if (end >= full.length) break
    start = end - WINDOW_OVERLAP
  }
  return chunks
}

function finalizeChunks(rawChunks) {
  const out = []
  for (const chunk of rawChunks) {
    if (chunk.content.length <= MAX_CHUNK_CHARS) {
      out.push(chunk)
      continue
    }
    let start = 0
    let part = 1
    const total = Math.ceil(chunk.content.length / (WINDOW_CHARS - WINDOW_OVERLAP))
    while (start < chunk.content.length) {
      const end = Math.min(start + WINDOW_CHARS, chunk.content.length)
      const slice = chunk.content.slice(start, end).trim()
      if (slice.length > 60) {
        out.push({
          article_ref: total > 1 ? `${chunk.article_ref ?? 'Extrait'} (partie ${part}/${total})` : chunk.article_ref,
          content: slice,
          page: chunk.page,
        })
      }
      if (end >= chunk.content.length) break
      start = end - WINDOW_OVERLAP
      part += 1
    }
  }
  return out
}

async function embedAll(extractor, chunks) {
  const vectors = new Array(chunks.length)
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH).map((c) => 'passage: ' + c.content.replace(/\s+/g, ' ').slice(0, 2000))
    const out = await extractor(batch, { pooling: 'mean', normalize: true })
    const rows = out.tolist()
    for (let j = 0; j < rows.length; j++) {
      vectors[i + j] = rows[j]
    }
    log(`    embedded ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length}`)
  }
  return vectors
}

async function insertChunks(chunks, vectors, documentId, lawTitle, lawRef) {
  for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
    const slice = chunks.slice(i, i + INSERT_BATCH)
    const vecs = vectors.slice(i, i + INSERT_BATCH)
    const params = []
    const values = slice.map((c, j) => {
      const b = j * 7
      params.push(documentId, lawTitle, lawRef, c.article_ref, c.content, c.page, '[' + vecs[j].map((v) => v.toFixed(6)).join(',') + ']')
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7}::vector)`
    })
    await sql.query(
      `INSERT INTO law_chunks (document_id, law_title, law_ref, article_ref, content, page, embedding) VALUES ${values.join(',')}`,
      params
    )
  }
}

function parseArgs() {
  const files = readdirSync(LAWS_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'))
  return ONLY_FILE ? files.filter((f) => f === ONLY_FILE) : files
}

async function main() {
  const files = parseArgs()
  if (!files.length) {
    log('No PDF files to process.')
    return
  }
  log(`Processing ${files.length} file(s)${MAX_PAGES ? ` (max ${MAX_PAGES} pages each)` : ''}`)

  log('Loading embedding model (first run downloads ~130MB)...')
  const extractor = await pipeline('feature-extraction', EMBED_MODEL)
  log('Embedding model ready.')

  for (const fileName of files) {
    const lawRef = lawRefFromFileName(fileName)
    log(`=== ${fileName} (${lawRef}) ===`)

    const existing = await sql.query('SELECT id, status FROM documents WHERE file_name = $1', [fileName])
    if (existing.length && existing[0].status === 'ingested' && !FORCE) {
      log('  already ingested, skipping (use --force to redo)')
      continue
    }

    let docRow
    if (existing.length) {
      docRow = existing[0]
      await sql.query("UPDATE documents SET status = 'processing' WHERE id = $1", [docRow.id])
      await sql.query('DELETE FROM law_chunks WHERE document_id = $1', [docRow.id])
    } else {
      const inserted = await sql.query(
        "INSERT INTO documents (file_name, law_title, law_ref, status) VALUES ($1, $2, $3, 'processing') RETURNING id",
        [fileName, lawRef, lawRef]
      )
      docRow = inserted[0]
    }
    const documentId = docRow.id

    const buf = readFileSync(path.join(LAWS_DIR, fileName))
    const doc = await getDocument({ data: new Uint8Array(buf), useSystemFonts: true, isEvalSupported: false }).promise
    const totalPages = MAX_PAGES ? Math.min(MAX_PAGES, doc.numPages) : doc.numPages
    log(`  ${doc.numPages} pages (processing ${totalPages})`)

    const pageTexts = []
    let ocrPages = 0
    for (let p = 1; p <= totalPages; p++) {
      const page = await doc.getPage(p)
      let text = ''
      try {
        text = await extractPageText(page)
      } catch (err) {
        log(`    text extraction failed on page ${p}: ${err.message.slice(0, 80)}`)
      }
      if (text.trim().length < MIN_TEXT_FOR_PAGE) {
        try {
          text = await ocrPage(page, p, fileName)
          ocrPages += 1
        } catch (err) {
          log(`    OCR failed on page ${p}: ${String(err.message).slice(0, 80)}`)
          text = ''
        }
      }
      pageTexts.push(text)
      if (p % 10 === 0) log(`  page ${p}/${totalPages}`)
    }

    const fullTextLength = pageTexts.join('').length
    log(`  extracted ${fullTextLength} chars, OCR used on ${ocrPages} pages`)

    const { full, pageOffsets } = buildPageJoined(pageTexts)
    const rawChunks = splitArticles(full, pageOffsets)
    const chosen = rawChunks.length >= 2 ? rawChunks : windowChunks(full, pageOffsets)
    const chunks = finalizeChunks(chosen)
    log(`  ${chunks.length} chunks (${rawChunks.length >= 2 ? 'by article' : 'by window'})`)

    if (chunks.length === 0) {
      log('  no chunks produced, marking failed')
      await sql.query("UPDATE documents SET status = 'failed', pages = $1, ocr_pages = $2 WHERE id = $3", [totalPages, ocrPages, documentId])
      continue
    }

    const title = extractTitle(pageTexts[0] ?? '', lawRef)
    const vectors = await embedAll(extractor, chunks)
    await insertChunks(chunks, vectors, documentId, title, lawRef)

    await sql.query(
      "UPDATE documents SET status = 'ingested', law_title = $1, pages = $2, chunk_count = $3, ocr_pages = $4, ingested_at = now() WHERE id = $5",
      [title, totalPages, chunks.length, ocrPages, documentId]
    )
    log(`  DONE: ${chunks.length} chunks stored. Title: ${title.slice(0, 80)}`)
  }

  log('All files processed.')
}

main().catch((err) => {
  console.error('Ingest failed:', err)
  process.exit(1)
})
