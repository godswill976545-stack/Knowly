CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  country TEXT NOT NULL DEFAULT 'benin',
  language TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  topics TEXT[] NOT NULL DEFAULT '{}',
  notification_prefs JSONB NOT NULL DEFAULT '{}',
  language TEXT
);

CREATE TABLE IF NOT EXISTS regulations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  country TEXT NOT NULL DEFAULT 'benin',
  source_name TEXT NOT NULL,
  source_url TEXT,
  published_date DATE,
  effective_date TEXT,
  verification_status TEXT NOT NULL DEFAULT 'verified',
  last_verified TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  monthly_income INTEGER NOT NULL DEFAULT 0,
  monthly_expenses INTEGER NOT NULL DEFAULT 0,
  savings INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CFA',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  target_amount INTEGER NOT NULL,
  current_amount INTEGER NOT NULL DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response JSONB NOT NULL,
  source_ids INTEGER[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regulations_country_status ON regulations (country, verification_status, published_date DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations (user_id, created_at DESC);
