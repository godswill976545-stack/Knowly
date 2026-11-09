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
  emoji TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  income INTEGER DEFAULT 0,
  expenses INTEGER DEFAULT 0,
  savings INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual',
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

CREATE TABLE IF NOT EXISTS money_checkins (
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
);

CREATE INDEX IF NOT EXISTS idx_regulations_country_status ON regulations (country, verification_status, published_date DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_money_checkins_user ON money_checkins (user_id, created_at DESC);
