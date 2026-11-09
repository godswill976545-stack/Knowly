import { supabaseBrowser } from './supabase-client';
import { IS_DEMO } from './config';

const LS_DEMO = 'moncheck:demo-budget';
const LS_QUEUE = 'moncheck:budget-queue';

// ── storage helpers ─────────────────────────────────────────────────────────

function demoEntries() {
  try {
    return JSON.parse(localStorage.getItem(LS_DEMO)) || [];
  } catch {
    return [];
  }
}
function saveDemoEntries(list) {
  localStorage.setItem(LS_DEMO, JSON.stringify(list));
}

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(LS_QUEUE)) || { create: [], update: [], del: [] };
  } catch {
    return { create: [], update: [], del: [] };
  }
}
function writeQueue(q) {
  localStorage.setItem(LS_QUEUE, JSON.stringify(q));
}

// ── public API ──────────────────────────────────────────────────────────────

/** Entries for a month ("2026-11"), newest first, plus the offline queue for
 *  that month (offline adds stay visible immediately). */
export async function listMonth(yearMonth) {
  const start = `${yearMonth}-01`;
  const next = nextMonthStart(yearMonth);
  const inMonth = (e) => e.date >= start && e.date < next;

  if (IS_DEMO) {
    return demoEntries().filter(inMonth).sort((a, b) => (b.date + (b.created_at || '')).localeCompare(a.date + (a.created_at || '')));
  }

  const queued = readQueue().create
    .map((item) => ({ ...item.entry, id: item.tmpId, _offline: true }))
    .filter(inMonth);

  const sb = supabaseBrowser();
  try {
    const { data, error } = await sb
      .from('budget_entries')
      .select('*')
      .gte('date', start)
      .lt('date', next)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && data) return [...queued, ...data];
  } catch {
    // offline → queued entries only
  }
  return queued;
}

export async function addEntry(entry) {
  const row = { ...entry, id: `tmp-${Date.now()}-${Math.floor(Math.random() * 1e6)}` };
  if (IS_DEMO) {
    saveDemoEntries([row, ...demoEntries()]);
    return { ok: true, entry: row };
  }
  if (navigator.onLine) {
    const { data, error } = await supabaseBrowser()
      .from('budget_entries')
      .insert({ type: entry.type, category: entry.category, amount_xof: entry.amount_xof, date: entry.date, note: entry.note })
      .select()
      .single();
    if (!error && data) return { ok: true, entry: data };
  }
  // Offline (or failed): keep it locally, sync later.
  const q = readQueue();
  q.create.push({ tmpId: row.id, entry: { type: entry.type, category: entry.category, amount_xof: entry.amount_xof, date: entry.date, note: entry.note } });
  writeQueue(q);
  return { ok: true, entry: row, offline: true };
}

export async function updateEntry(id, patch) {
  if (IS_DEMO) {
    saveDemoEntries(demoEntries().map((e) => (e.id === id ? { ...e, ...patch } : e)));
    return { ok: true };
  }
  if (String(id).startsWith('tmp-')) {
    const q = readQueue();
    q.create = q.create.map((item) => (item.tmpId === id ? { ...item, entry: { ...item.entry, ...patch } } : item));
    writeQueue(q);
    return { ok: true };
  }
  if (navigator.onLine) {
    const { error } = await supabaseBrowser()
      .from('budget_entries')
      .update({ type: patch.type, category: patch.category, amount_xof: patch.amount_xof, date: patch.date, note: patch.note })
      .eq('id', id);
    if (!error) return { ok: true };
  }
  const q = readQueue();
  q.update.push({ id, patch });
  writeQueue(q);
  return { ok: true, offline: true };
}

export async function deleteEntry(id) {
  if (IS_DEMO) {
    saveDemoEntries(demoEntries().filter((e) => e.id !== id));
    return { ok: true };
  }
  if (String(id).startsWith('tmp-')) {
    const q = readQueue();
    q.create = q.create.filter((item) => item.tmpId !== id);
    writeQueue(q);
    return { ok: true };
  }
  if (navigator.onLine) {
    const { error } = await supabaseBrowser().from('budget_entries').delete().eq('id', id);
    if (!error) return { ok: true };
  }
  const q = readQueue();
  q.del.push(id);
  writeQueue(q);
  return { ok: true, offline: true };
}

export function queuedCount() {
  const q = readQueue();
  return q.create.length + q.update.length + q.del.length;
}

/** Pushes queued offline changes to the server. Returns the number synced.
 *  Called when the connection comes back. */
export async function flushQueue() {
  if (IS_DEMO || !navigator.onLine) return 0;
  const q = readQueue();
  const total = q.create.length + q.update.length + q.del.length;
  if (!total) return 0;

  const sb = supabaseBrowser();
  const { data: session } = await sb.auth.getSession();
  if (!session?.session) return 0; // not signed in yet — keep the queue

  let synced = 0;
  const leftoverCreate = [];

  for (const item of q.create) {
    const { data, error } = await sb
      .from('budget_entries')
      .insert(item.entry)
      .select()
      .single();
    if (!error && data) {
      synced += 1;
      // Re-point queued updates that targeted the temporary id.
      q.update = q.update.map((u) => (u.id === item.tmpId ? { ...u, id: data.id } : u));
    } else {
      leftoverCreate.push(item);
    }
  }
  for (const u of q.update) {
    const { error } = await sb.from('budget_entries').update(u.patch).eq('id', u.id);
    if (!error) synced += 1;
  }
  for (const id of q.del) {
    const { error } = await sb.from('budget_entries').delete().eq('id', id);
    if (!error) synced += 1;
  }

  writeQueue({ create: leftoverCreate, update: [], del: [] });
  return synced;
}

function nextMonthStart(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-01`;
}
