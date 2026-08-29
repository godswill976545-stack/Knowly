import { useCallback, useEffect, useState } from 'react'
import { SignedIn, SignedOut, SignIn, SignUp, UserButton, useUser } from '@clerk/clerk-react'
import { motion, useReducedMotion } from 'motion/react'
import { api, formatDate } from './api.js'
import { LANGUAGES, translate } from './i18n/index.js'
import Landing from './components/Landing.jsx'
import AuthScreen from './components/Auth.jsx'

const CLERK_ACTIVE = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

const clerkAppearance = {
  variables: {
    fontFamily: "'Inter', system-ui, sans-serif",
    colorPrimary: '#131b2e',
    colorBackground: '#ffffff',
    colorText: '#0b1c30',
    borderRadius: '0.75rem',
  },
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

function AuthScreen() {
  const hash = useHashRoute()
  const isSignUp = hash.includes('sign-up')
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="flex flex-col justify-between bg-primary p-8 text-white md:w-[42%] md:p-12">
        <div>
          <div className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary">
              <Icon name="gavel" className="text-[18px]" />
            </div>
            <span className="text-[18px] font-bold tracking-tight">Knowly</span>
          </div>
          <p className="mt-2 text-body-md text-white/70">Guide juridique & financier — Bénin</p>
          <div className="mt-10 space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"><Icon name="gavel" className="text-[16px]" /></span>
              <p className="text-body-md leading-relaxed text-white/90">Comprenez les règles qui vous concernent, sans jargon.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"><Icon name="savings" className="text-[16px]" /></span>
              <p className="text-body-md leading-relaxed text-white/90">Gérez et faites fructifier votre argent, en CFA.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"><Icon name="verified" className="text-[16px]" /></span>
              <p className="text-body-md leading-relaxed text-white/90">Un seul endroit, sources officielles vérifiées.</p>
            </div>
          </div>
        </div>
        <p className="text-caption leading-relaxed text-white/60">
          Sécurité juridique Knowly : ceci est un guide, pas un avis juridique. Vérifiez les décisions importantes auprès de l'autorité compétente.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-surface p-6 md:p-10">
        <div className="w-full max-w-md">
          {isSignUp ? (
            <SignUp routing="virtual" signInUrl="#/sign-in" fallbackRedirectUrl="/" appearance={clerkAppearance} />
          ) : (
            <SignIn routing="virtual" signUpUrl="#/sign-up" fallbackRedirectUrl="/" appearance={clerkAppearance} />
          )}
          <button
            onClick={() => (window.location.hash = '')}
            className="mx-auto mt-4 flex items-center gap-1 text-caption text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="arrow_back" className="text-[14px]" /> Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  )
}

function SignedOutLanding({ t }) {
  const hash = useHashRoute()
  const isAuth = hash.includes('sign-in') || hash.includes('sign-up')
  if (isAuth) return <AuthScreen t={t} />
  return <Landing onSignIn={() => (window.location.hash = '#/sign-in')} />
}

function UserBadge() {
  if (!CLERK_ACTIVE) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high">
          <Icon name="person" className="text-[18px] text-on-surface-variant" />
        </div>
        <span className="text-label-md font-medium text-on-surface">Grace</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <UserButton afterSignOutUrl="/" />
      <ClerkUserName />
    </div>
  )
}

function ClerkUserName() {
  const { user } = useUser()
  return <span className="text-label-md font-medium text-on-surface">{user?.firstName ?? user?.username ?? 'Mon compte'}</span>
}

function TopBarUser() {
  if (!CLERK_ACTIVE) return <Icon name="account_circle" className="text-[22px]" />
  return <UserButton afterSignOutUrl="/" />
}

function Greeting({ t }) {
  if (!CLERK_ACTIVE) return <>{t('home.greeting', { name: 'Grace' })}</>
  return <ClerkGreeting t={t} />
}

function ClerkGreeting({ t }) {
  const { user } = useUser()
  const name = user?.firstName || user?.username || (user?.fullName ? user.fullName.split(' ')[0] : null) || 'there'
  return <>{t('home.greeting', { name })}</>
}

const Icon = ({ name, className = '', fill = false }) => (
  <span className={`material-symbols-outlined ${fill ? 'ms-fill' : ''} ${className}`}>{name}</span>
)

const NAV_ITEMS = [
  { id: 'home', key: 'nav.home', icon: 'home' },
  { id: 'alerts', key: 'nav.alerts', icon: 'notifications' },
  { id: 'money', key: 'nav.money', icon: 'payments' },
  { id: 'ai', key: 'nav.ai', icon: 'smart_toy' },
  { id: 'profile', key: 'nav.profile', icon: 'person' },
]

