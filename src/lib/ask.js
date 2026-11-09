import { stripAccents } from './format';

// The /api/ask matcher: answers only come from the stored official alerts.
// Simple keyword scoring over title + summary + who + keywords + category.

const STOP_WORDS = new Set([
  'que', 'qui', 'quoi', 'quel', 'quelle', 'quels', 'quelles', 'comment', 'pourquoi',
  'quand', 'est', 'sont', 'les', 'des', 'une', 'un', 'le', 'la', 'mon', 'ma', 'mes',
  'sur', 'dans', 'avec', 'pour', 'par', 'chez', 'aux', 'au', 'du', 'de', 'et', 'ou',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'ce', 'cette', 'ces',
  'plus', 'moins', 'payer', 'paye', 'paie', 'dois', 'doit', 'frais', 'combien',
]);

export function tokenize(text) {
  return stripAccents(text)
    .split(/[^a-z0-9à-ÿ]+/i)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(stripAccents(w).toLowerCase()));
}

/** Returns up to 3 matching alerts with scores, best first. */
export function matchAlerts(question, alerts) {
  const words = tokenize(question);
  if (!words.length || !alerts.length) return [];

  const scored = alerts
    .map((a) => {
      const hay = stripAccents(
        [a.title, a.summary, a.who, a.keywords || '', a.category || ''].join(' ')
      );
      let score = 0;
      for (const w of words) {
        if (hay.includes(stripAccents(w).toLowerCase())) score += w.length >= 6 ? 3 : 2;
      }
      return { alert: a, score };
    })
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);

  return scored;
}

/** Composes the French answer from the matched alerts (always cites sources). */
export function composeAnswer(question, matches) {
  if (!matches.length) {
    return {
      answer:
        "Je n'ai pas trouvé de source officielle dans MonCheck pour cette question. " +
        'Je préfère ne pas deviner. Essayez avec d\'autres mots, ou regardez la liste des alertes.',
      sources: [],
    };
  }

  const lines = matches.map(
    (m) => `• ${m.alert.title} : ${m.alert.summary} (${m.alert.source_name})`
  );
  const answer = `Voici ce que disent les sources officielles enregistrées dans MonCheck :\n\n${lines.join(
    '\n\n'
  )}`;

  return {
    answer,
    sources: matches.map((m) => ({
      id: m.alert.id,
      title: m.alert.title,
      source_name: m.alert.source_name,
      source_url: m.alert.source_url,
    })),
  };
}
