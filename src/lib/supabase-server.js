import { createServerClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const hasSupabase = Boolean(URL && ANON);

/** Server client bound to the request cookies (user-scoped, RLS applies). */
export function supabaseServer(cookieStore) {
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookies) => {
        try {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Cookie writes fail when the store is read-only (server components).
          // Session refresh is handled by middleware, so this is safe to ignore.
        }
      },
    },
  });
}

/** Service-role client for trusted server work (bypasses RLS). Never expose. */
export function supabaseAdmin() {
  if (!URL || !SERVICE) return null;
  return createServerClient(URL, SERVICE, { cookies: { getAll: () => [], setAll: () => {} } });
}

/** Anon client for public server-side reads (no user session needed). */
export function supabaseAnon() {
  return createServerClient(URL, ANON, { cookies: { getAll: () => [], setAll: () => {} } });
}
