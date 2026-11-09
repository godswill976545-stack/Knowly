import { useState } from 'react'
import { motion } from 'motion/react'

const GOALS = [
  { id: 'school', emoji: '🎓', labelKey: 'goal.school' },
  { id: 'tabaski', emoji: '🐐', labelKey: 'goal.tabaski' },
  { id: 'sewing', emoji: '🧵', labelKey: 'goal.sewing' },
  { id: 'motorcycle', emoji: '🛵', labelKey: 'goal.motorcycle' },
  { id: 'rent', emoji: '🏠', labelKey: 'goal.rent' },
  { id: 'business', emoji: '📦', labelKey: 'goal.business' },
]

export default function GoalPicker({ onSelect, t }) {
  const [selected, setSelected] = useState(null)
  const [amount, setAmount] = useState('')

  const handleSelect = (goal) => {
    setSelected(goal)
  }

  const handleSubmit = () => {
    if (!selected || !amount) return
    onSelect({
      name: t(selected.labelKey),
      emoji: selected.emoji,
      target_amount: Number(amount),
      category: 'general',
    })
    setSelected(null)
    setAmount('')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {GOALS.map((goal) => (
          <motion.button
            key={goal.id}
            onClick={() => handleSelect(goal)}
            whileTap={{ scale: 0.95 }}
            className={`flex flex-col items-center gap-2 rounded-[16px] border-2 p-4 transition ${
              selected?.id === goal.id
                ? 'border-secondary bg-secondary-container shadow-sm'
                : 'border-outline-variant bg-white hover:border-secondary/40'
            }`}
          >
            <span className="text-[40px]">{goal.emoji}</span>
            <span className="text-caption font-medium text-on-surface">{t(goal.labelKey)}</span>
          </motion.button>
        ))}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-[16px] border border-outline-variant bg-white p-4"
        >
          <label className="block text-label-md font-semibold text-on-surface">
            How much do you need? (CFA)
          </label>
          <input
            type="number"
            min="0"
            step="500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 50000"
            className="w-full rounded-full border border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          <button
            onClick={handleSubmit}
            disabled={!amount || Number(amount) <= 0}
            className="btn-duo btn-duo--primary w-full px-4 py-3 text-label-md disabled:opacity-50"
          >
            Set Goal
          </button>
        </motion.div>
      )}
    </div>
  )
}
