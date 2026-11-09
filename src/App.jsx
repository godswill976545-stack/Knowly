import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthenticateWithRedirectCallback, ClerkLoading, SignedIn, SignedOut, UserButton, useAuth, useUser } from '@clerk/clerk-react'
import { motion, useReducedMotion } from 'motion/react'
import { api, formatDate, setAuthTokenProvider } from './api.js'
import { LANGUAGES, translate } from './i18n/index.js'
import Landing from './components/Landing.jsx'
import OnboardingSurvey, { readPendingOnboarding, clearPendingOnboarding } from './components/OnboardingSurvey.jsx'
import ArticleRenderer from './components/ArticleRenderer.jsx'
import VoiceInput from './components/VoiceInput.jsx'
import GoalPicker from './components/GoalPicker.jsx'
import { LogoMark, LogoWordmark } from './components/Logo.jsx'
import MoneyAdvisor from './components/MoneyAdvisor.jsx'
import { getAdvice } from './lib/adviceEngine.js'

const CLERK_ACTIVE = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

// After the Google OAuth redirect completes we must leave any lingering
// onboarding hash behind. Using pushState avoids leaving a trailing `#` and
// lets <SignedIn> take over and render the app shell instead of the landing.
function clearAuthHash() {
  try {
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname + window.location.search)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
  } catch {
    window.location.hash = ''
  }
}

function SsoCallbackScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-body-md text-on-surface-variant">Finalisation de la connexion…</p>
      </div>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      />
    </div>
  )
}

// Branded splash shown while Clerk restores a returning user's session —
// without it, signed-in users see the landing/survey flash before the app.
function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface">
      <LogoMark className="h-11 w-11" />
      <LogoWordmark className="text-[20px] font-extrabold tracking-tight text-on-surface" />
      <span className="mt-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status" aria-label="Loading" />
    </div>
  )
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

// Bridges Clerk session tokens into api.js. Rendered only when Clerk is
// active. After the token provider is set, notifies the app to reload data
// under the signed-in user instead of the demo user.
function AuthTokenBridge() {
  const { getToken } = useAuth()
  useEffect(() => {
    setAuthTokenProvider(() => getToken())
    getToken()
      .then((token) => { if (token) window.dispatchEvent(new Event('moncheck-authed')) })
      .catch(() => {})
    return () => setAuthTokenProvider(null)
  }, [getToken])
  return null
}

function SignedOutLanding({ t, lang, onGuestLogin, currentLang, onLangChange }) {
  const hash = useHashRoute()
  // The onboarding survey IS the sign-up flow: it asks a few questions, then
  // hands off to Google sign-in on its final step. Guest mode is the only
  // alternative — there is no separate email/password sign-in screen anymore.
  const isWelcome = hash.includes('welcome')

  if (isWelcome) {
    return (
      <OnboardingSurvey
        t={t}
        lang={lang}
        onLangChange={onLangChange}
        onGuestLogin={onGuestLogin}
      />
    )
  }

  return <Landing onSignIn={() => (window.location.hash = '#/welcome')} onLangChange={onLangChange} t={t} />
}

function UserBadge({ guestMode, onExitGuest }) {
  if (guestMode) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-white font-bold text-xs">
            GM
          </div>
          <div className="text-left">
            <div className="text-label-md font-semibold text-on-surface leading-tight">Grace Mensah</div>
            <div className="text-xs text-secondary font-medium">Mode Démo</div>
          </div>
        </div>
        <button
          onClick={onExitGuest}
          title="Quitter le mode démo"
          aria-label="Quitter le mode démo"
          className="btn-duo btn-duo--white flex h-7 w-7 min-h-[44px] min-w-[44px] items-center justify-center !p-0 text-on-surface-variant"
        >
          <Icon name="logout" className="text-[16px]" />
        </button>
      </div>
    )
  }
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

function TopBarUser({ guestMode, onExitGuest }) {
  if (guestMode) {
    return (
      <button
        onClick={onExitGuest}
        title="Quitter le mode démo"
        aria-label="Quitter le mode démo"
        className="btn-duo btn-duo--white flex min-h-[44px] items-center gap-1.5 px-3 py-1 text-caption"
      >
        <span className="h-2 w-2 rounded-full bg-secondary" />
        <span>Démo</span>
        <Icon name="logout" className="text-[14px]" />
      </button>
    )
  }
  if (!CLERK_ACTIVE) return <Icon name="account_circle" className="text-[22px]" />
  return <UserButton afterSignOutUrl="/" />
}

function Greeting({ t, guestMode }) {
  if (guestMode || !CLERK_ACTIVE) return <>{t('home.greeting', { name: 'Grace' })}</>
  return <ClerkGreeting t={t} />
}

function ClerkGreeting({ t }) {
  const { user } = useUser()
  const name = user?.firstName || user?.username || (user?.fullName ? user.fullName.split(' ')[0] : null) || 'there'
  return <>{t('home.greeting', { name })}</>
}

const Icon = ({ name, className = '', fill = false, label }) => (
  label ? (
    <span role="img" aria-label={label} className={`material-symbols-outlined ${fill ? 'ms-fill' : ''} ${className}`}>{name}</span>
  ) : (
    <span aria-hidden="true" className={`material-symbols-outlined ${fill ? 'ms-fill' : ''} ${className}`}>{name}</span>
  )
)

const NAV_ITEMS = [
  { id: 'home', key: 'nav.home', icon: 'home' },
  { id: 'alerts', key: 'nav.alerts', icon: 'notifications' },
  { id: 'money', key: 'nav.money', icon: 'payments' },
  { id: 'ai', key: 'nav.ai', icon: 'smart_toy' },
  { id: 'profile', key: 'nav.profile', icon: 'person' },
]

const INTEREST_OPTIONS = ['Money', 'Taxes', 'Employment', 'Business', 'Banking', 'Transport', 'Housing', 'Education']

