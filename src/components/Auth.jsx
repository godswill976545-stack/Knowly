import { motion, useReducedMotion } from 'motion/react'
import { SignedIn, SignedOut, SignIn, SignUp, UserButton, useUser } from '@clerk/clerk-react'
import { LANGUAGES, translate } from '../i18n/index.js'
import { useEffect } from 'react'

const Icon = ({ name, className = '', fill = false }) => (
  <span className={`material-symbols-outlined ${fill ? 'ms-fill' : ''} ${className}`}>{name}</span>
)

const clerkAppearance = {
  variables: {
    fontFamily: "'Inter', system-ui, sans-serif",
    colorPrimary: '#131b2e',
    colorBackground: '#ffffff',
    colorText: '#0b1c30',
    colorInputBackground: '#ffffff',
    colorInputText: '#0b1c30',
    colorNeutral: '#0b1c30',
    colorNeutralForeground: '#0b1c30',
    colorNeutralBackground: '#f8f9ff',
    borderRadius: '0.75rem',
  },
  elements: {
    formButton: {
      background: '#131b2e',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '600',
      borderRadius: '9999px',
      padding: '12px 24px',
      boxShadow: '0 8px 20px rgba(19,27,46,0.10)',
      '&:hover': { background: '#1e2a4a' },
    },
    formButtonSecondary: {
      background: '#ffffff',
      color: '#0b1c30',
      fontSize: '14px',
      fontWeight: '500',
      borderRadius: '9999px',
      padding: '12px 24px',
    },
    socialActionButton: {
      borderRadius: '9999px',
      borderColor: '#c6c6cd',
      background: '#ffffff',
    },
    dividerLine: { backgroundColor: '#c6c6cd' },
    headerTitle: { color: '#0b1c30', fontWeight: '700', fontSize: '24px' },
    headerSubtitle: { color: '#45464d' },
    formFieldInput: {
      borderRadius: '9999px',
      borderColor: '#c6c6cd',
      padding: '12px 16px',
      fontSize: '15px',
      '&:focus-within': { borderColor: '#131b2e', boxShadow: '0 0 0 2px rgba(19,27,46,.08)' },
    },
    formFieldLabel: { color: '#0b1c30', fontWeight: '600', fontSize: '14px' },
    formFieldAction: { color: '#131b2e', fontWeight: '600' },
    identityPreview: { borderRadius: '9999px' },
    modalBg: { backgroundColor: '#ffffff' },
  },
  layout: { socialOptionsPlacement: 'bottom' },
}

function AuthHero({ isSignUp }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col justify-between p-10 text-white"
    >
      <div>
        <div className="inline-flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-lg">
            <Icon name="gavel" className="text-[20px]" />
          </div>
          <span className="text-[20px] font-bold tracking-tight">Knowly</span>
        </div>
        <p className="mt-1 text-body-md text-white/60">Guide juridique & financier — Bénin</p>

        <div className="mt-12 space-y-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Icon name="gavel" className="text-[18px]" />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold leading-tight">Comprenez les lois du Bénin</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/70">Alertes quotidiennes, sources officielles, explications sans jargon.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Icon name="savings" className="text-[18px]" />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold leading-tight">Gérez votre argent en toute clarté</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/70">Revenus, dépenses, épargne et objectifs — en CFA, sans formule cachée.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Icon name="auto_awesome" className="text-[18px]" />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold leading-tight">Une IA qui cite ses sources</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/70">Collez un document, obtenez une réponse en 4 parties avec les articles officiels.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-[26px] font-bold">248 000 <span className="text-sm font-medium text-white/60">CFA</span></span>
          <span className="text-caption text-white/60">épargnés aujourd'hui</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[62%] rounded-full bg-secondary" />
        </div>
        <div className="mt-2 text-caption text-white/60">62 % de l'objectif — Ordinateur portable</div>
      </div>

      <p className="mt-6 text-center text-caption leading-relaxed text-white/60">
        Sécurité juridique Knowly : ceci est un guide, pas un avis juridique. Vérifiez les décisions importantes auprès de l'autorité compétente.
      </p>
    </motion.div>
  )
}

