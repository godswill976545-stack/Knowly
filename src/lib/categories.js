// Budget categories for Benin. One list serves both income and expense.
export const CATEGORIES = [
  { id: 'loyer', emoji: '🏠', key: 'cat.loyer' },
  { id: 'transport', emoji: '🏍️', key: 'cat.transport' },
  { id: 'nourriture', emoji: '🍚', key: 'cat.nourriture' },
  { id: 'electricite', emoji: '💡', key: 'cat.electricite' },
  { id: 'eau', emoji: '🚰', key: 'cat.eau' },
  { id: 'credit', emoji: '📱', key: 'cat.credit' },
  { id: 'scolarite', emoji: '🎓', key: 'cat.scolarite' },
  { id: 'tontine', emoji: '🤝', key: 'cat.tontine' },
  { id: 'mobilemoney', emoji: '💸', key: 'cat.mobilemoney' },
  { id: 'sante', emoji: '🏥', key: 'cat.sante' },
  { id: 'autre', emoji: '📦', key: 'cat.autre' },
];

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