const INTEREST_OPTIONS = ['Money', 'Taxes', 'Employment', 'Business', 'Banking', 'Transport', 'Housing', 'Education']

const LIBRARY = [
  { icon: 'health_and_safety', titleKey: 'lib.emergency.title', descKey: 'lib.emergency.desc', read: 3 },
  { icon: 'pie_chart', titleKey: 'lib.budgeting.title', descKey: 'lib.budgeting.desc', read: 5 },
  { icon: 'trending_up', titleKey: 'lib.inflation.title', descKey: 'lib.inflation.desc', read: 4 },
  { icon: 'show_chart', titleKey: 'lib.compound.title', descKey: 'lib.compound.desc', read: 6 },
]

const fmt = (n) => Number(n ?? 0).toLocaleString()

function ErrorBanner({ message, onRetry, t }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-outline-variant border-l-4 border-l-error bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Icon name="error" className="text-error" />
        <p className="text-body-md text-on-surface-variant">{t('error.banner', { message })}</p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-full bg-primary px-4 py-2 text-label-md font-medium text-white transition hover:bg-[#1e2a4a] active:scale-[0.98]"
      >
        {t('error.retry')}
      </button>
    </div>
  )
}

function SkeletonCard({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-outline-variant bg-white p-6 ${className}`}>
      <div className="mb-3 h-4 w-1/3 rounded bg-surface-container-high" />
      <div className="mb-2 h-6 w-2/3 rounded bg-surface-container-high" />
      <div className="h-4 w-full rounded bg-surface-container" />
    </div>
  )
}

function AlertCard({ alert, onExplain, onView, t }) {
  const accent =
    alert.severity === 'critical'
      ? 'border-l-error'
      : alert.severity === 'standard'
        ? 'border-l-primary'
        : 'border-l-secondary'
  const tagClass =
    alert.severity === 'critical'
      ? 'bg-error-container text-on-error-container'
      : alert.severity === 'standard'
        ? 'bg-surface-container-high text-on-surface'
        : 'bg-secondary-container text-on-secondary-container'
  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onView?.(alert)}
      className={`cursor-pointer rounded-2xl border border-outline-variant border-l-4 ${accent} bg-white p-6 ambient-shadow transition-shadow hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${tagClass}`}>
          {alert.category}
        </span>
        <span className="flex items-center gap-1 text-caption text-secondary">
          <Icon name="verified" className="text-[14px]" /> {t('alerts.official')}
        </span>
      </div>
      <h3 className="mb-2 text-[18px] font-semibold leading-tight text-on-surface">{alert.title}</h3>
      <p className="max-w-prose text-body-md leading-relaxed text-on-surface-variant">{alert.summary}</p>
      <dl className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-surface-container-low p-4 text-caption sm:grid-cols-3">
        <div>
          <dt className="font-semibold text-on-surface">{t('alerts.source')}</dt>
          <dd className="mt-1 text-on-surface-variant">{alert.source_name}</dd>
        </div>
        <div>
          <dt className="font-semibold text-on-surface">{t('alerts.published')}</dt>
          <dd className="mt-1 text-on-surface-variant">{formatDate(alert.published_date)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-on-surface">{t('alerts.effective')}</dt>
          <dd className="mt-1 text-on-surface-variant">{alert.effective_date || '—'}</dd>
        </div>
      </dl>
      <button
        onClick={(e) => { e.stopPropagation(); onExplain(alert) }}
        className="mt-4 inline-flex items-center gap-1.5 text-label-md font-medium text-primary hover:underline"
      >
        {t('alerts.cta')} <Icon name="arrow_forward" className="text-[16px]" />
      </button>
    </motion.article>
  )
}

function AlertDetail({ alert, onBack, onAsk, t }) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-white px-4 py-2 text-label-md text-on-surface hover:bg-surface-container-low">
        <Icon name="arrow_back" className="text-[16px]" /> Retour
      </button>
      <article className="rounded-2xl border border-outline-variant bg-white p-6 ambient-shadow md:p-8">
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              alert.severity === 'critical'
                ? 'bg-error-container text-on-error-container'
                : alert.severity === 'standard'
                  ? 'bg-surface-container-high text-on-surface'
                  : 'bg-secondary-container text-on-secondary-container'
            }`}
          >
            {alert.category}
          </span>
          <span className="flex items-center gap-1 text-caption text-secondary">
            <Icon name="verified" className="text-[14px]" /> {t('alerts.official')}
          </span>
        </div>
        <h1 className="mb-3 text-[26px] font-bold leading-tight tracking-[-0.015em] text-on-surface md:text-[28px]">{alert.title}</h1>
        <p className="text-body-lg leading-relaxed text-on-surface-variant">{alert.content || alert.summary}</p>
        <dl className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-surface-container-low p-4 text-caption sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-on-surface">{t('alerts.source')}</dt>
            <dd>{alert.source_name}</dd>
            {alert.source_url && (
              <a href={alert.source_url} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                {alert.source_url}
              </a>
            )}
          </div>
          <div>
            <dt className="font-semibold text-on-surface">{t('alerts.published')}</dt>
            <dd>{formatDate(alert.published_date)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-on-surface">{t('alerts.effective')}</dt>
            <dd>{alert.effective_date || '—'}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => onAsk(alert)}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-label-md font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
          >
            Demander à l'IA <Icon name="smart_toy" className="text-[18px]" />
          </button>
          {alert.source_url && (
            <a
              href={alert.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-white px-5 py-2.5 text-label-md font-medium text-on-surface hover:bg-surface-container-low"
            >
              Source originale <Icon name="open_in_new" className="text-[16px]" />
            </a>
          )}
        </div>
      </article>
    </div>
  )
}

