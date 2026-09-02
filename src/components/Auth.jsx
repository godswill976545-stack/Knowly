import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import { LANGUAGES } from '../i18n/index.js'

const CLERK_ACTIVE = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

const Icon = ({ name, className = '', fill = false }) => (
  <span className={`material-symbols-outlined ${fill ? 'ms-fill' : ''} ${className}`}>{name}</span>
)

function GoogleIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

function AppleIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 0.6-2.65 1.35-.58.66-1.09 1.73-0.95 2.76 1.01.08 2.05-.51 2.67-1.26z" />
    </svg>
  )
}

function AuthContent({
  onGuestLogin,
  currentLang = 'fr',
  onLangChange,
  clerkLoaded = false,
  signIn = null,
  signUp = null,
  setActive = null,
}) {
  const [tab, setTab] = useState(() => (window.location.hash.includes('sign-up') ? 'sign-up' : 'sign-in'))
  const reduce = useReducedMotion()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [verifying, setVerifying] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')

  const switchTab = (newTab) => {
    setTab(newTab)
    setError(null)
    setSuccess(null)
    setVerifying(false)
    window.location.hash = `#/${newTab}`
  }

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return 0
    let score = 0
    if (pass.length >= 8) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1
    return score
  }
  const passStrength = getPasswordStrength(password)

  // Handlers
  const handleOAuth = async (provider = 'oauth_google') => {
    setError(null)
    setLoading(true)
    try {
      if (clerkLoaded && (signIn || signUp)) {
        const target = tab === 'sign-in' ? signIn : signUp
        await target.authenticateWithRedirect({
          strategy: provider,
          redirectUrl: window.location.origin + '/api/sso-callback',
          redirectUrlComplete: window.location.origin + '/',
        })
      } else {
        onGuestLogin?.()
        window.location.hash = ''
      }
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Erreur de connexion sociale')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Veuillez renseigner votre email et mot de passe.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      if (clerkLoaded && signIn) {
        const result = await signIn.create({
          identifier: email,
          password: password,
        })
        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId })
          window.location.hash = ''
        } else {
          setError(`Action requise. Statut : ${result.status}`)
        }
      } else {
        onGuestLogin?.()
        window.location.hash = ''
      }
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Identifiants invalides')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Veuillez renseigner tous les champs obligatoires.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      if (clerkLoaded && signUp) {
        const firstName = name ? name.split(' ')[0] : 'Citoyen'
        const lastName = name ? name.split(' ').slice(1).join(' ') : ''
        await signUp.create({
          emailAddress: email,
          password: password,
          firstName,
          lastName: lastName || undefined,
        })
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
        setVerifying(true)
        setSuccess(`Un code de validation a été envoyé à ${email}`)
      } else {
        onGuestLogin?.()
        window.location.hash = ''
      }
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    if (!verificationCode) return
    setError(null)
    setLoading(true)
    try {
      if (clerkLoaded && signUp) {
        const completeSignUp = await signUp.attemptEmailAddressVerification({ code: verificationCode })
        if (completeSignUp.status === 'complete') {
          await setActive({ session: completeSignUp.createdSessionId })
          window.location.hash = ''
        } else {
          setError('Vérification incomplète. Statut : ' + completeSignUp.status)
        }
      } else {
        onGuestLogin?.()
        window.location.hash = ''
      }
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Code de vérification incorrect')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoAccess = () => {
    onGuestLogin?.()
    window.location.hash = ''
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface md:flex-row">
      {/* LEFT HERO PANEL (Desktop Branding) */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-primary p-8 text-white md:w-[45%] md:p-12 lg:w-[42%] lg:p-14">
        {/* Background decorative ambient glows */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10">
          {/* Top Brand Logo */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-md">
                <Icon name="gavel" className="text-[22px]" />
              </div>
              <div>
                <span className="text-[20px] font-bold tracking-tight text-white">Knowly</span>
                <span className="block text-[11px] font-medium tracking-wide text-white/60">Guide juridique & financier · Bénin</span>
              </div>
            </div>

            {/* Quick Lang Switch */}
            {onLangChange && (
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-[11px]">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => onLangChange(l.code)}
                    className={`rounded-full px-2.5 py-0.5 font-medium transition ${
                      currentLang === l.code ? 'bg-white text-primary font-bold shadow-sm' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {l.code.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tagline & Official Verified Badge */}
          <div className="mt-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1 text-[12px] font-medium text-white/90">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sources officielles vérifiées (gouv.bj, SGG, DGI)</span>
            </div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-white lg:text-[34px]">
              Vos droits expliqués en <span className="text-secondary italic">clair</span>. Votre argent en ordre.
            </h1>
            <p className="mt-3 text-body-md leading-relaxed text-white/75">
              Rejoignez les citoyens, entrepreneurs et salariés qui utilisent Knowly pour décrypter les lois béninoises et développer leur épargne.
            </p>
          </div>

          {/* Feature Bullets */}
          <div className="mt-10 space-y-4">
            <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-secondary">
                <Icon name="verified_user" className="text-[18px]" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-white">Lois & fiscalité sans jargon</h3>
                <p className="mt-0.5 text-caption leading-relaxed text-white/70">
                  Décrets, impôts, baux et contrats résumés en 30 secondes avec citations exactes des articles.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-secondary">
                <Icon name="savings" className="text-[18px]" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-white">Gestion de budget en Francs CFA</h3>
                <p className="mt-0.5 text-caption leading-relaxed text-white/70">
                  Suivi personnalisé de vos revenus, dépenses, capacité d'épargne et objectifs en FCFA.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-secondary">
                <Icon name="smart_toy" className="text-[18px]" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-white">Assistant IA & OCR de documents</h3>
                <p className="mt-0.5 text-caption leading-relaxed text-white/70">
                  Scannez ou collez une décision administrative ou une quittance pour une analyse immédiate.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Safety & Trust Note */}
        <div className="relative z-10 mt-8 border-t border-white/10 pt-6">
          <div className="flex items-center justify-between text-caption text-white/60">
            <span className="flex items-center gap-1.5">
              <Icon name="lock" className="text-[14px] text-emerald-400" /> Données 100% chiffrées & privées
            </span>
            <span>Bénin · 2026</span>
          </div>
        </div>
      </div>

      {/* RIGHT AUTH FORM PANEL */}
      <div className="flex flex-1 flex-col justify-between bg-surface p-6 sm:p-10 md:p-12 lg:p-16">
        {/* Top Header / Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => (window.location.hash = '')}
            className="btn-duo btn-duo--white group px-4 py-2 text-label-md"
          >
            <Icon name="arrow_back" className="text-[16px] transition-transform group-hover:-translate-x-0.5" />
            <span>Retour à l'accueil</span>
          </button>

          <button
            onClick={handleDemoAccess}
            className="btn-duo btn-duo--mint px-3.5 py-1.5 text-caption"
          >
            <Icon name="bolt" className="text-[16px] text-secondary" /> Mode Démo Direct
          </button>
        </div>

        {/* Center Container */}
        <div className="mx-auto w-full max-w-[460px] py-8">
          {/* Segmented Tab Switcher */}
          <div className="relative mb-8 flex rounded-full border border-outline-variant bg-surface-container-low p-1.5 shadow-sm">
            <button
              onClick={() => switchTab('sign-in')}
              className={`relative z-10 flex-1 rounded-full py-2.5 text-center text-label-md font-semibold transition ${
                tab === 'sign-in' ? 'text-white' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab === 'sign-in' && (
                <motion.div
                  layoutId="auth-tab-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              Se connecter
            </button>
            <button
              onClick={() => switchTab('sign-up')}
              className={`relative z-10 flex-1 rounded-full py-2.5 text-center text-label-md font-semibold transition ${
                tab === 'sign-up' ? 'text-white' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab === 'sign-up' && (
                <motion.div
                  layoutId="auth-tab-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              Créer un compte
            </button>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-[24px] font-bold tracking-tight text-on-surface">
              {verifying
                ? 'Vérifiez votre adresse email'
                : tab === 'sign-in'
                ? 'Bienvenue sur Knowly'
                : 'Rejoignez Knowly gratuitement'}
            </h2>
            <p className="mt-1.5 text-body-md text-on-surface-variant">
              {verifying
                ? 'Entrez le code à 6 chiffres envoyé à votre adresse e-mail.'
                : tab === 'sign-in'
                ? 'Accédez à vos alertes juridiques et votre espace financier.'
                : 'Accès instantané aux textes de lois expliqués et outils d\'épargne.'}
            </p>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-6 flex items-start gap-2.5 rounded-2xl border border-error/20 bg-error-container/40 p-3.5 text-caption text-on-error-container"
              >
                <Icon name="error" className="mt-0.5 shrink-0 text-[18px] text-error" />
                <span className="leading-snug">{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-6 flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50 p-3.5 text-caption text-emerald-800"
              >
                <Icon name="check_circle" className="mt-0.5 shrink-0 text-[18px] text-emerald-600" />
                <span className="leading-snug">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Verification Code Form Step */}
          {verifying ? (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <label className="mb-2 block text-label-md font-semibold text-on-surface">Code de validation</label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.trim())}
                  placeholder="123456"
                  className="w-full tracking-[0.4em] text-center text-[24px] font-bold rounded-2xl border border-outline-variant bg-white px-4 py-3.5 text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length < 6}
                className="btn-duo btn-duo--primary w-full justify-center py-3.5 text-label-md shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Validation en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Valider mon inscription</span>
                    <Icon name="check" className="text-[18px]" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setVerifying(false)}
                className="w-full text-center text-caption font-medium text-on-surface-variant hover:text-on-surface"
              >
                ← Revenir au formulaire d'inscription
              </button>
            </form>
          ) : (
            <>
              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuth('oauth_google')}
                  disabled={loading}
                  className="btn-duo btn-duo--white flex flex-1 items-center justify-center gap-2 py-3 text-label-md"
                >
                  <GoogleIcon className="h-4 w-4" />
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth('oauth_apple')}
                  disabled={loading}
                  className="btn-duo btn-duo--white flex flex-1 items-center justify-center gap-2 py-3 text-label-md"
                >
                  <AppleIcon className="h-4 w-4" />
                  <span>Apple</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant/70" />
                </div>
                <span className="relative bg-surface px-4 text-caption font-medium text-on-surface-variant">
                  ou avec votre adresse e-mail
                </span>
              </div>

              {/* Main Custom Input Form */}
              <form onSubmit={tab === 'sign-in' ? handleSignIn : handleSignUp} className="space-y-4">
                {/* Full Name for Sign Up */}
                {tab === 'sign-up' && (
                  <motion.div
                    initial={reduce ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="mb-1.5 block text-label-md font-semibold text-on-surface">Nom complet</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Grace Mensah"
                        className="w-full rounded-full border border-outline-variant bg-white pl-11 pr-4 py-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                        required={tab === 'sign-up'}
                      />
                      <Icon name="person" className="pointer-events-none absolute left-4 top-3.5 text-[18px] text-outline" />
                    </div>
                  </motion.div>
                )}

                {/* Email Address */}
                <div>
                  <label className="mb-1.5 block text-label-md font-semibold text-on-surface">Adresse e-mail</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="koffi@exemple.bj"
                      className="w-full rounded-full border border-outline-variant bg-white pl-11 pr-4 py-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      required
                    />
                    <Icon name="mail" className="pointer-events-none absolute left-4 top-3.5 text-[18px] text-outline" />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-label-md font-semibold text-on-surface">Mot de passe</label>
                    {tab === 'sign-in' && (
                      <a
                        href="#/sign-in"
                        onClick={(e) => {
                          e.preventDefault()
                          alert('Un lien de réinitialisation sera envoyé à votre adresse email.')
                        }}
                        className="text-caption font-semibold text-primary hover:underline"
                      >
                        Mot de passe oublié ?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-full border border-outline-variant bg-white pl-11 pr-12 py-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      required
                    />
                    <Icon name="lock" className="pointer-events-none absolute left-4 top-3.5 text-[18px] text-outline" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3 text-on-surface-variant hover:text-on-surface"
                      tabIndex={-1}
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                    </button>
                  </div>

                  {/* Password Strength Indicator (on Sign Up) */}
                  {tab === 'sign-up' && password && (
                    <div className="mt-2.5 space-y-1">
                      <div className="flex gap-1.5">
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${passStrength >= 1 ? 'bg-error' : 'bg-surface-container-high'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${passStrength >= 2 ? 'bg-yellow-400' : 'bg-surface-container-high'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${passStrength >= 3 ? 'bg-emerald-500' : 'bg-surface-container-high'}`} />
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        {passStrength <= 1 && 'Mot de passe faible (minimum 8 caractères)'}
                        {passStrength === 2 && 'Moyen (ajoutez des chiffres ou majuscules)'}
                        {passStrength >= 3 && 'Excellent mot de passe sécurisé'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Remember Me & Terms */}
                {tab === 'sign-in' ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/20"
                    />
                    <label htmlFor="remember" className="text-caption text-on-surface-variant cursor-pointer">
                      Se souvenir de moi sur cet appareil
                    </label>
                  </div>
                ) : (
                  <div className="text-caption leading-relaxed text-on-surface-variant pt-1">
                    En créant un compte, vous acceptez le{' '}
                    <span className="font-semibold text-on-surface">guide citoyen et la charte de confidentialité</span> de Knowly.
                  </div>
                )}

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-duo btn-duo--primary mt-2 w-full justify-center py-3.5 text-label-md shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>{tab === 'sign-in' ? 'Connexion en cours...' : 'Création du compte...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{tab === 'sign-in' ? 'Se connecter à Knowly' : 'Créer mon compte gratuit'}</span>
                      <Icon name="arrow_forward" className="text-[18px]" />
                    </>
                  )}
                </button>
              </form>

              {/* Instant Demo Access Button */}
              <div className="mt-5 border-t border-outline-variant/60 pt-5">
                <button
                  type="button"
                  onClick={handleDemoAccess}
                  className="group flex w-full items-center justify-between rounded-2xl border border-secondary/30 bg-secondary-container/40 p-3.5 transition hover:bg-secondary-container/70 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-white">
                      <Icon name="visibility" className="text-[16px]" />
                    </div>
                    <div className="text-left">
                      <div className="text-label-md font-bold text-on-secondary-container">Explorer en mode Démo</div>
                      <div className="text-[11px] text-on-secondary-container/80">Accès direct sans inscription</div>
                    </div>
                  </div>
                  <Icon name="chevron_right" className="text-[20px] text-secondary transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {/* Toggle Tab Footer */}
              <div className="mt-6 text-center text-caption text-on-surface-variant">
                {tab === 'sign-in' ? (
                  <span>
                    Pas encore de compte ?{' '}
                    <button onClick={() => switchTab('sign-up')} className="font-bold text-primary hover:underline">
                      Créer un compte gratuit
                    </button>
                  </span>
                ) : (
                  <span>
                    Vous avez déjà un compte ?{' '}
                    <button onClick={() => switchTab('sign-in')} className="font-bold text-primary hover:underline">
                      Se connecter
                    </button>
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-caption text-on-surface-variant/80">
          Knowly Bénin · Guide d'information et d'éducation juridique & financière.
        </div>
      </div>
    </div>
  )
}

function ClerkAuthForm(props) {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn()
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp()
  const clerkLoaded = Boolean(isSignInLoaded && isSignUpLoaded)
  const setActive = setSignInActive || setSignUpActive

  return (
    <AuthContent
      {...props}
      clerkLoaded={clerkLoaded}
      signIn={signIn}
      signUp={signUp}
      setActive={setActive}
    />
  )
}

function DirectAuthForm(props) {
  return <AuthContent {...props} clerkLoaded={false} signIn={null} signUp={null} setActive={null} />
}

export default function AuthScreen(props) {
  if (CLERK_ACTIVE) {
    return <ClerkAuthForm {...props} />
  }
  return <DirectAuthForm {...props} />
}
