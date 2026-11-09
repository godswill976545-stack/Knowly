'use client';

import { supabaseBrowser } from './supabase-client';
import { IS_DEMO } from './config';

// Demo-mode session/profile (local preview without Supabase).
const LS_USER = 'moncheck:demo-user';

export function demoLogin(identifier, kind) {
  const user = { identifier, kind, name: '' };
  localStorage.setItem(LS_USER, JSON.stringify(user));
  return user;
}
export function demoUser() {
  try {
    return JSON.parse(localStorage.getItem(LS_USER));
  } catch {
    return null;
  }
}
export function demoLogout() {
  localStorage.removeItem(LS_USER);
}

/** Current user profile: { id, first_name, phone, email }. Null when signed out. */
export async function getProfile() {
  if (IS_DEMO) return demoUser();
  const sb = supabaseBrowser();
  const { data } = await sb.auth.getUser();
  const user = data?.user;
  if (!user) return null;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return {
    id: user.id,
    first_name: profile?.first_name || '',
    phone: profile?.phone || user.phone || '',
    email: profile?.email || user.email || '',
  };
}

/** Saves the optional first name (one-time welcome on first login). */
export async function saveFirstName(name) {
  if (IS_DEMO) {
    const u = demoUser() || {};
    u.name = name;
    localStorage.setItem(LS_USER, JSON.stringify(u));
    return { ok: true };
  }
  const sb = supabaseBrowser();
  const { data } = await sb.auth.getUser();
  const user = data?.user;
  if (!user) return { ok: false };
  const { error } = await sb.from('profiles').update({ first_name: name }).eq('id', user.id);
  return { ok: !error };
}
