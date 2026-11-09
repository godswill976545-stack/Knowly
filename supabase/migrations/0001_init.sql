-- ============================================================================
-- MonCheck — initial migration
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query), or with
-- `supabase db push`. It is idempotent.
--
-- Tables:
--   profiles            one row per auth user (created by trigger on signup)
--   alerts              regulatory alerts; only `published` rows are public
--   alert_explanations  plain-French AI explanations, cached once per alert
--   budget_entries      user budget lines in XOF (integers)
--   question_logs       used for the per-user rate limit on /api/ask
-- ============================================================================

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  phone text unique,
  email text,
  language text not null default 'fr',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Create a profile automatically when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, phone, email)
  values (new.id, new.phone, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users created before this migration.
insert into public.profiles (id, phone, email)
select id, phone, email from auth.users
on conflict (id) do nothing;

-- ── alerts ──────────────────────────────────────────────────────────────────
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,           -- one plain-language sentence
  body text not null default '',   -- full plain-language explanation
  category text not null check (category in (
    'impots', 'banque_mobile_money', 'travail', 'commerce', 'autre'
  )),
  who text not null default '',    -- "Qui est concerné ?"
  what_to_do text not null default '',
  keywords text not null default '',  -- space-separated words used by /api/ask
  source_name text not null,
  source_url text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alerts enable row level security;

-- Everyone (signed in or not) can read published alerts.
drop policy if exists "alerts_select_published" on public.alerts;
create policy "alerts_select_published" on public.alerts
  for select using (status = 'published');

-- Administrators can read, edit and publish drafts.
drop policy if exists "alerts_admin_select" on public.alerts;
create policy "alerts_admin_select" on public.alerts
  for select using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  ));

drop policy if exists "alerts_admin_insert" on public.alerts;
create policy "alerts_admin_insert" on public.alerts
  for insert with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  ));

drop policy if exists "alerts_admin_update" on public.alerts;
create policy "alerts_admin_update" on public.alerts
  for update using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  )) with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  ));

create index if not exists idx_alerts_status_published
  on public.alerts (published_at desc) where status = 'published';

-- ── alert_explanations (AI cache) ───────────────────────────────────────────
create table if not exists public.alert_explanations (
  alert_id uuid primary key references public.alerts (id) on delete cascade,
  explanation text not null,
  model text,
  created_at timestamptz not null default now()
);

alter table public.alert_explanations enable row level security;

-- Explanations are public text, safe to read. Writes happen only from the
-- server route using the service-role key (which bypasses RLS).
drop policy if exists "alert_explanations_select" on public.alert_explanations;
create policy "alert_explanations_select" on public.alert_explanations
  for select using (true);

-- ── budget_entries ──────────────────────────────────────────────────────────
create table if not exists public.budget_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('revenu', 'depense')),
  category text not null,
  amount_xof integer not null check (amount_xof > 0),  -- integer FCFA
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

alter table public.budget_entries enable row level security;

drop policy if exists "budget_entries_own" on public.budget_entries;
create policy "budget_entries_own" on public.budget_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_budget_entries_user_date
  on public.budget_entries (user_id, date desc);

-- ── question_logs (rate limit + audit) ──────────────────────────────────────
create table if not exists public.question_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  created_at timestamptz not null default now()
);

alter table public.question_logs enable row level security;

-- Users may only see their own logs. Inserts happen from the server route
-- with the service-role key.
drop policy if exists "question_logs_select_own" on public.question_logs;
create policy "question_logs_select_own" on public.question_logs
  for select using (auth.uid() = user_id);

create index if not exists idx_question_logs_user_time
  on public.question_logs (user_id, created_at desc);

-- ── helpers ─────────────────────────────────────────────────────────────────
-- Make an existing user an administrator:
--   update public.profiles set is_admin = true where phone = '+22901XXXXXXXX';