const fmt = (n) => Number(n ?? 0).toLocaleString()

function ErrorBanner({ message, onRetry, t }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[12px] border border-error/30 bg-error-container/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Icon name="error" className="text-error" />
        <p className="text-body-md text-on-surface-variant">{t('error.banner', { message })}</p>
      </div>
      <button
        onClick={onRetry}
        className="btn-duo btn-duo--dark px-5 py-2.5 text-label-md"
      >
        {t('error.retry')}
      </button>
    </div>
  )
}

function LawReminderBanner({ reminders, onDismiss, onLearnMore, t }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('moncheck-reminder-dismissed') === '1' } catch { return false }
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  // Rotate through multiple critical reminders so repeat visitors see them all.
  useEffect(() => {
    if (!reminders?.length || reminders.length < 2) return
    const id = setInterval(() => setCurrentIndex((i) => i + 1), 8000)
    return () => clearInterval(id)
  }, [reminders])
  if (!reminders?.length || dismissed) return null
  const reminder = reminders[currentIndex % reminders.length]
  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem('moncheck-reminder-dismissed', '1') } catch {}
    onDismiss?.()
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[12px] border border-error/30 bg-error-container/15 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error-container">
          <Icon name="gavel" className="text-[20px] text-on-error-container" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-caption font-bold uppercase tracking-wide text-error">{t('reminder.title')}</span>
            <span className="rounded-full bg-error-container px-2 py-0.5 text-xs font-bold text-on-error-container">{t('reminder.enforced')}</span>
          </div>
          <p className="mt-1 text-body-md font-semibold text-on-surface">{reminder.title}</p>
          <p className="mt-0.5 text-caption text-on-surface-variant">{reminder.enforcement_note}</p>
          <div className="mt-2 flex items-center gap-3">
            <button onClick={() => onLearnMore?.(reminder)} className="text-caption font-bold text-primary hover:underline">
              {t('reminder.learnMore')}
            </button>
            <button onClick={dismiss} className="text-caption font-medium text-on-surface-variant hover:text-on-surface">
              {t('reminder.dismiss')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function DisclaimerModal({ onAccept, t }) {
  const [visible, setVisible] = useState(() => {
    try { return !sessionStorage.getItem('moncheck-disclaimer-accepted') } catch { return true }
  })
  if (!visible) return null
  const accept = () => {
    setVisible(false)
    try { sessionStorage.setItem('moncheck-disclaimer-accepted', '1') } catch {}
    onAccept?.()
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-[480px] rounded-[16px] bg-white p-6 ambient-shadow md:p-8"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container">
          <Icon name="shield" className="text-[24px] text-on-secondary-container" />
        </div>
        <h2 className="text-[22px] font-bold tracking-tight text-on-surface">{t('disclaimer.title')}</h2>
        <div className="mt-3 space-y-3 text-body-md leading-relaxed text-on-surface-variant">
          <p>{t('disclaimer.body1')}</p>
          <p>{t('disclaimer.body2')}</p>
          <p>{t('disclaimer.body3')}</p>
        </div>
        <button
          onClick={accept}
          className="btn-duo btn-duo--primary mt-6 w-full min-h-[48px] justify-center py-3 text-label-md"
        >
          {t('disclaimer.accept')}
        </button>
      </motion.div>
    </motion.div>
  )
}

function SkeletonCard({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-[12px] border border-outline-variant bg-white p-6 ${className}`}>
      <div className="mb-3 h-4 w-1/3 rounded bg-surface-container-high" />
      <div className="mb-2 h-6 w-2/3 rounded bg-surface-container-high" />
      <div className="h-4 w-full rounded bg-surface-container" />
    </div>
  )
}

function AlertCard({ alert, onExplain, onView, t }) {
  const wash =
    alert.severity === 'critical'
      ? 'bg-error-container/25'
      : alert.severity === 'standard'
        ? 'bg-white'
        : 'bg-secondary-container/35'
  const tagClass =
    alert.severity === 'critical'
      ? 'bg-error-container text-on-error-container'
      : alert.severity === 'standard'
        ? 'bg-surface-container-high text-on-surface'
        : 'bg-secondary-container text-on-secondary-container'
  const severityIcon =
    alert.severity === 'critical'
      ? 'error'
      : alert.severity === 'standard'
        ? 'priority_high'
        : 'info'
  const dup = alert.summary && alert.title && alert.summary.trim().startsWith(alert.title.trim())
  return (
    <motion.article
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-[12px] border border-outline-variant ${wash} bg-white p-6 transition-[transform,_box-shadow]_150ms_ease-out hover:shadow-md`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tagClass}`}>
          {alert.category}
        </span>
        <span className="flex items-center gap-1 text-caption text-on-surface-variant">
          <Icon name={severityIcon} className="text-[14px]" />
          <span className="sr-only">{alert.severity}</span>
          <span aria-hidden="true" className="capitalize">{alert.severity}</span>
        </span>
        <span className="flex items-center gap-1 text-caption text-secondary">
          <Icon name="verified" className="text-[14px]" /> {t('alerts.official')}
        </span>
      </div>
      <h3 className="mb-2 text-[18px] font-semibold leading-tight text-on-surface">
        <button
          type="button"
          onClick={() => onView?.(alert)}
          className="rounded text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {alert.title}
        </button>
      </h3>
      {!dup && <p className="max-w-prose text-body-md leading-relaxed text-on-surface-variant">{alert.summary}</p>}
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
          <dd className="mt-1 text-on-surface-variant">{alert.effective_date || t('alerts.notEffective')}</dd>
        </div>
      </dl>
      <button
        onClick={() => onExplain(alert)}
        className="btn-duo btn-duo--white mt-4 px-4 py-2 text-[13px] font-bold text-primary border-primary/10"
      >
        {t('alerts.cta')} <Icon name="arrow_forward" className="text-[16px]" />
      </button>
    </motion.article>
  )
}

function AlertDetail({ alert, onBack, onAsk, t }) {
  useEffect(() => {
    const prevFocus = document.activeElement
    const onKey = (e) => { if (e.key === 'Escape') onBack?.() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (prevFocus && prevFocus.focus) prevFocus.focus()
    }
  }, [onBack])
  const backLabel = t('common.back') && t('common.back') !== 'common.back' ? t('common.back') : 'Retour'
  const notEffective = t('alerts.notEffective') && t('alerts.notEffective') !== 'alerts.notEffective' ? t('alerts.notEffective') : 'Not yet effective'
  const dup = alert.summary && alert.title && alert.summary.trim().startsWith(alert.title.trim())
  return (
    <div role="dialog" aria-modal="true" aria-label={alert.title} className="space-y-6">
      <button onClick={onBack} className="btn-duo btn-duo--white px-4 py-2 text-[13px]">
        <Icon name="arrow_back" className="text-[16px]" /> {backLabel}
      </button>
      <article className="rounded-[16px] border border-outline-variant bg-white p-6 ambient-shadow md:p-8">
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
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
        <h1 className="mb-4 text-[26px] font-bold leading-tight tracking-[-0.015em] text-on-surface md:text-[28px]">{alert.title}</h1>
        {(!dup || alert.content) && (
          <div className="mt-4 border-t border-outline-variant/50 pt-4">
            <ArticleRenderer content={alert.content || alert.summary} />
          </div>
        )}
        <dl className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-surface-container-low p-4 text-caption sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-on-surface">{t('alerts.source')}</dt>
            <dd>{alert.source_name}</dd>
            {alert.source_url && (
              <a href={alert.source_url} target="_blank" rel="noreferrer" aria-label={alert.source_url} className="block max-w-full truncate text-primary underline hover:underline">
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
            <dd>{alert.effective_date || notEffective}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => onAsk(alert)}
            className="btn-duo btn-duo--secondary px-5 py-2.5 text-label-md"
          >
            Demander à l'IA <Icon name="smart_toy" className="text-[18px]" />
          </button>
          {alert.source_url && (
            <a
              href={alert.source_url}
              target="_blank"
              rel="noreferrer"
              className="btn-duo btn-duo--white px-5 py-2.5 text-label-md"
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
  const rawHomePct = goal && Number(goal.target_amount) > 0 ? Math.round((Number(goal.current_amount ?? 0) / Number(goal.target_amount)) * 100) : 0
  const goalPct = Math.min(100, Math.max(0, rawHomePct))
  const [heroQuery, setHeroQuery] = useState('')
  const reduce = useReducedMotion()
  let onboardLine = null
  try {
    const saved = JSON.parse(localStorage.getItem('moncheck-profile') || 'null')
    const savedGoals = Array.isArray(saved?.goals) && saved.goals.length ? saved.goals : saved?.goal ? [saved.goal] : []
    if (saved?.role && savedGoals.length) {
      const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s
      onboardLine = t('onboard.homeFor', {
        role: t(`onboard.role${cap(saved.role)}`),
        goal: savedGoals.map((g) => t(`onboard.goal${cap(g)}`)).join(', '),
      })
    }
  } catch {}

  return (
    <>
      <div className="mb-8">
        <h1 className="text-[28px] font-bold leading-none tracking-[-0.02em] text-on-surface md:text-[32px]">
          <Greeting t={t} />
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">{t('home.subtitle')}</p>
        {onboardLine && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-secondary-container/60 px-3 py-1 text-caption font-semibold text-on-secondary-container">
            {onboardLine}
          </p>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={data.reload} t={t} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-4 md:col-span-8 md:gap-6"
        >
          {loading || !topAlert ? <SkeletonCard /> : <AlertCard alert={topAlert} onExplain={goAi} onView={onViewArticle} t={t} />}

          <section className="relative grid grid-cols-1 gap-6 md:grid-cols-9 md:gap-8">
            <div className="home-hero-card relative overflow-hidden rounded-[16px] border border-white/15 p-6 md:col-span-5 md:p-8 shadow-card">
              <div className="relative z-10 max-w-[54ch]">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-caption font-medium"><Icon name="smart_toy" className="text-[14px]" /> Assistant IA officiel</div>
                <h2 className="max-w-[18ch] text-[22px] font-semibold leading-tight text-white md:text-[24px]">{t('home.aiTitle')}</h2>
                <p className="mt-2 max-w-[42ch] text-body-md leading-relaxed text-white/70">{t('home.aiSubtitle')}</p>
                <form className="mt-6 flex gap-3" onSubmit={(e) => { e.preventDefault(); goAi(heroQuery) }}>
                  <input
                    type="text"
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                    placeholder={t('home.aiPlaceholder')}
                    aria-label={t('home.aiPlaceholder')}
                    className="w-full rounded-full border border-white/15 bg-white px-5 py-3 text-body-md text-on-surface placeholder:text-outline focus:border-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <button
                    type="submit"
                    className="btn-duo btn-duo--secondary shrink-0 px-5 py-3 text-label-md"
                  >
                    {t('common.ask')} <Icon name="send" className="text-[16px]" />
                  </button>
                </form>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => goAi("Qu'est-ce que la TVA ?")} className="rounded-full border border-white/8 bg-secondary-container px-3 py-1 text-caption font-medium text-on-secondary-container">Qu'est-ce que la TVA ?</button>
                  <button type="button" onClick={() => goAi('Bail : quoi vérifier ?')} className="rounded-full border border-white/8 bg-secondary-container px-3 py-1 text-caption font-medium text-on-secondary-container">Bail : quoi vérifier ?</button>
                </div>
              </div>
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-6 md:col-span-4"
            >
              <section className="rounded-[12px] border border-outline-variant bg-white p-6 shadow-card">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-caption font-bold uppercase tracking-[0.08em] text-on-surface">{t('home.yourMoney')}</h3>
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
                        <span className="text-body-md text-on-error-container expense-ink">{t('home.expenses')}</span>
                      </div>
                      <span className="text-label-md font-semibold text-on-error-container expense-ink">{fmt(profile.monthly_expenses)} {profile.currency}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-secondary-container px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/50">
                          <Icon name="savings" className="text-[16px] text-on-secondary-container" />
                        </div>
                        <span className="text-body-md text-on-secondary-container">{t('home.savings')}</span>
                      </div>
                      <span className="text-label-md font-semibold text-on-secondary-container">{fmt(profile.savings)} {profile.currency}</span>
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
        </motion.div>
      </div>
    </>
  )
}

function Alerts({ data, loading, error, goAi, onViewArticle, t }) {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? data.alerts : data.alerts?.filter((a) => a.type === filter)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.015em] text-on-surface md:text-[32px]">{t('alerts.title')}</h1>
        <p className="mt-2 max-w-[60ch] text-body-md leading-relaxed text-on-surface-variant">{t('alerts.subtitle')}</p>
      </div>

      <div className="flex items-center gap-2">
        {['all', 'law', 'news'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-label-md font-semibold transition ${filter === f ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
          >
            {t(`alerts.filter.${f}`)}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={data.reload} t={t} />}

      {loading && (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}

      {!loading && !error && filtered?.length === 0 && (
        <div className="rounded-[12px] border border-outline-variant bg-white p-10 text-center">
          <Icon name="inbox" className="mb-3 text-[32px] text-on-surface-variant" />
          <p className="text-body-md text-on-surface-variant">{t('alerts.empty')}</p>
        </div>
      )}

      {!loading && filtered?.map((a, i) => (
        <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.25 }}>
          <AlertCard alert={a} onExplain={goAi} onView={onViewArticle} t={t} />
        </motion.div>
      ))}
    </div>
  )
}

function Money({ data, error, reload, t, lang }) {
  const profile = data.profile ?? null
  const goal = data.goals?.[0] ?? null
  const [showManual, setShowManual] = useState(false)
  const [manualType, setManualType] = useState(null)
  const [manualAmount, setManualAmount] = useState('')
  const [showGoalPicker, setShowGoalPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const income = profile ? Number(profile.monthly_income ?? 0) : 0
  const expenses = profile ? Number(profile.monthly_expenses ?? 0) : 0
  const savings = profile ? Number(profile.savings ?? 0) : 0
  const advice = getAdvice({ income, expenses, savings, goal })

  const saveManual = async () => {
    const amount = Number(manualAmount)
    if (!manualType || !Number.isFinite(amount) || amount <= 0) return
    setSaving(true)
    try {
      if (manualType === 'income') {
        await api.updateProfile(income + amount, expenses, savings)
      } else if (manualType === 'expense') {
        await api.updateProfile(income, expenses + amount, Math.max(savings - amount, 0))
      }
      setManualAmount('')
      setManualType(null)
      setShowManual(false)
      reload()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleVoiceResult = async (result) => {
    if (!result.amount) return
    try {
      if (result.type === 'income') {
        await api.updateProfile(income + result.amount, expenses, savings)
      } else if (result.type === 'expense') {
        await api.updateProfile(income, expenses + result.amount, Math.max(savings - result.amount, 0))
      }
      reload()
    } catch (err) {
      console.error(err)
    }
  }

  const handleGoalSelect = async (goalData) => {
    try {
      await api.createGoal(goalData)
      setShowGoalPicker(false)
      reload()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onRetry={reload} t={t} />}

      <MoneyAdvisor t={t} lang={lang} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[16px] border border-secondary/20 bg-secondary-container p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/50">
            <Icon name="lightbulb" fill className="text-[20px] text-on-secondary-container" />
          </div>
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-on-secondary-container/70">Today's advice</p>
            <p className="mt-1 text-body-md font-medium leading-relaxed text-on-secondary-container">
              {t(advice.key, advice.params)}
            </p>
          </div>
        </div>
      </motion.div>

      <VoiceInput onResult={handleVoiceResult} t={t} />

      {showManual && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-[16px] border border-outline-variant bg-white p-5"
        >
          <div className="flex gap-2">
            <button
              onClick={() => setManualType('income')}
              className={`flex-1 rounded-full px-4 py-2.5 text-label-md font-semibold transition ${manualType === 'income' ? 'bg-secondary text-white' : 'bg-surface-container-low text-on-surface-variant'}`}
            >
              Money In
            </button>
            <button
              onClick={() => setManualType('expense')}
              className={`flex-1 rounded-full px-4 py-2.5 text-label-md font-semibold transition ${manualType === 'expense' ? 'bg-error text-white' : 'bg-surface-container-low text-on-surface-variant'}`}
            >
              Money Out
            </button>
          </div>
          <input
            type="number"
            min="0"
            step="100"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            placeholder="Amount in CFA"
            className="w-full rounded-full border border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          <button
            onClick={saveManual}
            disabled={!manualType || !manualAmount || saving}
            className="btn-duo btn-duo--primary w-full px-4 py-3 text-label-md disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => { setShowManual(true); setManualType('income'); setShowGoalPicker(false) }}
          className="flex flex-col items-center gap-2 rounded-[16px] border border-outline-variant bg-white p-4 transition hover:border-secondary/40 hover:shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container">
            <Icon name="arrow_downward" className="text-[24px] text-on-secondary-container" />
          </div>
          <span className="text-caption font-semibold text-on-surface">Money In</span>
        </button>
        <button
          onClick={() => { setShowManual(true); setManualType('expense'); setShowGoalPicker(false) }}
          className="flex flex-col items-center gap-2 rounded-[16px] border border-outline-variant bg-white p-4 transition hover:border-error/40 hover:shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container">
            <Icon name="arrow_upward" className="text-[24px] text-on-error-container" />
          </div>
          <span className="text-caption font-semibold text-on-surface">Money Out</span>
        </button>
        <button
          onClick={() => { setShowGoalPicker(true); setShowManual(false) }}
          className="flex flex-col items-center gap-2 rounded-[16px] border border-outline-variant bg-white p-4 transition hover:border-primary/40 hover:shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container">
            <Icon name="flag" className="text-[24px] text-on-primary-container" />
          </div>
          <span className="text-caption font-semibold text-on-surface">Goal</span>
        </button>
      </div>

      {showGoalPicker && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[16px] border border-outline-variant bg-white p-5"
        >
          <h3 className="mb-4 text-label-md font-semibold text-on-surface">What are you saving toward?</h3>
          <GoalPicker onSelect={handleGoalSelect} t={t} />
        </motion.div>
      )}

      {goal && (
        <div className="rounded-[16px] border border-outline-variant bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="text-[32px]">{goal.emoji || '🎯'}</span>
            <div>
              <h3 className="text-body-lg font-semibold text-on-surface">{goal.name}</h3>
              <p className="text-caption text-on-surface-variant">
                {fmt(goal.current_amount)} / {fmt(goal.target_amount)} CFA
              </p>
            </div>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, (goal.current_amount / goal.target_amount) * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function AskAI({ t, pendingExplain, clearPending, guestMode, onSignIn }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [displayed, setDisplayed] = useState({ simple_terms: '', why_it_matters: '', checks: [] })
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [fileObj, setFileObj] = useState(null)
  const stopRef = useRef(false)
  // Monotonic generation: when a new request starts, every callback from an
  // older request (typewriter loop, upload stream) becomes a no-op instead of
  // interleaving two answers into the same displayed state.
  const generationRef = useRef(0)
  const fileInputRef = useRef(null)
  const suggestions = ['ai.suggestion1', 'ai.suggestion2', 'ai.suggestion3']

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const stopTyping = () => {
    stopRef.current = true
    setTyping(false)
    setLoading(false)
  }

  const mapError = (msg) => {
    if (!msg) return 'Une erreur est survenue. Réessayez.'
    if (msg.includes('JSON') || msg.includes('json') || msg.includes('Unexpected token')) return 'Le service IA a répondu dans un format inattendu. Réessayez dans un instant.'
    if (msg.includes('502') || msg.includes('AI provider')) return 'Le service IA est temporairement indisponible. Réessayez dans quelques secondes.'
    if (msg.includes('Network') || msg.includes('fetch')) return 'Problème de connexion. Vérifiez votre internet et réessayez.'
    return msg
  }

  const typeOut = async (full) => {
    stopRef.current = false
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setDisplayed({ simple_terms: full.simple_terms || '', why_it_matters: full.why_it_matters || '', checks: full.checks || [] })
      setTyping(false)
      return
    }
    setDisplayed({ simple_terms: '', why_it_matters: '', checks: [] })
    setTyping(true)
    let cur = ''
    for (const w of (full.simple_terms || '').split(/(\s+)/)) {
      if (stopRef.current) break
      if (!w) continue
      cur += w
      const snap = cur
      setDisplayed((d) => ({ ...d, simple_terms: snap }))
      await sleep(18)
    }
    cur = ''
    for (const w of (full.why_it_matters || '').split(/(\s+)/)) {
      if (stopRef.current) break
      if (!w) continue
      cur += w
      const snap = cur
      setDisplayed((d) => ({ ...d, why_it_matters: snap }))
      await sleep(18)
    }
    for (const chk of (full.checks || [])) {
      if (stopRef.current) break
      let chkCur = ''
      setDisplayed((d) => ({ ...d, checks: [...d.checks, ''] }))
      for (const w of chk.split(/(\s+)/)) {
        if (stopRef.current) break
        if (!w) continue
        chkCur += w
        const snap = chkCur
        setDisplayed((d) => {
          const copy = [...d.checks]
          copy[copy.length - 1] = snap
          return { ...d, checks: copy }
        })
        await sleep(18)
      }
      await sleep(60)
    }
    setTyping(false)
  }

  const runExplain = async (msg) => {
    const gen = ++generationRef.current
    stopRef.current = true
    setLoading(true)
    setError(null)
    setAnswer(null)
    setDisplayed({ simple_terms: '', why_it_matters: '', checks: [] })
    try {
      const data = await api.explain(msg)
      if (generationRef.current !== gen) return
      setAnswer({ sources: data.sources || [], disclaimer: data.disclaimer || '', money_link: data.money_link || '', stub: data.stub })
      setLoading(false)
      await typeOut(data)
    } catch (err) {
      if (generationRef.current !== gen) return
      setError(mapError(err.message))
      setLoading(false)
    }
  }

  const runUpload = async (file, msg) => {
    const gen = ++generationRef.current
    stopRef.current = true
    setLoading(true)
    setTyping(true)
    setError(null)
    setAnswer(null)
    setDisplayed({ simple_terms: '', why_it_matters: '', checks: [] })
    let acc = { simple_terms: '', why_it_matters: '', checks: [] }
    let currentSection = 'simple_terms'
    let checksBuffer = ''
    try {
      await api.explainUploadStream(file, msg || question, {
        onToken: ({ token, section }) => {
          if (generationRef.current !== gen) return
          if (section && section !== currentSection) {
            // flush previous
            if (currentSection === 'checks' && checksBuffer) {
              acc.checks.push(checksBuffer.trim())
              checksBuffer = ''
            }
            currentSection = section
          }
          if (section === 'checks') {
            if (token === '\n') {
              if (checksBuffer.trim()) {
                acc.checks.push(checksBuffer.trim())
                checksBuffer = ''
              }
              setDisplayed({ simple_terms: acc.simple_terms, why_it_matters: acc.why_it_matters, checks: [...acc.checks] })
            } else {
              checksBuffer += token
              // show buffer as last check preview
              const preview = [...acc.checks, checksBuffer]
              setDisplayed({ simple_terms: acc.simple_terms, why_it_matters: acc.why_it_matters, checks: preview })
            }
          } else if (section === 'simple_terms') {
            acc.simple_terms += token
            setDisplayed({ ...acc, checks: [...acc.checks] })
          } else if (section === 'why_it_matters') {
            acc.why_it_matters += token
            setDisplayed({ ...acc, checks: [...acc.checks] })
          }
        },
        onDone: (data) => {
          if (generationRef.current !== gen) return
          if (checksBuffer.trim() && !acc.checks.includes(checksBuffer.trim())) {
            acc.checks.push(checksBuffer.trim())
            setDisplayed({ simple_terms: acc.simple_terms, why_it_matters: acc.why_it_matters, checks: [...acc.checks] })
          }
          setAnswer({ sources: data.sources || [], disclaimer: data.disclaimer || '', money_link: data.money_link || '', stub: data.stub })
          setLoading(false)
          setTyping(false)
        },
        onError: (msg) => {
          if (generationRef.current !== gen) return
          setError(mapError(msg))
          setLoading(false)
          setTyping(false)
        },
      })
    } catch (err) {
      setError(mapError(err.message))
      setLoading(false)
      setTyping(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (fileObj) {
      await runUpload(fileObj, question)
      return
    }
    if (!question.trim()) return
    await runExplain(question)
  }

  const handleFile = (f) => {
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setError('Fichier trop volumineux (max 10 Mo)'); return }
    setFileObj(f)
    setFileName(f.name)
    setError(null)
  }

  useEffect(() => {
    if (!pendingExplain) return
    const msg = typeof pendingExplain === 'string'
      ? pendingExplain
      : `Explique cette actualité en français simple — Titre: ${pendingExplain.title} — Résumé: ${pendingExplain.summary} — Source: ${pendingExplain.source_name} — Effectif: ${pendingExplain.effective_date}`
    setQuestion(msg)
    runExplain(msg)
    clearPending?.()
  }, [pendingExplain])

  if (guestMode) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.015em] text-on-surface md:text-[32px]">{t('ai.title')}</h1>
          <p className="mt-2 max-w-[60ch] text-body-md leading-relaxed text-on-surface-variant">{t('ai.subtitle')}</p>
        </div>
        <section className="rounded-[20px] border border-outline-variant bg-white p-8 text-center ambient-shadow">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-container">
            <Icon name="lock" className="text-[32px] text-on-secondary-container" />
          </div>
          <h2 className="text-[20px] font-bold text-on-surface">{t('ai.signInRequired')}</h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-body-md leading-relaxed text-on-surface-variant">
            {t('ai.signInRequiredDesc')}
          </p>
          <button
            onClick={() => onSignIn?.()}
            className="btn-duo btn-duo--primary mt-6 px-8 py-3 text-label-md"
          >
            {t('ai.signInCta')} <Icon name="arrow_forward" className="text-[18px]" />
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.015em] text-on-surface md:text-[32px]">{t('ai.title')}</h1>
        <p className="mt-2 max-w-[60ch] text-body-md leading-relaxed text-on-surface-variant">{t('ai.subtitle')}</p>
      </div>

      <section className="rounded-[20px] border border-outline-variant bg-white p-6 ambient-shadow">
        <form onSubmit={submit}>
          <label htmlFor="ai-query" className="mb-2 block text-label-md font-semibold text-on-surface">
            {t('ai.yourDoc')}
          </label>
          <textarea
            id="ai-query"
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('ai.placeholder')}
            className="w-full resize-y rounded-[12px] border border-outline-variant bg-white px-4 py-3 text-body-md leading-relaxed text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          {/* Duolingo-style file drop — premade 3D-feel card */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files?.[0]; if(f) handleFile(f)}}
            className={`mt-4 flex items-center justify-between gap-3 rounded-[12px] border-2 border-dashed p-3 transition ${dragOver ? 'border-secondary/40 bg-secondary-container/40' : 'border-outline-variant bg-surface-container-low/60'} ${fileName ? 'border-secondary/40 bg-secondary-container/40' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${fileName ? 'bg-secondary text-white' : 'bg-white text-on-surface-variant border border-outline-variant'}`}>
                <Icon name={fileName ? 'description' : 'upload_file'} className="text-[20px]" />
              </div>
              <div className="min-w-0">
                <div className="text-label-md font-semibold text-on-surface truncate">{fileName ? fileName : 'Glissez un PDF, image ou scan ici'}</div>
                <div className="text-caption text-on-surface-variant">{fileName ? 'Prêt à analyser, ajoutez une question si besoin' : 'PDF, JPG, PNG · max 10 Mo · OCR automatique'}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {fileName && (
                <button type="button" onClick={() => { setFileObj(null); setFileName(null)}} className="btn-duo btn-duo--white px-3 py-1.5 text-caption">Retirer</button>
              )}
              <label
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
                className="btn-duo btn-duo--white px-4 py-2 text-caption cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Icon name="folder_open" className="text-[16px]" /> Choisir
                <input ref={fileInputRef} type="file" accept=".pdf,image/*,.txt,.docx" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading || (!question.trim() && !fileObj)}
              className={`btn-duo btn-duo--secondary px-6 py-3 text-label-md disabled:opacity-50 ${loading ? 'btn-loading-sweep btn-loading-pulse' : ''}`}
            >
              {loading ? (
                <><span role="status" aria-live="polite" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> {t('ai.thinking')}</>
              ) : fileObj ? (
                <><Icon name="auto_awesome" className="text-[16px]" /> Analyser le document</>
              ) : (
                <><Icon name="send" className="text-[16px]" /> {t('ai.explain')}</>
              )}
            </button>
            {(loading || typing) && (
              <button
                type="button"
                onClick={stopTyping}
                className="btn-duo btn-duo--white px-4 py-2 text-caption"
              >
                Stop
              </button>
            )}
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuestion(t(s))}
                className="btn-duo btn-duo--ghost px-3.5 py-2 text-caption"
              >
                {t(s)}
              </button>
            ))}
          </div>
          {fileName && <p className="mt-2 text-caption text-secondary font-medium flex items-center gap-1.5"><Icon name="check_circle" className="text-[14px]" /> Document chargé — il sera analysé avec votre question.</p>}
        </form>
      </section>

      {error && <ErrorBanner message={error} onRetry={() => { if (fileObj) runUpload(fileObj, question); else if (question.trim()) runExplain(question); else setError(null)}} t={t} />}

      {(loading || typing || displayed.simple_terms) && (
        <section className="rounded-[12px] border border-outline-variant bg-white p-6 ambient-shadow">
          <div role="status" aria-live="polite" className="mb-3 flex items-center gap-2 text-caption font-medium text-secondary">
            <Icon name="verified" className="text-[14px]" /> {loading || typing ? 'Génération en cours...' : t('ai.basedOn')}
            {(loading || typing) && <span aria-hidden="true" className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-secondary" />}
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
                    <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />{check}
                  </li>
                ))}
              </ul>
            </>
          )}
          {answer?.money_link && (
            <>
              <h4 className="mb-1.5 mt-6 flex items-center gap-1.5 text-label-md font-semibold text-on-surface">
                <Icon name="savings" className="text-[16px] text-secondary" />{t('ai.moneyImpact')}
              </h4>
              <p className="rounded-[12px] bg-secondary-container/40 p-4 text-body-md leading-relaxed text-on-surface">{answer.money_link}</p>
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
                      {s.detail ? ` · ${s.detail}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {answer?.disclaimer && (
            <p className="mt-6 flex items-start gap-2 rounded-[12px] border border-outline-variant bg-surface-container-low p-4 text-caption leading-relaxed text-on-surface-variant">
              <Icon name="shield" className="mt-0.5 shrink-0 text-[16px] text-secondary" />
              <span>{answer.disclaimer}</span>
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
  const [saveError, setSaveError] = useState(null)

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
    setSaveError(null)
    try {
      await api.savePreferences(interests, lang)
      setSaved(true)
      reload()
    } catch (err) {
      setSaveError(err.message)
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

      <div className="space-y-5 rounded-[12px] border border-outline-variant bg-white p-6 ambient-shadow">
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
              </option>
            ))}
          </select>
          {lang === 'fon' && (
            <p className="mt-2 text-caption leading-relaxed text-on-surface-variant">
              {t('auth.fonDraft')}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-[12px] border border-outline-variant bg-white p-6 ambient-shadow">
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
                  className={`btn-duo px-4 py-2 text-label-md ${
                    active
                      ? 'btn-duo--mint !border-secondary font-bold'
                      : 'btn-duo--white text-on-surface-variant'
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
          className="btn-duo btn-duo--primary px-6 py-2.5 text-label-md disabled:opacity-50"
        >
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-caption font-medium text-secondary">
            <Icon name="check_circle" className="text-[16px]" /> {t('profile.saved')}
          </span>
        )}
        {saveError && (
          <p role="alert" className="text-caption font-medium text-error">{saveError}</p>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('moncheck-lang') || 'fr' } catch { return 'fr' }
  })
  const setLangPersist = useCallback((code) => {
    setLang(code)
    try { localStorage.setItem('moncheck-lang', code) } catch {}
  }, [])
  const [guestMode, setGuestMode] = useState(false)
  const [pendingExplain, setPendingExplain] = useState(null)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [reminders, setReminders] = useState([])
  const [state, setState] = useState({
    alerts: null,
    profile: null,
    goals: null,
    preferences: null,
    loading: true,
    error: null,
  })

  const t = useCallback((key, params) => translate(lang, key, params), [lang])

  // Adopt the server-stored language at most once, and only when the user
  // hasn't chosen one on this device — otherwise the 60s poll / visibility
  // reload would revert an unsaved language change mid-edit (guests share the
  // demo row, whose language is always 'fr').
  const serverLangApplied = useRef(false)

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const [alerts, profile, goals, preferences, reminders] = await Promise.all([
        api.alerts(),
        api.financialProfile(),
        api.goals(),
        api.preferences(),
        api.reminders().catch(() => []),
      ])
      setState({ alerts, profile, goals, preferences, loading: false, error: null })
      setReminders(reminders)
      if (preferences?.language && !serverLangApplied.current) {
        serverLangApplied.current = true
        let localLang = null
        try { localLang = localStorage.getItem('moncheck-lang') } catch {}
        if (!localLang) setLangPersist(preferences.language)
      }
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err.message }))
    }
  }, [setLangPersist])

  useEffect(() => {
    load()
  }, [load])

  // Apply answers collected by the pre-signup onboarding survey (email-last flow).
  // Language and role/goal are device-level: they apply instantly so guests see
  // a personalized Home too. Topics are saved to the server only after auth
  // (see the `moncheck-authed` listener below) so they persist under the
  // signed-in user instead of the shared demo row.
  useEffect(() => {
    const pending = readPendingOnboarding()
    if (!pending) return
    if (pending.lang) setLangPersist(pending.lang)
    const pendingGoals = Array.isArray(pending.goals) ? pending.goals : pending.goal ? [pending.goal] : []
    if (pending.role || pendingGoals.length) {
      try { localStorage.setItem('moncheck-profile', JSON.stringify({ role: pending.role || null, goals: pendingGoals })) } catch {}
    }
  }, [setLangPersist])

  useEffect(() => {
    const id = setInterval(() => load(), 60000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [load])

  useEffect(() => {
    const onAuthed = () => {
      const pending = readPendingOnboarding()
      if (pending && Array.isArray(pending.topics) && pending.topics.length) {
        api.savePreferences(pending.topics, pending.lang || undefined).catch(() => {})
      }
      if (pending) {
        clearPendingOnboarding()
      }
      load()
    }
    window.addEventListener('moncheck-authed', onAuthed)
    return () => window.removeEventListener('moncheck-authed', onAuthed)
  }, [load])

  useEffect(() => {
    try { document.documentElement.lang = lang } catch {}
  }, [lang])

  const goAi = (payload) => {
    if (typeof payload === 'string' && payload.trim()) {
      setPendingExplain({ title: payload.trim(), summary: '', source_name: '', effective_date: '' })
    } else if (payload && payload.title) {
      setPendingExplain(payload)
    }
    setTab('ai')
  }
  const clearPending = () => setPendingExplain(null)
  const openArticle = (alert) => setSelectedAlert(alert)
  const closeArticle = () => setSelectedAlert(null)
  const askAboutArticle = (alert) => { setSelectedAlert(null); goAi(alert) }
  const data = { ...state, reload: load }

  const handleGuestLogin = () => {
    // Guests have no `moncheck-authed` moment, so consume the pre-signup
    // survey answers right here: language and role/goals personalize the Home
    // immediately instead of waiting for the next reload.
    const pending = readPendingOnboarding()
    if (pending) {
      if (pending.lang) setLangPersist(pending.lang)
      const pendingGoals = Array.isArray(pending.goals) ? pending.goals : pending.goal ? [pending.goal] : []
      if (pending.role || pendingGoals.length) {
        try { localStorage.setItem('moncheck-profile', JSON.stringify({ role: pending.role || null, goals: pendingGoals })) } catch {}
      }
      clearPendingOnboarding()
    }
    setGuestMode(true)
  }

  const handleExitGuest = () => {
    setGuestMode(false)
    clearAuthHash()
  }

  const shell = (
    <div className="flex min-h-screen flex-col md:flex-row">
      {CLERK_ACTIVE && <AuthTokenBridge />}
      <header className="sticky top-0 z-40 flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between border-b border-outline-variant/60 bg-white/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
        <div>
          <div className="text-[18px] font-bold tracking-tight text-on-surface"><LogoWordmark /></div>
          <div className="text-caption leading-none text-on-surface-variant">{t('app.tagline')}</div>
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <Icon name="notifications" className="text-[22px]" />
          <TopBarUser guestMode={guestMode} onExitGuest={handleExitGuest} />
        </div>
      </header>

      <nav className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-outline-variant bg-white p-4 md:flex">
        <div className="kente-strip absolute inset-x-0 top-0" aria-hidden="true" />
        <div className="mb-8 px-2">
          <div className="flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <LogoWordmark className="text-[19px] font-extrabold tracking-tight text-on-surface" />
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
          <UserBadge guestMode={guestMode} onExitGuest={handleExitGuest} />
        </div>
      </nav>

      <main className="min-h-screen w-full pb-[calc(6rem+env(safe-area-inset-bottom))] md:ml-64 md:pb-8">
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-outline-variant/60 bg-white/80 px-8 backdrop-blur-md md:flex">
          <div className="text-[18px] font-semibold tracking-tight text-on-surface">{t(NAV_ITEMS.find((n) => n.id === tab)?.key ?? 'nav.home')}</div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            <span className="hidden items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-caption font-medium lg:inline-flex"><Icon name="verified" className="text-[14px] text-secondary" /> Sources vérifiées</span>
            <Icon name="notifications" className="text-[20px]" />
            <TopBarUser guestMode={guestMode} onExitGuest={handleExitGuest} />
          </div>
        </header>

        <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 md:px-8 md:py-8">
          {selectedAlert ? (
            <AlertDetail alert={selectedAlert} onBack={closeArticle} onAsk={askAboutArticle} t={t} />
          ) : (
            <>
              {(tab === 'home' || tab === 'alerts') && (
                <LawReminderBanner
                  reminders={reminders}
                  onLearnMore={(reminder) => goAi(reminder)}
                  t={t}
                />
              )}
              {tab === 'home' && <Home data={data} loading={state.loading} error={state.error} goAi={goAi} onViewArticle={openArticle} t={t} />}
              {tab === 'alerts' && <Alerts data={data} loading={state.loading} error={state.error} goAi={goAi} onViewArticle={openArticle} t={t} />}
              {tab === 'money' && <Money data={data} loading={state.loading} error={state.error} reload={load} t={t} lang={lang} />}
              {tab === 'ai' && <AskAI t={t} pendingExplain={pendingExplain} clearPending={clearPending} guestMode={guestMode} onSignIn={() => { window.location.hash = '#/welcome' }} />}
              {tab === 'profile' && <Profile data={data} loading={state.loading} error={state.error} reload={load} t={t} lang={lang} setLang={setLangPersist} />}
            </>
          )}
          <footer className="border-t border-outline-variant/60 pt-6 text-center">
            <div className="text-label-md font-semibold text-on-surface"><LogoWordmark /></div>
            <p className="mx-auto mt-1 max-w-[48ch] text-caption leading-relaxed text-on-surface-variant">{t('footer.safety')}</p>
          </footer>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center justify-around border-t border-outline-variant bg-white px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
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
              <span className="text-xs font-semibold leading-none">{t(item.key)}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )

  if (!CLERK_ACTIVE || guestMode) return shell

  // Clerk OAuth redirects back to `/sso-callback` (see Auth.jsx handleOAuth).
  // This must render Clerk's callback component so the session is finalized
  // client-side. Previously vercel.json rewrote this path to the API, which
  // just 302'd to `/` without a session — landing page instead of the app.
  if (typeof window !== 'undefined' && window.location.pathname === '/sso-callback') {
    return <SsoCallbackScreen />
  }

  return (
    <>
      <ClerkLoading>
        <Splash />
      </ClerkLoading>
      <SignedOut>
        <SignedOutLanding
          t={t}
          lang={lang}
          onGuestLogin={handleGuestLogin}
          currentLang={lang}
          onLangChange={setLangPersist}
        />
      </SignedOut>
      <SignedIn>
        {shell}
        <DisclaimerModal t={t} />
      </SignedIn>
    </>
  )
}
