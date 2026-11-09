import { neon } from '@neondatabase/serverless'

// Idempotent schema bootstrap.
//
// The deployed function may point at a database whose schema predates the
// current db/*.sql files (e.g. missing regulations.type or goals.emoji breaks
// endpoints at runtime with NeonDbError 42703), and serverless deploys cannot
// run `node db/migrate.js` first. Every statement below is safe to re-run;
// the module executes them once per lambda cold start against whatever
// DATABASE_URL is configured.

const STATEMENTS = [
  // --- tables (db/schema.sql) ---
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    country TEXT NOT NULL DEFAULT 'benin',
    language TEXT NOT NULL DEFAULT 'fr',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    topics TEXT[] NOT NULL DEFAULT '{}',
    notification_prefs JSONB NOT NULL DEFAULT '{}',
    language TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS regulations (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    type TEXT NOT NULL DEFAULT 'news',
    enforcement_note TEXT,
    country TEXT NOT NULL DEFAULT 'benin',
    source_name TEXT NOT NULL,
    source_url TEXT,
    published_date DATE,
    effective_date TEXT,
    verification_status TEXT NOT NULL DEFAULT 'verified',
    last_verified TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS financial_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    monthly_income INTEGER NOT NULL DEFAULT 0,
    monthly_expenses INTEGER NOT NULL DEFAULT 0,
    savings INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'CFA',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    target_amount INTEGER NOT NULL,
    current_amount INTEGER NOT NULL DEFAULT 0,
    emoji TEXT,
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS daily_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    income INTEGER DEFAULT 0,
    expenses INTEGER DEFAULT 0,
    savings INTEGER DEFAULT 0,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS ai_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response JSONB NOT NULL,
    source_ids INTEGER[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS money_checkins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'weekly',
    currency TEXT NOT NULL DEFAULT 'FCFA',
    income INTEGER NOT NULL DEFAULT 0,
    needs INTEGER NOT NULL DEFAULT 0,
    wants INTEGER NOT NULL DEFAULT 0,
    debt INTEGER NOT NULL DEFAULT 0,
    feeling TEXT,
    savings_goal_pct INTEGER,
    regret TEXT,
    says JSONB NOT NULL DEFAULT '[]',
    plan JSONB NOT NULL DEFAULT '{}',
    outcome TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS news_sources (
    id SERIAL PRIMARY KEY,
    source_name TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    category TEXT NOT NULL,
    fetch_method TEXT NOT NULL DEFAULT 'html',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_fetched TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_regulations_country_status ON regulations (country, verification_status, published_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_goals_user ON goals (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_money_checkins_user ON money_checkins (user_id, created_at DESC)`,

  // --- columns added after the original schema (drift on older databases) ---
  `ALTER TABLE regulations ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'news'`,
  `ALTER TABLE regulations ADD COLUMN IF NOT EXISTS enforcement_note TEXT`,
  `ALTER TABLE regulations ADD COLUMN IF NOT EXISTS content TEXT`,
  `ALTER TABLE goals ADD COLUMN IF NOT EXISTS emoji TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE`,

  // --- law RAG tables (db/vector-schema.sql) ---
  `CREATE EXTENSION IF NOT EXISTS vector`,
  `CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    file_name TEXT NOT NULL UNIQUE,
    law_title TEXT NOT NULL,
    law_ref TEXT,
    pages INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    chunk_count INTEGER NOT NULL DEFAULT 0,
    ocr_pages INTEGER NOT NULL DEFAULT 0,
    ingested_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS law_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    law_title TEXT NOT NULL,
    law_ref TEXT,
    article_ref TEXT,
    content TEXT NOT NULL,
    page INTEGER,
    embedding vector(384),
    content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('french', content)) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_law_chunks_tsv ON law_chunks USING gin (content_tsv)`,
  `CREATE INDEX IF NOT EXISTS idx_law_chunks_embedding ON law_chunks USING hnsw (embedding vector_cosine_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_law_chunks_doc ON law_chunks (document_id)`,

  // --- official news sources for the daily cron (db/news-sources.sql) ---
  `INSERT INTO news_sources (source_name, url, category, fetch_method) VALUES
    ('Présidence du Bénin', 'https://presidence.bj', 'Government', 'html'),
    ('Gouvernement du Bénin', 'https://gouv.bj', 'Government', 'html'),
    ('Direction Générale des Impôts', 'https://impots.bj', 'Taxes', 'html'),
    ('Secrétariat Général du Gouvernement', 'https://sgg.gouv.bj', 'Legal', 'html'),
    ('APIEx Bénin', 'https://investir.bj', 'Business', 'html')
  ON CONFLICT (source_name) DO NOTHING`,

  // --- shared demo user for guest mode (db/seed.sql, rows only) ---
  `INSERT INTO users (id, name, email, country, language) VALUES (1, 'Grace', 'grace@example.bj', 'benin', 'fr') ON CONFLICT DO NOTHING`,
  `SELECT setval('users_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM users), 1))`,
  `INSERT INTO user_preferences (user_id, topics, language) VALUES (1, ARRAY['Money', 'Taxes', 'Business'], 'fr') ON CONFLICT (user_id) DO NOTHING`,
  `INSERT INTO financial_profiles (user_id) VALUES (1) ON CONFLICT (user_id) DO NOTHING`,
]

let bootstrapPromise = null

export function ensureSchema() {
  bootstrapPromise ??= (async () => {
    const sql = neon(process.env.DATABASE_URL)
    for (const stmt of STATEMENTS) {
      try {
        await sql.query(stmt)
      } catch (err) {
        // "already exists" is fine; anything else is logged but never fatal —
        // a partially-migrated DB still serves what it can.
        console.error('DB bootstrap:', err.message.slice(0, 140))
      }
    }
  })()
  return bootstrapPromise
}
