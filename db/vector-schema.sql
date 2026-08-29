CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL UNIQUE,
  law_title TEXT NOT NULL,
  law_ref TEXT,
  pages INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  ocr_pages INTEGER NOT NULL DEFAULT 0,
  ingested_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS law_chunks (
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
);

CREATE INDEX IF NOT EXISTS idx_law_chunks_tsv ON law_chunks USING gin (content_tsv);
CREATE INDEX IF NOT EXISTS idx_law_chunks_embedding ON law_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_law_chunks_doc ON law_chunks (document_id);
