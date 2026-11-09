// Seeds the `alerts` table from src/lib/bundled-alerts.json.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
// Already-seeded alerts are skipped (matched by title + source_url).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const alerts = JSON.parse(readFileSync(join(__dirname, '..', '..', 'src', 'lib', 'bundled-alerts.json'), 'utf8'));

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the seed.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: existing, error: fetchErr } = await supabase.from('alerts').select('title');
if (fetchErr) {
  console.error('Could not read alerts table:', fetchErr.message);
  console.error('Run supabase/migrations/0001_init.sql in the SQL editor first.');
  process.exit(1);
}
const known = new Set((existing || []).map((a) => a.title));

let added = 0;
let skipped = 0;
for (const a of alerts) {
  if (known.has(a.title)) {
    skipped += 1;
    continue;
  }
  const { error } = await supabase.from('alerts').insert({
    title: a.title,
    summary: a.summary,
    body: a.body,
    who: a.who,
    what_to_do: a.what_to_do,
    keywords: a.keywords,
    category: a.category,
    source_name: a.source_name,
    source_url: a.source_url,
    status: a.status,
    published_at: a.published_at || null,
  });
  if (error) {
    console.error(`Failed for "${a.title}":`, error.message);
  } else {
    added += 1;
  }
}

console.log(`Done. ${added} alerts added, ${skipped} already present.`);
console.log('Drafts (status = draft) are hidden from users until published via /admin.');
