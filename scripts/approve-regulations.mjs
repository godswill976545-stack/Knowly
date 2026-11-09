// Review and approve scraped regulations.
//
// The news cron stores scraped articles with verification_status='unverified';
// /api/alerts and /api/reminders only surface 'verified' rows, so nothing
// reaches users until a human approves it here.
//
// Usage:
//   node scripts/approve-regulations.mjs                # list unverified rows
//   node scripts/approve-regulations.mjs approve 42     # publish row 42
//   node scripts/approve-regulations.mjs reject 42      # delete row 42
//   node scripts/approve-regulations.mjs approve-all    # publish every unverified row
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Add it to .env first.')
  process.exit(1)
}

const [command, rawId] = process.argv.slice(2)

async function list() {
  const rows = await sql`
    SELECT id, title, type, category, source_name, published_date
    FROM regulations
    WHERE verification_status = 'unverified'
    ORDER BY published_date DESC, id DESC`
  if (!rows.length) {
    console.log('No unverified regulations.')
    return
  }
  console.log(`${rows.length} unverified row(s):\n`)
  for (const r of rows) {
    console.log(`  #${r.id}  [${r.type}] ${r.title}`)
    console.log(`        ${r.source_name} · ${r.published_date ?? 'no date'}`)
  }
  console.log('\nApprove with: node scripts/approve-regulations.mjs approve <id>')
}

async function approve(id) {
  const rows = await sql`
    UPDATE regulations
    SET verification_status = 'verified', last_verified = now()
    WHERE id = ${id} AND verification_status = 'unverified'
    RETURNING id, title`
  if (!rows.length) console.log(`No unverified row #${id}.`)
  else console.log(`Published #${rows[0].id}: ${rows[0].title}`)
}

async function reject(id) {
  const rows = await sql`
    DELETE FROM regulations
    WHERE id = ${id} AND verification_status = 'unverified'
    RETURNING id, title`
  if (!rows.length) console.log(`No unverified row #${id}.`)
  else console.log(`Deleted #${rows[0].id}: ${rows[0].title}`)
}

async function approveAll() {
  const rows = await sql`
    UPDATE regulations
    SET verification_status = 'verified', last_verified = now()
    WHERE verification_status = 'unverified'
    RETURNING id`
  console.log(`Published ${rows.length} row(s).`)
}

const actions = { list, approve, reject, 'approve-all': approveAll }
const action = actions[command] ?? list

try {
  await action(rawId ? Number(rawId) : undefined)
} catch (err) {
  console.error('Failed:', err.message)
  process.exit(1)
}
