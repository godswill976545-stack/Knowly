import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { cleanAndFormatArticle, generateCleanSummary } from '../server/format-news.js'

const sql = neon(process.env.DATABASE_URL)

async function main() {
  const rows = await sql`SELECT id, title, content FROM regulations`
  console.log(`Processing ${rows.length} regulations...`)
  for (const r of rows) {
    const cleaned = cleanAndFormatArticle(r.content, r.title)
    const summary = generateCleanSummary(cleaned, r.title)
    await sql`UPDATE regulations SET content = ${cleaned}, summary = ${summary} WHERE id = ${r.id}`
    console.log(`✓ ID ${r.id} cleaned. Summary: ${summary.slice(0, 70)}...`)
  }
  console.log('All regulations successfully cleaned.')
}

main().catch(console.error)