function AuthSide() {
  return (
    <div className="relative hidden w-full max-w-[42%] items-center justify-center overflow-hidden bg-primary p-8 md:flex md:flex-col md:justify-between md:p-12">
      <AuthHero isSignUp={false} />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-[520px] w-[520px] rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-tl-full bg-gradient-to-br from-white/5 to-transparent" />
    </div>
  )
}

function SignInCard({ t }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[420px] rounded-2xl border border-outline-variant bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
    >
      <div className="mb-6 text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <Icon name="gavel" className="text-[20px]" />
          </div>
        </div>
        <h1 className="text-[22px] font-bold text-on-surface">Bienvenue sur Knowly</h1>
        <p className="mt-1.5 text-sm text-on-surface-variant">Connectez-vous pour accéder à votre espace juridique et financier.</p>
      </div>

      <SignIn
        routing="virtual"
        signUpUrl="#/sign-up"
        fallbackRedirectUrl="/"
        appearance={clerkAppearance}
        afterSignUpUrl="/"
      />

      <div className="mt-6 text-center">
        <button
          onClick={() => (window.location.hash = '')}
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-[14px]" /> Retour à l'accueil
        </button>
      </div>
    </motion.div>
  )
}

function SignUpCard({ t }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[420px] rounded-2xl border border-outline-variant bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
    >
      <div className="mb-6 text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <Icon name="gavel" className="text-[20px]" />
          </div>
        </div>
        <h1 className="text-[22px] font-bold text-on-surface">Créer votre compte Knowly</h1>
        <p className="mt-1.5 text-sm text-on-surface-variant">Gratuit · 30 secondes · Bénin d'abord</p>
      </div>

      <SignUp
        routing="virtual"
        signInUrl="#/sign-in"
        fallbackRedirectUrl="/"
        appearance={clerkAppearance}
        afterSignUpUrl="/"
      />

      <div className="mt-6 text-center">
        <button
          onClick={() => (window.location.hash = '')}
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-[14px]" /> Retour à l'accueil
        </button>
      </div>
    </motion.div>
  )
}

// fallback when Clerk not configured — show a styled placeholder card so the UI is never "boring"
function AuthFallback({ isSignUp }) {
  const reduce = useReducedMotion()
  const [email, setEmail] = useState('')
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[420px] rounded-2xl border border-outline-variant bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
    >
      <div className="mb-6 text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <Icon name="gavel" className="text-[20px]" />
          </div>
        </div>
        <h1 className="text-[22px] font-bold text-on-surface">
          {isSignUp ? 'Créer votre compte Knowly' : 'Bienvenue sur Knowly'}
        </h1>
        <p className="mt-1.5 text-sm text-on-surface-variant">
          {isSignUp ? 'Gratuit · 30 secondes · Bénin d’abord' : 'Connectez-vous pour accéder à votre espace.'}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          alert(isSignUp ? 'Clerk est requis pour créer un compte.' : 'Clerk est requis pour vous connecter.')
        }}
        className="space-y-4"
      >
        <div>
          <label className="mb-1.5 block text-label-md font-semibold text-on-surface">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className="w-full rounded-full border border-outline-variant bg-white px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-primary py-3 text-label-md font-semibold text-white transition hover:bg-[#1e2a4a] active:scale-[0.98]"
        >
          {isSignUp ? 'Créer mon compte' : 'Me connecter'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => (window.location.hash = '')}
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-[14px]" /> Retour à l'accueil
        </button>
      </div>
    </motion.div>
  )
}

import { useState } from 'react'

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export default function AuthScreen({ t }) {
  const hash = useHashRoute()
  const isSignUp = hash.includes('sign-up')
  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

  if (!clerkKey && isSignUp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <AuthSide />
        <AuthFallback isSignUp />
      </div>
    )
  }
  if (!clerkKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <AuthSide />
        <AuthFallback isSignUp={false} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-surface p-4 md:p-0">
      <AuthSide />
      <div className="flex min-h-screen flex-1 items-center justify-center p-6 md:min-h-0 md:max-w-[58%] md:justify-end">
        {isSignUp ? <SignUpCard t={t} /> : <SignInCard t={t} />}
      </div>
    </div>
  )
}
