CREATE TABLE IF NOT EXISTS news_sources (
  id SERIAL PRIMARY KEY,
  source_name TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  fetch_method TEXT NOT NULL DEFAULT 'html',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_fetched TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO news_sources (source_name, url, category, fetch_method) VALUES
  ('Présidence du Bénin', 'https://presidence.bj', 'Government', 'html'),
  ('Gouvernement du Bénin', 'https://gouv.bj', 'Government', 'html'),
  ('Direction Générale des Impôts', 'https://impots.bj', 'Taxes', 'html'),
  ('Secrétariat Général du Gouvernement', 'https://sgg.gouv.bj', 'Legal', 'html'),
  ('APIEx Bénin', 'https://investir.bj', 'Business', 'html')
ON CONFLICT (source_name) DO NOTHING;
