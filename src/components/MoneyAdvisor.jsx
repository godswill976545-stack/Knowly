import { useEffect, useState } from 'react'
import { api } from '../api.js'

const FEELINGS = [
  { v: 'calm', fr: 'Calme, je maîtrise', en: 'Calm, in control' },
  { v: 'ok', fr: 'Semaine normale', en: 'Normal week' },
  { v: 'tight', fr: 'Un peu serré', en: 'A bit tight' },
  { v: 'stressed', fr: 'Stressé, trop dépensé', en: 'Stressed, overspent' },
]

const fieldCls = 'w-full rounded-full border border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10'
const labelCls = 'mb-1.5 block text-caption font-semibold text-on-surface'
const kickerCls = 'text-caption font-bold uppercase tracking-[0.08em] text-primary'

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
)

export default function MoneyAdvisor({ t, lang }) {
  const tr = t || ((k) => k)
  const [form, setForm] = useState({
    type: 'weekly', currency: 'FCFA', income: '', needs: '', wants: '', debt: '',
    feeling: 'calm', savingsGoalPct: '10', regret: '',
  })
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [speaking, setSpeaking] = useState(false)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    let alive = true
    api.checkins().then((rows) => { if (alive && Array.isArray(rows)) setHistory(rows) }).catch(() => {})
    return () => {
      alive = false
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const income = Number(form.income)
    if (!Number.isFinite(income) || income <= 0) {
      setError(tr('money.aiIncomeRequired'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const feeling = FEELINGS.find((f) => f.v === form.feeling)
      const res = await api.createCheckin({
        type: form.type,
        currency: form.currency,
        income,
        needs: Number(form.needs) || 0,
        wants: Number(form.wants) || 0,
        debt: Number(form.debt) || 0,
        feeling: feeling ? feeling[lang === 'en' ? 'en' : 'fr'] : form.feeling,
        savingsGoalPct: Number(form.savingsGoalPct) || 0,
        regret: form.regret || undefined,
        lang,
      })
      setResult(res)
      setHistory((h) => [{
        id: res.id, type: form.type, currency: form.currency, income, outcome: res.outcome,
        created_at: new Date().toISOString(),
      }, ...h].slice(0, 12))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fmtDate = (v) => {
    if (!v) return ''
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR')
  }

  const speakSays = () => {
    if (!canSpeak || !result) return
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    const voiceLang = { en: 'en-US', fr: 'fr-FR', yo: 'yo-NG', fon: 'fr-FR' }[lang] || 'fr-FR'
    const u = new SpeechSynthesisUtterance(result.says.join(' '))
    u.lang = voiceLang
    u.rate = 0.95
    try {
      const base = voiceLang.split('-')[0]
      const voices = synth.getVoices()
      const voice = voices.find((v) => v.lang === voiceLang) || voices.find((v) => v.lang && v.lang.startsWith(base))
      if (voice) u.voice = voice
    } catch {}
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    synth.cancel()
    synth.speak(u)
    setSpeaking(true)
  }

  const planKicker = form.type === 'daily' ? tr('money.aiPlanDaily') : form.type === 'monthly' ? tr('money.aiPlanMonthly') : tr('money.aiPlanWeekly')

  const planRows = result ? [
    [tr('money.planNeeds'), result.plan?.needs],
    [tr('money.planDebt'), result.plan?.debt],
    [tr('money.planWants'), result.plan?.wants],
    [tr('money.planSave'), result.plan?.save],
  ] : []

  return (
    <section className="rounded-[16px] border border-outline-variant bg-white p-5 md:p-6">
      <h2 className="text-[26px] font-bold tracking-[-0.02em] text-on-surface">
        {tr('money.aiHey')} <span className="text-primary">{tr('money.aiName')}</span>
      </h2>
      <p className="mt-1.5 max-w-[56ch] text-body-md leading-relaxed text-on-surface-variant">{tr('money.aiSub')}</p>

      {!result ? (
        <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mc-type" className={labelCls}>{tr('money.checkinType')}</label>
            <select id="mc-type" value={form.type} onChange={set('type')} className={fieldCls}>
              <option value="daily">{tr('money.typeDaily')}</option>
              <option value="weekly">{tr('money.typeWeekly')}</option>
              <option value="monthly">{tr('money.typeMonthly')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="mc-currency" className={labelCls}>{tr('money.currency')}</label>
            <select id="mc-currency" value={form.currency} onChange={set('currency')} className={fieldCls}>
              <option value="FCFA">FCFA</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="mc-income" className={labelCls}>{tr('money.aiIncome')}</label>
            <input id="mc-income" type="number" min="0" inputMode="numeric" value={form.income} onChange={set('income')} className={fieldCls} />
          </div>
          <div>
            <label htmlFor="mc-needs" className={labelCls}>{tr('money.aiNeeds')}</label>
            <input id="mc-needs" type="number" min="0" inputMode="numeric" value={form.needs} onChange={set('needs')} className={fieldCls} />
          </div>
          <div>
            <label htmlFor="mc-wants" className={labelCls}>{tr('money.aiWants')}</label>
            <input id="mc-wants" type="number" min="0" inputMode="numeric" value={form.wants} onChange={set('wants')} className={fieldCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="mc-debt" className={labelCls}>{tr('money.aiDebt')}</label>
            <input id="mc-debt" type="number" min="0" inputMode="numeric" value={form.debt} onChange={set('debt')} className={fieldCls} />
          </div>
          <div>
            <label htmlFor="mc-feeling" className={labelCls}>{tr('money.aiFeeling')}</label>
            <select id="mc-feeling" value={form.feeling} onChange={set('feeling')} className={fieldCls}>
              {FEELINGS.map((f) => (
                <option key={f.v} value={f.v}>{lang === 'en' ? f.en : f.fr}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mc-goal" className={labelCls}>{tr('money.aiGoalPct')}</label>
            <input id="mc-goal" type="number" min="0" max="90" inputMode="numeric" value={form.savingsGoalPct} onChange={set('savingsGoalPct')} className={fieldCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="mc-regret" className={labelCls}>{tr('money.aiRegret')}</label>
            <input id="mc-regret" type="text" maxLength={200} value={form.regret} onChange={set('regret')} placeholder={tr('money.aiRegretPh')} className={fieldCls} />
          </div>
          {error && <p role="alert" className="text-caption font-semibold text-error sm:col-span-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className={`btn-duo btn-duo--primary w-full justify-center px-6 py-3.5 text-label-md disabled:opacity-60 sm:col-span-2 ${loading ? 'btn-loading-sweep' : ''}`}
          >
            {loading ? (
              <>
                <span role="status" aria-live="polite" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {tr('money.aiThinking')}
              </>
            ) : (
              <>{tr('money.aiCta')} </>
            )}
          </button>
        </form>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-[12px] border border-outline-variant bg-surface-container-low p-5">
            <p className={kickerCls}>{tr('money.aiSaysKicker')}</p>
            <div className="mt-3 space-y-3">
              {result.says.map((p, i) => (
                <p key={i} className="text-body-md leading-relaxed text-on-surface">{p}</p>
              ))}
            </div>
            {canSpeak && (
              <button type="button" onClick={speakSays} className="btn-duo btn-duo--white mt-3 px-4 py-2 text-caption">
                <Icon name={speaking ? 'stop' : 'volume_up'} className="text-[16px]" /> {speaking ? tr('money.aiStop') : tr('money.aiListen')}
              </button>
            )}
          </div>
          <div className="rounded-[12px] border border-outline-variant bg-surface-container-low p-5">
            <p className={kickerCls}>{planKicker}</p>
            <div className="mt-3 space-y-2">
              {planRows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-outline-variant/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-body-md text-on-surface-variant">{label}</span>
                  <span className="text-body-md font-bold text-on-surface">{Number(value ?? 0).toLocaleString('fr-FR')} {form.currency}</span>
                </div>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setResult(null)} className="btn-duo btn-duo--white w-full justify-center px-6 py-3.5 text-label-md">
            {tr('money.aiNewCheckin')}
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-5 rounded-[12px] border border-outline-variant bg-surface-container-low p-5">
          <p className={kickerCls}>{tr('money.aiHistoryKicker')}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {history.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="text-caption text-on-surface-variant">{fmtDate(row.created_at)}</span>
                <span className="text-caption font-semibold text-on-surface">{row.outcome}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
