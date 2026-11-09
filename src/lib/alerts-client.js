import { supabaseBrowser } from './supabase-client';
import { IS_DEMO } from './config';
import bundled from './bundled-alerts.json';

// Last 20 alerts are kept in localStorage so the alert list and details still
// open with no connection (see the offline requirement).
const LS_KEY = 'moncheck:alerts-cache';

const byDate = (a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0);

export function readAlertsCache() {
  try {
    const list = JSON.parse(localStorage.getItem(LS_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeAlertsCache(alerts) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(alerts.slice(0, 20)));
  } catch {
    // Storage full or private mode — offline cache is best-effort.
  }
}

/** All published alerts, newest first. Falls back to the local cache when the
 *  network fails, so alerts stay readable offline. */
export async function fetchPublishedAlerts() {
  if (IS_DEMO) return bundled.filter((a) => a.status === 'published').sort(byDate);
  const sb = supabaseBrowser();
  try {
    const { data, error } = await sb
      .from('alerts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(100);
    if (!error && data) {
      writeAlertsCache(data);
      return data;
    }
  } catch {
    // network error → cache below
  }
  return readAlertsCache().sort(byDate);
}

/** One published alert by id (server list, then cache). */
export async function fetchAlertById(id) {
  if (IS_DEMO) return bundled.find((a) => a.id === id && a.status === 'published') || null;
  const sb = supabaseBrowser();
  try {
    const { data } = await sb
      .from('alerts')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle();
    if (data) return data;
  } catch {
    // fall through to cache
  }
  return readAlertsCache().find((a) => a.id === id) || null;
}

export function whatsappShareUrl(alert) {
  const message = `${alert.title}\n${alert.summary}\n${alertPageUrl(alert)}\nVia MonCheck`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function alertPageUrl(alert) {
  // Client builds the public page URL with the app base URL.
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://moncheck.vercel.app';
  return `${base}/alerte/${alert.id}`;
}
