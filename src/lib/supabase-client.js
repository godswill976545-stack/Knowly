'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

let client = null;

/** Browser Supabase client (singleton). Returns null in demo mode. */
export function supabaseBrowser() {
  if (!SUPABASE_URL) return null;
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
