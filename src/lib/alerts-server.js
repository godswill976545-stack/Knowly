import { hasSupabase, supabaseAnon } from './supabase-server';
import bundled from './bundled-alerts.json';

const byDate = (a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0);

const bundledPublished = () => bundled.filter((a) => a.status === 'published');

/** Server-side: all published alerts, newest first. Used by API routes and the public share page. */
export async function getPublishedAlerts() {
  if (!hasSupabase) return [...bundledPublished()].sort(byDate);
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from('alerts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100);
  if (error) return [];
  return data || [];
}

/** Server-side: one published alert by id, or null. */
export async function getPublishedAlert(id) {
  if (!hasSupabase) return bundledPublished().find((a) => a.id === id) || null;
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from('alerts')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (error) return null;
  return data;
}
