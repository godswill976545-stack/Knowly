// Benin phone number normalization (10-digit plan since 30 Nov 2024, ARCEP).
//
// National numbers are "01" + the old 8-digit number. The international format
// is +229 01 XX XX XX XX (E.164: +22901XXXXXXXX), which is what the SMS
// provider (Twilio) expects.
//
// Accepted inputs:
//   "97 00 00 01"                 → 8 digits   → +2290197000001
//   "01 97 00 00 01"              → 10 digits  → +2290197000001
//   "+229 01 97 00 00 01"         → full E.164 → +2290197000001
//   "22997000001" / "00229 97..." → prefixed   → +2290197000001
//
// Mobile prefixes after "01" are 4, 5, 6 and 9 (fixed lines start with 2 and
// cannot receive SMS).

export function normalizeBeninPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('00229')) d = d.slice(5);
  else if (d.startsWith('229')) d = d.slice(3);
  if (d.length === 8) d = `01${d}`;
  if (!/^01[4569]\d{7}$/.test(d)) return { ok: false };
  return {
    ok: true,
    e164: `+229${d}`,
    national: d,
    display: `+229 ${d.replace(/(\d{2})(?=\d)/g, '$1 ')}`,
  };
}

export function isValidEmail(raw) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(raw || '').trim());
}
