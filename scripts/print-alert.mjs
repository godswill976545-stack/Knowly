import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

async function check() {
  const rows = await sql`SELECT id, title, summary, content FROM regulations WHERE id = 12`
  console.log('=== TITLE ===\n' + rows[0].title)
  console.log('=== SUMMARY ===\n' + rows[0].summary)
  console.log('=== CONTENT ===\n' + rows[0].content)
}

check().catch(console.error)
