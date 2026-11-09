const ADVICE_RULES = [
  {
    id: 'no_goal',
    condition: (d) => !d.goal || !d.goal.target_amount,
    key: 'advice.noGoal',
    params: () => ({}),
  },
  {
    id: 'expenses_exceed_income',
    condition: (d) => d.expenses > d.income && d.income > 0,
    key: 'advice.expensesHigh',
    params: (d) => ({ amount: d.expenses - d.income }),
  },
  {
    id: 'goal_complete',
    condition: (d) => d.goal && d.goal.current_amount >= d.goal.target_amount && d.goal.target_amount > 0,
    key: 'advice.goalComplete',
    params: (d) => ({ goalName: d.goal.name }),
  },
  {
    id: 'goal_halfway',
    condition: (d) => {
      if (!d.goal || !d.goal.target_amount) return false
      const pct = d.goal.current_amount / d.goal.target_amount
      return pct >= 0.5 && pct < 1
    },
    key: 'advice.goalHalfway',
    params: (d) => ({
      pct: Math.round((d.goal.current_amount / d.goal.target_amount) * 100),
      goalName: d.goal.name,
    }),
  },
  {
    id: 'good_savings_rate',
    condition: (d) => {
      if (!d.income || d.income <= 0) return false
      const rate = (d.income - d.expenses) / d.income
      return rate >= 0.2 && d.income > d.expenses
    },
    key: 'advice.goodRate',
    params: (d) => ({
      amount: d.income - d.expenses,
      pct: Math.round(((d.income - d.expenses) / d.income) * 100),
    }),
  },
  {
    id: 'low_savings_rate',
    condition: (d) => {
      if (!d.income || d.income <= 0) return false
      const rate = (d.income - d.expenses) / d.income
      return rate > 0 && rate < 0.1 && d.income > d.expenses
    },
    key: 'advice.lowRate',
    params: (d) => ({
      amount: d.income - d.expenses,
      pct: Math.round(((d.income - d.expenses) / d.income) * 100),
    }),
  },
  {
    id: 'no_savings',
    condition: (d) => d.income > 0 && d.expenses >= d.income,
    key: 'advice.noSavings',
    params: () => ({}),
  },
  {
    id: 'default_encourage',
    condition: () => true,
    key: 'advice.keepGoing',
    params: (d) => ({
      amount: Math.max(d.income - d.expenses, 0),
    }),
  },
]

export function getAdvice(data) {
  const rule = ADVICE_RULES.find((r) => r.condition(data))
  return {
    key: rule.key,
    params: rule.params(data),
  }
}

const INCOME_KEYWORDS = ['salaire', 'gagné', 'gagne', 'gains', 'revenu', 'revenus', 'reçu', 'recu', 'reçus', 'encaissé', 'encaisse', 'virement', 'touché', 'touche', 'vente', 'vendu', 'entrée', 'entree']
const EXPENSE_KEYWORDS = ['dépensé', 'dépense', 'depense', 'dépenses', 'depenses', 'acheté', 'achete', 'achats', 'sorti', 'sortie', 'perdu', 'perte', 'facture', 'transport', 'manger', 'nourriture', 'carburant', 'loyer', 'taxi']

export function parseVoiceTranscript(transcript) {
  const lower = transcript.toLowerCase()

  const amountMatch = lower.match(/(\d[\d\s,.]*)\s*(?:francs?|f\s?cfa|cfa|fcfa)/)
  const amount = amountMatch ? Number(amountMatch[1].replace(/[\s,.]/g, '')) : null

  // Income checked first: "payé" alone is ambiguous, so only explicit
  // money-received verbs count as income; everything else expense-like.
  let type = null
  if (INCOME_KEYWORDS.some((k) => lower.includes(k))) type = 'income'
  else if (EXPENSE_KEYWORDS.some((k) => lower.includes(k))) type = 'expense'

  return { amount, type, raw: transcript }
}
