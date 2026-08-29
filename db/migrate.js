import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'

const sql = neon(process.env.DATABASE_URL)

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Add it to .env first.')
  process.exit(1)
}

async function runFile(path) {
  const text = readFileSync(new URL(path, import.meta.url), 'utf8')
  const statements = text
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const statement of statements) {
    await sql.query(statement)
  }
  console.log(`${path}: ${statements.length} statements OK`)
}

const targets = process.argv.slice(2)
const files = targets.length ? targets.map((t) => `./${t.replace(/^db\//, '')}`) : ['./schema.sql', './seed.sql', './vector-schema.sql']

try {
  for (const file of files) {
    await runFile(file)
  }
  console.log('Migration complete.')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
}
