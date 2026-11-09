// Shared app configuration. NEXT_PUBLIC_* values are inlined at build time;
// safe defaults (empty) mean the app runs in demo mode without a Supabase project.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://moncheck.vercel.app';
export const WHATSAPP_OTP_ENABLED = process.env.NEXT_PUBLIC_WHATSAPP_OTP_ENABLED === '1';

// Demo mode: no Supabase configured. The app then works with local data so it
// can be previewed locally; auth is simulated and everything is stored in
// localStorage.
export const IS_DEMO = !SUPABASE_URL;

export const SUPABASE_ANON_URL = `${SUPABASE_URL}/auth/v1`;
