// Server-side AI helpers. If GOOGLE_API_KEY is not set, callers fall back to
// the plain-French text already stored on each alert, so the feature always
// works even without a key.

const MODEL = 'gemini-2.0-flash';

export async function generateExplanation(alert) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return null;

  const prompt = [
    "Tu écris pour MonCheck, une application du Bénin qui explique les règles officielles en français très simple.",
    "Explique l'alerte ci-dessous en 4 à 6 phrases courtes. Utilise des mots de tous les jours, sans jargon, sans numéro d'article.",
    "Commence par « En clair : » et termine par ce que la personne doit faire.",
    '',
    `Titre : ${alert.title}`,
    `Résumé : ${alert.summary}`,
    `Qui est concerné : ${alert.who}`,
    `Ce qu'il faut faire : ${alert.what_to_do}`,
    '',
    'Réponds uniquement avec le texte de l’explication, sans titre, sans liste.',
  ].join('\n');

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 350 },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text = (json?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text)
      .join('')
      .trim();
    if (!text) return null;
    return { explanation: text, model: MODEL };
  } catch {
    return null;
  }
}

/** Plain-French fallback built from the alert text itself (always available). */
export function templateExplanation(alert) {
  const parts = [];
  if (alert.body) parts.push(alert.body);
  if (alert.what_to_do) parts.push(alert.what_to_do);
  return parts.join(' ') || alert.summary;
}
