INSERT INTO users (id, name, email, country, language)
VALUES (1, 'Grace', 'grace@example.bj', 'benin', 'fr')
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));

INSERT INTO user_preferences (user_id, topics, language)
VALUES (1, ARRAY['Money', 'Taxes', 'Business'], 'fr')
ON CONFLICT (user_id) DO UPDATE SET topics = EXCLUDED.topics;

INSERT INTO financial_profiles (user_id, monthly_income, monthly_expenses, savings, currency)
VALUES (1, 250000, 180000, 30000, 'CFA')
ON CONFLICT (user_id) DO UPDATE
SET monthly_income = EXCLUDED.monthly_income,
    monthly_expenses = EXCLUDED.monthly_expenses,
    savings = EXCLUDED.savings,
    updated_at = now();

INSERT INTO goals (user_id, name, category, target_amount, current_amount)
SELECT 1, 'New Laptop', 'Tech', 500000, 210000
WHERE NOT EXISTS (SELECT 1 FROM goals WHERE user_id = 1 AND name = 'New Laptop');

INSERT INTO regulations (title, summary, category, severity, source_name, published_date, effective_date)
SELECT * FROM (VALUES
  (
    'New Tax Rule for Small Businesses',
    'Changes to deductible expenses take effect for businesses with annual revenue under 10M CFA. Review how this impacts your current filings.',
    'Taxes',
    'critical',
    'Direction Générale des Impôts',
    DATE '2026-08-20',
    'September 1, 2026'
  ),
  (
    'Employment Contract Rules Updated',
    'Updated rules for fixed-term contracts and worker protections change notice periods and renewal limits.',
    'Employment',
    'standard',
    'Ministry of Labour',
    DATE '2026-08-18',
    'October 15, 2026'
  ),
  (
    'New Support Program for Entrepreneurs',
    'A new registration window opens for small business support grants. Applications close at the end of November.',
    'Business',
    'info',
    'Ministry of Commerce',
    DATE '2026-08-22',
    'Deadline November 30, 2026'
  )
) AS new_rows (title, summary, category, severity, source_name, published_date, effective_date)
WHERE NOT EXISTS (SELECT 1 FROM regulations WHERE title = new_rows.title);
