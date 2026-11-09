// Money + date helpers. Amounts are always stored as integers (XOF has no
// decimals) and displayed like "25 000 FCFA".

export function formatFCFA(amount) {
  const n = Number(amount || 0);
  const sign = n < 0 ? '-' : '';
  const digits = Math.abs(Math.round(n))
    .toLocaleString('fr-FR')
    // narrow no-break space → regular space, so "25 000 FCFA" copies cleanly
    .replace(/[\u202f\u00a0]/g, ' ');
  return `${sign}${digits} FCFA`;
}

export function formatDate(iso, locale = 'fr-FR') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateShort(iso, locale = 'fr-FR') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function currentMonthLabel(locale = 'fr-FR') {
  const now = new Date();
  const label = now.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function todayISO() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function monthKey(iso = todayISO()) {
  return iso.slice(0, 7); // "2026-11"
}

export function stripAccents(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days} jours`;
  return formatDate(iso);
}
