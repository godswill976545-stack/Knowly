# MonCheck — know your rights, grow your money

MonCheck turns Benin's laws and government news into plain-language explanations, and pairs
that with a simple personal-finance tracker (income, expenses, savings goals) in CFA.
UI available in French, English, Yoruba, and Fon (draft).

## Stack

- **Frontend**: React 19 + Vite + Tailwind, motion animations, hash-based tabs (`src/`)
- **Backend**: one Hono app in `server/app.js`
  - local dev: `@hono/node-server` on port 3001
  - production: Vercel serverless via the `api/[[...route]].js` catch-all
- **Database**: Neon Postgres (`@neondatabase/serverless`), schema in `db/*.sql`
- **Auth**: Clerk (email/password + Google OAuth); guests share a seeded demo user
- **AI**: Nous Research free models primary, Google Gemini key-pool fallback, with
  defensive JSON parsing and a graceful offline fallback (`server/app.js`)

## How the pieces fit

1. **Law library (RAG)** — `db/ingest.js` processes the Benin law PDFs in `laws/`:
   pdfjs text extraction with Tesseract OCR fallback (`db/ocr-worker.js`, French),
   chunking by `Article N°`, embeddings via `Xenova/multilingual-e5-small`, stored in
   `law_chunks` (pgvector + French tsvector). `/api/explain` retrieves relevant chunks
   (full-text search with synonym expansion) and grounds the AI answer in them.
2. **AI explainer** — `POST /api/explain` (text) and `POST /api/explain/upload`
   (PDF/image, OCR'd then streamed back word-by-word over SSE). Answers are strictly
   shaped JSON: plain explanation, why it matters, money link, checks, law sources,
   disclaimer.
3. **News/regs feed** — a daily Vercel cron (`/api/cron/fetch-news`, 06:00 UTC) scrapes
   the official sources in `news_sources` (gouv.bj, sgg.gouv.bj, …) and stores articles
   as **`unverified`**. Publish them with `scripts/approve-regulations.mjs` — users only
   ever see `verified` rows.
4. **Money** — financial profile, goals, daily logs (`/api/financial-profile`,
   `/api/goals`, `/api/daily-log`), voice entry via Web Speech API, and a rule-based
   advice engine (`src/lib/adviceEngine.js`).

## Commands

```bash
npm install
npm run db:migrate      # apply db/schema.sql + seed.sql + vector-schema.sql
npm run dev             # API on :3001 + Vite dev server (proxies /api)
npm run build           # production build to dist/
npm run lint            # oxlint

node db/ingest.js                  # ingest law PDFs (skips already-ingested)
node db/ingest.js --force          # re-ingest everything
node db/ingest.js --file=loi-2016-33.pdf --max-pages=5

node scripts/approve-regulations.mjs          # list scraped, unverified rows
node scripts/approve-regulations.mjs approve 42
node scripts/approve-regulations.mjs approve-all
```

## Environment

Copy `.env.example` to `.env` and fill in: `DATABASE_URL`, `CLERK_SECRET_KEY` +
`VITE_CLERK_PUBLISHABLE_KEY`, `NOUS_API_KEY`, and optionally `GOOGLE_API_KEYS` and
`CRON_SECRET`. Without `CLERK_SECRET_KEY` the API rejects presented session tokens
(guest/demo mode still works). In production also set `EXPOSE_PROVIDER_ERRORS=1`
temporarily to debug AI provider outages.

## Deployment (Vercel)

- Build: `npm run build`, output `dist/`; `/api/*` rewrites to the serverless function.
- Cron: `vercel.json` schedules `/api/cron/fetch-news` daily — set `CRON_SECRET` in the
  Vercel project so the endpoint only accepts Vercel's authenticated calls.
- `vercel.json` also sets baseline security headers (nosniff, referrer policy,
  frame denial, permissions policy).