function Home({ data, loading, error, goAi, onViewArticle, t }) {
  const profile = data.profile
  const goal = data.goals?.[0]
  const topAlert = data.alerts?.find((a) => a.severity === 'critical') ?? data.alerts?.[0]
  const goalPct = goal ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0
  const reduce = useReducedMotion()

  return (
    <>
      <div className="mb-8">
        <h1 className="text-[28px] font-bold leading-none tracking-[-0.02em] text-on-surface md:text-[32px]">
          <Greeting t={t} />
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">{t('home.subtitle')}</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={data.reload} t={t} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-4 md:col-span-8 md:gap-6"
        >
          {loading || !topAlert ? <SkeletonCard /> : <AlertCard alert={topAlert} onExplain={goAi} onView={onViewArticle} t={t} />}

          <section className="relative grid grid-cols-1 gap-6 md:grid-cols-9 md:gap-8">
            <div className="relative overflow-hidden rounded-[20px] border border-outline-variant bg-primary p-6 md:col-span-5 md:p-8">
              <div className="relative z-10 max-w-[54ch]">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-caption font-medium"><Icon name="smart_toy" className="text-[14px]" /> Assistant IA officiel</div>
                <h2 className="max-w-[18ch] text-[22px] font-semibold leading-tight text-white md:text-[24px]">{t('home.aiTitle')}</h2>
                <p className="mt-2 max-w-[42ch] text-body-md leading-relaxed text-white/70">{t('home.aiSubtitle')}</p>
                <form className="mt-6 flex gap-3" onSubmit={(e) => { e.preventDefault(); goAi() }}>
                  <input
                    type="text"
                    placeholder={t('home.aiPlaceholder')}
                    className="w-full rounded-full border border-white/15 bg-white px-5 py-3 text-body-md text-on-surface placeholder:text-outline focus:border-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <button
                    type="submit"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-5 py-3 text-label-md font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
                  >
                    {t('common.ask')} <Icon name="send" className="text-[16px]" />
                  </button>
                </form>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-white/8 bg-secondary-container px-3 py-1 text-caption font-medium text-on-secondary-container">Qu'est-ce que la TVA ?</span>
                  <span className="rounded-full border border-white/8 bg-secondary-container px-3 py-1 text-caption font-medium text-on-secondary-container">Bail : quoi vérifier ?</span>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full border border-white/5" />
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-6 md:col-span-4"
            >
              <section className="rounded-[20px] border border-outline-variant bg-white p-6 shadow-[0_4px_6px_rgba(15,23,42,0.02)]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-caption font-bold uppercase tracking-[0.1em] text-on-surface">{t('home.yourMoney')}</h3>
                  <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-caption font-medium text-on-surface-variant">CFA</span>
                </div>
                {loading || !profile ? (
                  <div className="space-y-4">
                    <div className="h-10 animate-pulse rounded-xl bg-surface-container-high" />
                    <div className="h-10 animate-pulse rounded-xl bg-surface-container-high" />
                    <div className="h-10 animate-pulse rounded-xl bg-surface-container-high" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container">
                          <Icon name="arrow_downward" className="text-[16px] text-on-secondary-container" />
                        </div>
                        <span className="text-body-md text-on-surface-variant">{t('home.income')}</span>
                      </div>
                      <span className="text-label-md font-semibold text-on-surface">{fmt(profile.monthly_income)} {profile.currency}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-error-container/10 px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-error-container">
                          <Icon name="arrow_upward" className="text-[16px] text-on-error-container" />
                        </div>
                        <span className="text-body-md text-on-error-container">{t('home.expenses')}</span>
                      </div>
                      <span className="text-label-md font-semibold text-on-error-container">{fmt(profile.monthly_expenses)} {profile.currency}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-secondary-container/15 px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest">
                          <Icon name="savings" className="text-[16px] text-primary" />
                        </div>
                        <span className="text-body-md text-primary">{t('home.savings')}</span>
                      </div>
                      <span className="text-label-md font-semibold text-primary">{fmt(profile.savings)} {profile.currency}</span>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-[20px] border border-outline-variant bg-secondary-container p-6 text-on-secondary-container">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon name="track_changes" className="text-[18px]" />
                    <h3 className="text-caption font-bold uppercase tracking-wide">
                      {goal ? t('home.target', { name: goal.name }) : t('home.noGoal')}
                    </h3>
                  </div>
                  {goal && (
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-caption font-medium">{goal.category}</span>
                  )}
                </div>
                {loading || !goal ? (
                  <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-white/20" />
                ) : (
                  <>
                    <div className="mb-2 mt-4 flex items-end justify-between">
                      <span className="text-[28px] font-bold leading-none tracking-tight text-on-secondary-container">{goalPct}%</span>
                      <span className="text-caption text-on-secondary-container/70">
                        {fmt(goal.current_amount)} / {fmt(goal.target_amount)} CFA
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                      <motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: `${goalPct}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                    <p className="mt-3 text-caption leading-relaxed text-on-secondary-container/70">
                      {goalPct < 50 ? t('home.almostHalf') : t('home.pastHalf')}
                    </p>
                  </>
                )}
              </section>
            </motion.div>
          </section>
  )
}

function Alerts({ data, loading, error, goAi, onViewArticle, t }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.015em] text-on-surface md:text-[32px]">{t('alerts.title')}</h1>
        <p className="mt-2 max-w-[60ch] text-body-md leading-relaxed text-on-surface-variant">{t('alerts.subtitle')}</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={data.reload} t={t} />}

      {loading && (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}

      {!loading && !error && data.alerts?.length === 0 && (
        <div className="rounded-2xl border border-outline-variant bg-white p-10 text-center">
          <Icon name="inbox" className="mb-3 text-[32px] text-on-surface-variant" />
          <p className="text-body-md text-on-surface-variant">{t('alerts.empty')}</p>
        </div>
      )}

      {!loading && data.alerts?.map((a, i) => (
        <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.4 }}>
          <AlertCard alert={a} onExplain={goAi} onView={onViewArticle} t={t} />
        </motion.div>
      ))}
    </div>
  )
}

function Money({ data, loading, error, reload, t }) {
  const profile = data.profile
  const goal = data.goals?.[0]
  const goalPct = goal ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0
  const expenseRatio = profile ? Math.round((profile.monthly_expenses / profile.monthly_income) * 100) : 0
  const monthsLeft = goal && profile ? Math.ceil((goal.target_amount - goal.current_amount) / 50000) : null
  const monthlyCapacity = profile ? profile.monthly_income - profile.monthly_expenses : 0

  const [amountInput, setAmountInput] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)
  const [goalSaved, setGoalSaved] = useState(false)

  const saveGoal = async () => {
    const amount = Number(amountInput)
    if (!goal || !Number.isFinite(amount) || amount < 0) return
    setSavingGoal(true)
    try {
      await api.updateGoal(goal.id, amount)
      setGoalSaved(true)
      setAmountInput('')
      reload()
    } catch (err) {
      setGoalSaved(false)
      alert(err.message)
    } finally {
      setSavingGoal(false)
    }
  }

  return (
    <div className="space-y-8">
      {error && <ErrorBanner message={error} onRetry={reload} t={t} />}
      <section>
        <h2 className="mb-4 text-[22px] font-semibold tracking-tight text-on-surface">{t('money.snapshot')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-outline-variant bg-white p-6 ambient-shadow">
            <div className="mb-3 flex items-center gap-2 text-on-surface-variant">
              <Icon name="savings" className="text-[18px]" />
              <span className="text-label-md">{t('money.available')}</span>
            </div>
            <div className="mb-2 text-[28px] font-bold tracking-tight text-on-surface">
              {profile ? `${fmt(monthlyCapacity)}` : '—'} <span className="text-body-md font-normal text-on-surface-variant">{profile?.currency ?? ''}</span>
            </div>
            <div className="flex items-center gap-1 text-caption text-secondary">
              <Icon name="trending_up" className="text-[16px]" /> {t('money.availableHint')}
            </div>
          </div>
          <div className="rounded-2xl border border-outline-variant bg-white p-6 ambient-shadow">
            <div className="mb-3 flex items-center gap-2 text-on-surface-variant">
              <Icon name="arrow_downward" className="text-secondary text-[18px]" />
              <span className="text-label-md">{t('money.monthlyIncome')}</span>
            </div>
            <div className="text-[28px] font-bold tracking-tight text-on-surface">
              {profile ? `${fmt(profile.monthly_income)}` : '—'} <span className="text-body-md font-normal text-on-surface-variant">{profile?.currency ?? ''}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-outline-variant bg-white p-6 ambient-shadow">
            <div className="mb-3 flex items-center gap-2 text-on-surface-variant">
              <Icon name="arrow_upward" className="text-error text-[18px]" />
              <span className="text-label-md">{t('money.monthlyExpenses')}</span>
            </div>
            <div className="text-[28px] font-bold tracking-tight text-on-surface">
              {profile ? `${fmt(profile.monthly_expenses)}` : '—'} <span className="text-body-md font-normal text-on-surface-variant">{profile?.currency ?? ''}</span>
            </div>
            {profile && (
              <>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                  <div className="h-full rounded-full bg-error" style={{ width: `${expenseRatio}%` }} />
                </div>
                <p className="mt-1.5 text-caption text-on-surface-variant">{t('money.ofIncome', { pct: expenseRatio })}</p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-outline-variant bg-white p-6 ambient-shadow">
          {loading || !goal ? (
            <p className="text-body-md text-on-surface-variant">{t('money.noGoalYet')}</p>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-body-lg font-semibold text-on-surface">{t('money.currentGoal', { name: goal.name })}</h3>
                  <p className="text-body-md text-on-surface-variant">{t('money.goalTarget', { amount: fmt(goal.target_amount) })}</p>
                </div>
                <span className="rounded-full bg-surface-container-low p-3">
                  <Icon name="laptop_mac" className="text-primary" />
                </span>
              </div>
              <div className="mb-4">
                <div className="mb-1.5 flex justify-between text-caption text-on-surface-variant">
                  <span>{t('money.saved', { amount: fmt(goal.current_amount) })}</span>
                  <span className="font-semibold text-on-surface">{goalPct}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${goalPct}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={amountInput}
                  onChange={(e) => { setAmountInput(e.target.value); setGoalSaved(false) }}
                  placeholder={t('money.newSavedPlaceholder')}
                  className="w-full rounded-full border border-outline-variant bg-white px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
                <button
                  onClick={saveGoal}
                  disabled={savingGoal}
                  className="whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-label-md font-medium text-white transition hover:bg-[#1e2a4a] disabled:opacity-50 active:scale-[0.98]"
                >
                  {savingGoal ? t('money.saving') : t('money.updateGoal')}
                </button>
              </div>
              {goalSaved && (
                <p className="mt-3 flex items-center gap-1.5 text-caption font-medium text-secondary">
                  <Icon name="check_circle" className="text-[16px]" /> {t('money.goalUpdated')}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col justify-center rounded-2xl bg-secondary-container p-6 text-on-secondary-container">
          <div className="mb-2 flex items-center gap-2">
            <Icon name="lightbulb" fill />
            <h3 className="text-body-lg font-semibold">{t('money.planTitle')}</h3>
          </div>
          {monthsLeft !== null && monthsLeft > 0 ? (
            <p className="mb-4 text-[22px] font-semibold leading-tight">
              {t('money.planText', { monthly: '50,000', months: monthsLeft })}
            </p>
          ) : (
            <p className="mb-4 text-[22px] font-semibold leading-tight">{t('money.planDone')}</p>
          )}
          <button className="w-fit rounded-full bg-white px-5 py-2.5 text-label-md font-semibold text-on-secondary-container shadow-sm transition hover:bg-white/90 active:scale-[0.98]">
            {t('money.autoSave')}
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-[20px] font-semibold tracking-tight text-on-surface">{t('money.library')}</h2>
          <button className="text-label-md font-medium text-primary hover:underline">{t('money.viewAll')}</button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LIBRARY.map((item) => (
            <article
              key={item.titleKey}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-outline-variant bg-white transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
            >
              <div className="relative flex h-28 items-center justify-center bg-surface-container-low">
                <Icon name={item.icon} className="text-[40px] text-on-surface-variant opacity-60 transition-opacity group-hover:opacity-100" />
                <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-caption font-medium text-on-surface shadow-sm">
                  {t('money.minRead', { mins: item.read })}
                </span>
              </div>
              <div className="p-4">
                <h4 className="mb-1 text-label-md font-semibold text-on-surface">{t(item.titleKey)}</h4>
                <p className="text-caption leading-relaxed text-on-surface-variant">{t(item.descKey)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-primary p-6 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <Icon name="smart_toy" className="text-[24px] text-primary" />
            </div>
            <div>
              <h3 className="text-body-lg font-semibold text-white">{t('money.coachTitle')}</h3>
              <p className="text-body-md text-white/70">{t('money.coachSubtitle')}</p>
            </div>
          </div>
          <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white px-6 py-3 text-label-md font-semibold text-primary transition hover:bg-surface-container-low md:w-auto active:scale-[0.98]">
            {t('money.coachCta')} <Icon name="arrow_forward" className="text-[18px]" />
          </button>
        </div>
      </section>
    </div>
  )
}

function AskAI({ t, pendingExplain, clearPending }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [displayed, setDisplayed] = useState({ simple_terms: '', why_it_matters: '', checks: [] })
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState(null)
  const suggestions = ['ai.suggestion1', 'ai.suggestion2', 'ai.suggestion3']

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const typeOut = async (full) => {
    setDisplayed({ simple_terms: '', why_it_matters: '', checks: [] })
    setTyping(true)
    let cur = ''
    for (const w of full.simple_terms.split(/(\s+)/)) {
      if (!w) continue
      cur += w
      const snap = cur
      setDisplayed((d) => ({ ...d, simple_terms: snap }))
      await sleep(22)
    }
    cur = ''
    for (const w of full.why_it_matters.split(/(\s+)/)) {
      if (!w) continue
      cur += w
      const snap = cur
      setDisplayed((d) => ({ ...d, why_it_matters: snap }))
      await sleep(22)
    }
    for (const chk of full.checks) {
      let chkCur = ''
      setDisplayed((d) => ({ ...d, checks: [...d.checks, ''] }))
      for (const w of chk.split(/(\s+)/)) {
        if (!w) continue
        chkCur += w
        const snap = chkCur
        setDisplayed((d) => {
          const copy = [...d.checks]
          copy[copy.length - 1] = snap
          return { ...d, checks: copy }
        })
        await sleep(22)
      }
      await sleep(70)
    }
    setTyping(false)
  }

  const runExplain = async (msg) => {
    setLoading(true)
    setError(null)
    setAnswer(null)
    setDisplayed({ simple_terms: '', why_it_matters: '', checks: [] })
    try {
      const data = await api.explain(msg)
      setAnswer({ sources: data.sources || [], disclaimer: data.disclaimer || '', stub: data.stub })
      setLoading(false)
      await typeOut(data)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!question.trim()) return
    await runExplain(question)
  }

  useEffect(() => {
    if (!pendingExplain) return
    const msg = `Explique cette actualité en français simple — Titre: ${pendingExplain.title} — Résumé: ${pendingExplain.summary} — Source: ${pendingExplain.source_name} — Effectif: ${pendingExplain.effective_date}`
    setQuestion(msg)
    runExplain(msg)
    clearPending?.()
  }, [pendingExplain])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.015em] text-on-surface md:text-[32px]">{t('ai.title')}</h1>
        <p className="mt-2 max-w-[60ch] text-body-md leading-relaxed text-on-surface-variant">{t('ai.subtitle')}</p>
      </div>

      <section className="rounded-2xl border border-outline-variant bg-white p-6 ambient-shadow">
        <form onSubmit={submit}>
          <label htmlFor="ai-query" className="mb-2 block text-label-md font-semibold text-on-surface">
            {t('ai.yourDoc')}
          </label>
          <textarea
            id="ai-query"
            rows={5}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('ai.placeholder')}
            className="w-full resize-y rounded-2xl border border-outline-variant bg-white px-4 py-3 text-body-md leading-relaxed text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-5 py-2.5 text-label-md font-semibold text-white transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? t('ai.thinking') : t('ai.explain')} <Icon name="send" className="text-[16px]" />
            </button>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuestion(t(s))}
                className="rounded-full border border-outline-variant bg-white px-4 py-2 text-caption font-medium text-on-surface-variant transition hover:bg-surface-container-low"
              >
                {t(s)}
              </button>
            ))}
          </div>
        </form>
      </section>

      {error && <ErrorBanner message={error} onRetry={() => setError(null)} t={t} />}

      {(loading || typing || displayed.simple_terms) && (
        <section className="rounded-2xl border border-outline-variant bg-white p-6 ambient-shadow">
          <div className="mb-3 flex items-center gap-2 text-caption font-medium text-secondary">
            <Icon name="verified" className="text-[14px]" /> {loading || typing ? 'Génération en cours...' : t('ai.basedOn')}
            {(loading || typing) && <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-secondary" />}
          </div>
          {displayed.simple_terms && (
            <>
              <h3 className="mb-2 text-[20px] font-semibold text-on-surface">
                {t('ai.simpleTerms')} {typing && <span className="animate-pulse">▊</span>}
              </h3>
              <p className="whitespace-pre-wrap text-body-md leading-relaxed text-on-surface">
                {displayed.simple_terms}
                {typing && <span className="animate-pulse">▊</span>}
              </p>
            </>
          )}
          {displayed.why_it_matters && (
            <>
              <h4 className="mb-1.5 mt-6 text-label-md font-semibold text-on-surface">{t('ai.whyItMatters')}</h4>
              <p className="whitespace-pre-wrap text-body-md leading-relaxed text-on-surface-variant">{displayed.why_it_matters}</p>
            </>
          )}
          {displayed.checks.length > 0 && (
            <>
              <h4 className="mb-2 mt-6 text-label-md font-semibold text-on-surface">{t('ai.whatToCheck')}</h4>
              <ul className="space-y-2">
                {displayed.checks.map((check, i) => (
                  <li key={i} className="flex gap-2 text-body-md leading-relaxed text-on-surface-variant">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{check}
                  </li>
                ))}
              </ul>
            </>
          )}
          {answer?.sources?.length > 0 && (
            <>
              <h4 className="mb-2 mt-6 text-label-md font-semibold text-on-surface">{t('ai.sources')}</h4>
              <ul className="space-y-2">
                {answer.sources.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-caption leading-relaxed text-on-surface-variant">
                    <Icon name="menu_book" className="mt-0.5 shrink-0 text-[14px] text-primary" />
                    <span>
                      <span className="font-semibold text-on-surface">
                        {[s.law_ref, s.article_ref].filter(Boolean).join(', ')}
                      </span>
                      {s.detail ? ` — ${s.detail}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {answer?.disclaimer && (
            <p className="mt-6 border-t border-outline-variant pt-4 text-caption italic leading-relaxed text-on-surface-variant">
              {answer.disclaimer}
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function Profile({ data, loading, error, reload, t, lang, setLang }) {
  const [interests, setInterests] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data.preferences && interests === null) setInterests(data.preferences.topics ?? [])
  }, [data.preferences, interests])

  const toggle = (topic) => {
    setSaved(false)
    setInterests((prev) => (prev.includes(topic) ? prev.filter((x) => x !== topic) : [...prev, topic]))
  }

  const changeLanguage = (code) => {
    setLang(code)
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.savePreferences(interests, lang)
      setSaved(true)
      reload()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectClass =
    'w-full rounded-full border border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10'

  return (
    <div className="max-w-[640px] space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.015em] text-on-surface md:text-[32px]">{t('profile.title')}</h1>
        <p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">{t('profile.subtitle')}</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} t={t} />}

      <div className="space-y-5 rounded-2xl border border-outline-variant bg-white p-6 ambient-shadow">
        <div>
          <label htmlFor="country" className="mb-2 block text-label-md font-semibold text-on-surface">
            {t('profile.country')}
          </label>
          <select id="country" defaultValue="benin" className={selectClass}>
            <option value="benin">{t('country.benin')}</option>
            <option value="togo">{t('country.togo')}</option>
            <option value="senegal">{t('country.senegal')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="language" className="mb-2 block text-label-md font-semibold text-on-surface">
            {t('profile.language')}
          </label>
          <select id="language" value={lang} onChange={(e) => changeLanguage(e.target.value)} className={selectClass}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
                {l.beta ? ` (${t('lang.beta')})` : ''}
              </option>
            ))}
          </select>
          {lang === 'fon' && (
            <p className="mt-2 text-caption leading-relaxed text-on-surface-variant">
              Fon translation is an early machine draft — have a native speaker review before relying on it.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-white p-6 ambient-shadow">
        <h3 className="mb-1 text-label-md font-semibold text-on-surface">{t('profile.interests')}</h3>
        <p className="mb-4 text-caption leading-relaxed text-on-surface-variant">{t('profile.interestsHint')}</p>
        {loading || interests === null ? (
          <div className="h-10 animate-pulse rounded-full bg-surface-container-high" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((topic) => {
              const active = interests.includes(topic)
              return (
                <button
                  key={topic}
                  onClick={() => toggle(topic)}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-2 text-label-md transition ${
                    active
                      ? 'border-secondary bg-secondary-container font-semibold text-on-secondary-container'
                      : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {topic}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || interests === null}
          className="rounded-full bg-primary px-6 py-2.5 text-label-md font-semibold text-white transition hover:bg-[#1e2a4a] disabled:opacity-50 active:scale-[0.98]"
        >
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-caption font-medium text-secondary">
            <Icon name="check_circle" className="text-[16px]" /> {t('profile.saved')}
          </span>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [lang, setLang] = useState('fr')
  const [pendingExplain, setPendingExplain] = useState(null)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [state, setState] = useState({
    alerts: null,
    profile: null,
    goals: null,
    preferences: null,
    loading: true,
    error: null,
  })

  const t = useCallback((key, params) => translate(lang, key, params), [lang])

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const [alerts, profile, goals, preferences] = await Promise.all([
        api.alerts(),
        api.financialProfile(),
        api.goals(),
        api.preferences(),
      ])
      setState({ alerts, profile, goals, preferences, loading: false, error: null })
      if (preferences?.language) setLang(preferences.language)
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err.message }))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const id = setInterval(() => load(), 60000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [load])

  const goAi = (alert) => {
    if (alert && alert.title) setPendingExplain(alert)
    setTab('ai')
  }
  const clearPending = () => setPendingExplain(null)
  const openArticle = (alert) => setSelectedAlert(alert)
  const closeArticle = () => setSelectedAlert(null)
  const askAboutArticle = (alert) => { setSelectedAlert(null); goAi(alert) }
  const data = { ...state, reload: load }

  const shell = (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant/60 bg-white/90 px-4 backdrop-blur-md md:hidden">
        <div>
          <div className="text-[18px] font-bold tracking-tight text-on-surface">Knowly</div>
          <div className="text-caption leading-none text-on-surface-variant">{t('app.tagline')}</div>
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <Icon name="notifications" className="text-[22px]" />
          <TopBarUser />
        </div>
      </header>

      <nav className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-outline-variant bg-white p-4 md:flex">
        <div className="mb-8 px-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white"><Icon name="gavel" className="text-[16px]" /></div>
            <span className="text-[18px] font-bold tracking-tight text-on-surface">Knowly</span>
          </div>
          <div className="mt-1 text-caption text-on-surface-variant">{t('app.tagline')}</div>
        </div>
        <div className="flex flex-grow flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                onClick={() => { setSelectedAlert(null); setTab(item.id) }}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-left transition active:scale-[0.98] ${
                  active
                    ? 'bg-secondary-container font-semibold text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <Icon name={item.icon} fill={active} className="text-[20px]" />
                <span className="text-label-md">{t(item.key)}</span>
              </button>
            )
          })}
        </div>
        <div className="border-t border-outline-variant/50 px-2 pb-2 pt-4">
          <UserBadge />
        </div>
      </nav>

      <main className="min-h-screen w-full pb-24 md:ml-64 md:pb-8">
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-outline-variant/60 bg-white/80 px-8 backdrop-blur-md md:flex">
          <div className="text-[18px] font-semibold tracking-tight text-on-surface">{t(NAV_ITEMS.find((n) => n.id === tab)?.key ?? 'nav.home')}</div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            <span className="hidden items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-caption font-medium lg:inline-flex"><Icon name="verified" className="text-[14px] text-secondary" /> Sources vérifiées</span>
            <Icon name="notifications" className="text-[20px]" />
            <TopBarUser />
          </div>
        </header>

        <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 md:px-8 md:py-8">
          {selectedAlert ? (
            <AlertDetail alert={selectedAlert} onBack={closeArticle} onAsk={askAboutArticle} t={t} />
          ) : (
            <>
              {tab === 'home' && <Home data={data} loading={state.loading} error={state.error} goAi={goAi} onViewArticle={openArticle} t={t} />}
              {tab === 'alerts' && <Alerts data={data} loading={state.loading} error={state.error} goAi={goAi} onViewArticle={openArticle} t={t} />}
              {tab === 'money' && <Money data={data} loading={state.loading} error={state.error} reload={load} t={t} />}
              {tab === 'ai' && <AskAI t={t} pendingExplain={pendingExplain} clearPending={clearPending} />}
              {tab === 'profile' && <Profile data={data} loading={state.loading} error={state.error} reload={load} t={t} lang={lang} setLang={setLang} />}
            </>
          )}
          <footer className="border-t border-outline-variant/60 pt-6 text-center">
            <div className="text-label-md font-semibold text-on-surface">Knowly</div>
            <p className="mx-auto mt-1 max-w-[48ch] text-caption leading-relaxed text-on-surface-variant">{t('footer.safety')}</p>
          </footer>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[64px] items-center justify-around border-t border-outline-variant bg-white px-2 md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              onClick={() => { setSelectedAlert(null); setTab(item.id) }}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center ${active ? 'text-primary' : 'text-on-surface-variant'}`}
            >
              <span className={`mb-1 rounded-full px-4 py-1 ${active ? 'bg-secondary-container/50' : ''}`}>
                <Icon name={item.icon} fill={active} className="text-[22px]" />
              </span>
              <span className="text-[10px] font-semibold leading-none">{t(item.key)}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )

  if (!CLERK_ACTIVE) return shell

  return (
    <>
      <SignedOut>
        <SignedOutLanding t={t} />
      </SignedOut>
      <SignedIn>{shell}</SignedIn>
    </>
  )
}
