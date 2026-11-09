import { useState } from 'react'
import { useSignUp } from '@clerk/clerk-react'
import { LANGUAGES } from '../i18n/index.js'
import { LogoMark, LogoWordmark } from './Logo.jsx'

const CLERK_ACTIVE = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
)

const ROLES = [
  { id: 'student', icon: 'school' },
  { id: 'employee', icon: 'badge' },
  { id: 'entrepreneur', icon: 'storefront' },
]

const GOALS = [
  { id: 'rights', icon: 'gavel' },
  { id: 'savings', icon: 'savings' },
  { id: 'business', icon: 'business_center' },
]

// Role → suggested alert topics (user can still adjust freely in step 3)
export const ROLE_TOPICS = {
  student: ['Education', 'Money', 'Employment'],
  employee: ['Employment', 'Taxes', 'Money'],
  entrepreneur: ['Business', 'Taxes', 'Banking'],
}

export const INTEREST_OPTIONS = ['Money', 'Taxes', 'Employment', 'Business', 'Banking', 'Transport', 'Housing', 'Education']

function Chip({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2.5 text-label-md transition active:scale-[0.98] ${
        active
          ? 'border-secondary bg-secondary-container font-bold text-on-secondary-container shadow-sm'
          : 'border-outline-variant bg-white text-on-surface-variant hover:border-secondary/50'
      }`}
    >
      {icon && <Icon name={icon} className="text-[18px]" />}
      {label}
    </button>
  )
}

export function savePendingOnboarding(data) {
  try { localStorage.setItem('moncheck-onboarding', JSON.stringify(data)) } catch {}
}

export function readPendingOnboarding() {
  try {
    const raw = localStorage.getItem('moncheck-onboarding')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearPendingOnboarding() {
  try { localStorage.removeItem('moncheck-onboarding') } catch {}
}

export default function OnboardingSurvey({ t, lang, onLangChange, onGuestLogin }) {
  const { isLoaded, signUp } = useSignUp()
  const [step, setStep] = useState(0)
  const [role, setRole] = useState(null)
  const [goals, setGoals] = useState([])
  const [topics, setTopics] = useState(INTEREST_OPTIONS.slice(0, 0))
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState(null)

  const tr = t || ((k) => k)

  const pickRole = (id) => {
    setRole(id)
    // Pre-check suggested topics only if the user hasn't customized yet
    if (topics.length === 0) setTopics(ROLE_TOPICS[id] || [])
  }

  // Goals are multi-select: ordinary users rarely fit one box — "understand
  // my rights" and "grow my savings" often go together.
  const toggleGoal = (id) => {
    setGoals((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleTopic = (topic) => {
    setTopics((prev) => (prev.includes(topic) ? prev.filter((x) => x !== topic) : [...prev, topic]))
  }

  const returnToApp = () => {
    try { window.history.pushState(null, '', window.location.pathname + window.location.search) } catch {}
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  const skipToApp = () => {
    savePendingOnboarding({ lang, role, goals, topics })
    onGuestLogin?.()
    returnToApp()
  }

  // Final step: Google IS the sign-up/sign-in flow. The survey answers are
  // stored first and applied to the user's account once Clerk redirects back
  // to /sso-callback (see the `moncheck-authed` handler in App.jsx). Google
  // supplies the email, so the survey never asks for one.
  const startGoogleSignIn = async () => {
    savePendingOnboarding({ lang, role, goals, topics })
    if (!CLERK_ACTIVE || !isLoaded || !signUp) {
      // No Clerk configured (local dev without keys): continue as guest.
      onGuestLogin?.()
      returnToApp()
      return
    }
    setAuthLoading(true)
    setAuthError(null)
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + '/',
      })
    } catch (err) {
      setAuthError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Google sign-in failed. Please try again.')
      setAuthLoading(false)
    }
  }

  const steps = [tr('onboard.langTitle'), tr('onboard.roleTitle'), tr('onboard.interestsTitle'), tr('onboard.saveProgress')]

  return (
    <>
      <div className="kente-strip w-full" aria-hidden="true" />
      <div className="mx-auto flex min-h-[calc(100vh-8px)] w-full max-w-[560px] flex-col px-4 py-8 md:py-12">
      <div className="mb-2 flex items-center gap-2">
        <LogoMark className="h-7 w-7" />
        <LogoWordmark className="text-[18px] font-extrabold tracking-tight text-on-surface" />
      </div>

      <h1 className="mt-4 text-[26px] font-bold tracking-[-0.015em] text-on-surface">{tr('onboard.title')}</h1>
      <p className="mt-1 text-body-md text-on-surface-variant">{tr('onboard.subtitle')}</p>

      {/* Progress */}
      <div className="mt-5 flex items-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= Math.min(step, 2) ? 'bg-secondary' : 'bg-surface-container-high'}`} />
        ))}
      </div>
      <p className="mt-2 text-caption font-medium text-on-surface-variant">
        {step < 3 ? tr('onboard.stepOf', { n: Math.min(step + 1, 3) }) : tr('onboard.saveProgress')}
      </p>

      <div className="mt-6 flex-1">
        {step === 0 && (
          <div className="grid grid-cols-2 gap-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => { onLangChange?.(l.code); try { localStorage.setItem('moncheck-lang', l.code) } catch {} }}
                aria-pressed={lang === l.code}
                className={`flex min-h-[56px] items-center justify-between rounded-[12px] border p-4 text-label-md transition active:scale-[0.98] ${
                  lang === l.code
                    ? 'border-secondary bg-secondary-container font-bold text-on-secondary-container shadow-sm'
                    : 'border-outline-variant bg-white text-on-surface hover:border-secondary/50'
                }`}
              >
                {l.label}
                {lang === l.code && <Icon name="check_circle" className="text-[20px] text-secondary" />}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-label-md font-semibold text-on-surface">{steps[1]}</h2>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <Chip key={r.id} active={role === r.id} onClick={() => pickRole(r.id)} icon={r.icon} label={tr(`onboard.role${r.id[0].toUpperCase()}${r.id.slice(1)}`)} />
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-label-md font-semibold text-on-surface">{tr('onboard.goalTitle')}</h2>
              <p className="mb-3 text-caption text-on-surface-variant">{tr('onboard.goalHint')}</p>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <Chip key={g.id} active={goals.includes(g.id)} onClick={() => toggleGoal(g.id)} icon={g.icon} label={tr(`onboard.goal${g.id[0].toUpperCase()}${g.id.slice(1)}`)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-1 text-label-md font-semibold text-on-surface">{steps[2]}</h2>
            <p className="mb-3 text-caption text-on-surface-variant">{tr('onboard.interestsHint')}</p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((topic) => (
                <Chip key={topic} active={topics.includes(topic)} onClick={() => toggleTopic(topic)} label={topic} />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-container">
              <Icon name="savings" className="text-[32px] text-on-secondary-container" />
            </div>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-on-surface">{tr('onboard.saveProgress')}</h2>
              <p className="mx-auto mt-2 max-w-[42ch] text-body-md leading-relaxed text-on-surface-variant">{tr('onboard.saveDesc')}</p>
            </div>
            <button
              type="button"
              onClick={startGoogleSignIn}
              disabled={authLoading}
              className="btn-duo btn-duo--white flex w-full items-center justify-center gap-3 px-6 py-3.5 text-label-md shadow-md disabled:opacity-60"
            >
              {authLoading ? (
                <><span role="status" aria-live="polite" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> {tr('onboard.connectingGoogle')}</>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  {tr('onboard.saveWithGoogle')}
                </>
              )}
            </button>
            {authError && <p role="alert" className="text-caption font-medium text-error">{authError}</p>}
            <button type="button" onClick={skipToApp} className="text-caption font-semibold text-on-surface-variant hover:text-on-surface">
              {tr('onboard.skipForNow')}
            </button>
            <p className="text-xs text-on-surface-variant">{tr('onboard.saveFooter')}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <div>
          {step > 0 && step < 3 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-duo btn-duo--white px-5 py-2.5 text-label-md">
              {tr('onboard.back')}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {step < 2 && (
            <button type="button" onClick={skipToApp} className="text-caption font-semibold text-on-surface-variant hover:text-on-surface">
              {tr('onboard.skip')}
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && (!role || goals.length === 0)}
              className="btn-duo btn-duo--primary px-6 py-3 text-label-md disabled:opacity-50"
            >
              {tr('onboard.continue')} <Icon name="arrow_forward" className="text-[18px]" />
            </button>
          )}
        </div>
      </div>
      </div>
    </>
  )
}
