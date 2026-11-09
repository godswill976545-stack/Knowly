import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import { useSignIn } from '@clerk/clerk-react'
import { LANGUAGES } from '../i18n/index.js'
import { LogoMark, LogoWordmark } from './Logo.jsx'
import Ad15s from './Ad15s.jsx'

const CLERK_ACTIVE = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

const Icon = ({ name, className = '', fill = false }) => (
  <span className={`material-symbols-outlined ${fill ? 'ms-fill' : ''} ${className}`}>{name}</span>
)

function LandingNav({ onSignIn, onLogin, loginBusy, tr }) {
  const clerkActive = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
  const [open, setOpen] = useState(false)
  return (
    <nav className="sticky top-0 z-50 flex h-[64px] items-center justify-between border-b border-outline-variant/60 bg-white/80 px-4 backdrop-blur-md md:px-10">
      <div className="kente-strip absolute inset-x-0 bottom-0" aria-hidden="true" />
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <LogoWordmark className="text-[19px] font-extrabold tracking-tight text-on-surface" />
          <span className="hidden text-caption text-outline md:inline">{tr('landing.navTagline')}</span>
        </div>
        <div className="hidden items-center gap-6 lg:flex">
          <a href="#features" className="text-label-md text-on-surface-variant hover:text-on-surface">{tr('landing.navFeatures')}</a>
          <a href="#sources" className="text-label-md text-on-surface-variant hover:text-on-surface">{tr('landing.navSources')}</a>
          <a href="#how" className="text-label-md text-on-surface-variant hover:text-on-surface">{tr('landing.navHow')}</a>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <a href="#how" className="hidden text-label-md text-on-surface-variant hover:text-on-surface md:inline">{tr('landing.navDiscover')}</a>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-outline-variant bg-white text-on-surface lg:hidden"
          aria-expanded={open}
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'menu'} className="text-[20px]" />
        </button>
        {clerkActive ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={onLogin} disabled={loginBusy} className="btn-duo btn-duo--white min-h-[44px] px-4 py-2.5 text-label-md disabled:opacity-60">
              {tr('landing.login')}
            </button>
            <a href="#/welcome" className="btn-duo btn-duo--primary hidden min-h-[44px] items-center px-5 py-2.5 text-label-md sm:inline-flex">
              {tr('landing.getStarted')}
            </a>
          </div>
        ) : (
          <a href="#/welcome" onClick={(e) => { e.preventDefault(); onSignIn?.() }} className="btn-duo btn-duo--primary min-h-[44px] px-5 py-2.5 text-label-md">
            {tr('landing.getStarted')}
          </a>
        )}
      </div>
      {open && (
        <div className="absolute inset-x-4 top-[72px] rounded-[12px] border border-outline-variant bg-white p-2 shadow-md lg:hidden">
          <a href="#features" onClick={() => setOpen(false)} className="block rounded-[12px] px-4 py-3 text-label-md text-on-surface hover:bg-surface-container-low">{tr('landing.navFeatures')}</a>
          <a href="#sources" onClick={() => setOpen(false)} className="block rounded-[12px] px-4 py-3 text-label-md text-on-surface hover:bg-surface-container-low">{tr('landing.navSources')}</a>
          <a href="#how" onClick={() => setOpen(false)} className="block rounded-[12px] px-4 py-3 text-label-md text-on-surface hover:bg-surface-container-low">{tr('landing.navHow')}</a>
          <button type="button" onClick={() => { setOpen(false); onLogin?.() }} className="block w-full rounded-[12px] px-4 py-3 text-left text-label-md font-semibold text-primary hover:bg-surface-container-low">{tr('landing.login')}</button>
        </div>
      )}
    </nav>
  )
}

function Hero({ tr, onLogin }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [6, -6]), { stiffness: 80, damping: 20 })
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-8, 8]), { stiffness: 80, damping: 20 })
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseMove = (e) => {
    if (reduce) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    mouseX.set(e.clientX - cx)
    mouseY.set(e.clientY - cy)
  }
  const handleLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
    setIsHovering(false)
  }

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 px-4 py-10 md:grid-cols-2 md:gap-10 md:px-10 md:py-14 lg:py-16">
        <div className="flex flex-col justify-center">
           <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary-container px-3 py-1.5 shadow-sm">
             <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
            <span className="text-caption font-semibold tracking-wide text-on-secondary-container">{tr('landing.badge')}</span>
          </div>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[14ch] text-[32px] font-bold leading-[0.95] tracking-[-0.02em] text-on-surface md:text-[44px] lg:text-[52px]"
          >
            {tr('landing.h1a')} <span className="mark-highlight text-primary">{tr('landing.h1mark')}</span> {tr('landing.h1b')}
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 max-w-[42ch] text-body-md leading-relaxed text-on-surface-variant"
          >
            {tr('landing.heroSub')}
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
<a href="#/welcome" className="btn-duo btn-duo--primary min-h-[44px] px-7 py-3.5 text-[15px] focus-visible:ring-2 focus-visible:ring-primary">
               {tr('landing.ctaStart')} <Icon name="arrow_forward" className="text-[18px]" />
             </a>
             <a href="#features" className="btn-duo btn-duo--white min-h-[44px] px-5 py-3 text-label-md focus-visible:ring-2 focus-visible:ring-primary">
               {tr('landing.ctaHow')}
             </a>
          </motion.div>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-caption text-on-surface-variant">
            <span className="flex items-center gap-1.5"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container"><Icon name="verified" className="text-[14px]" /></span> {tr('landing.chipJargon')}</span>
            <span className="h-3 w-px bg-outline-variant" />
            <span className="flex items-center gap-1.5"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"><Icon name="lock" className="text-[14px]" /></span> {tr('landing.chipPrivate')}</span>
            <span className="h-3 w-px bg-outline-variant" />
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-on-surface shadow-sm border border-outline-variant">{tr('landing.chipLangs')}</span>
          </div>
          <div className="mt-3 text-caption text-on-surface-variant">
            {tr('landing.alreadyHave')}{' '}
            <button type="button" onClick={onLogin} className="font-bold text-primary hover:underline">
              {tr('landing.loginLink')}
            </button>
          </div>
        </div>

<div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={handleLeave}
          className="relative perspective-1000"
        >
          <motion.div
            style={reduce ? {} : { rotateX, rotateY }}
            onHoverStart={() => setIsHovering(true)}
            className="relative preserve-3d will-change-transform"
          >
            <div
              className={`relative overflow-hidden rounded-[16px] border border-outline-variant bg-white shadow-card transition-[box-shadow]_200ms_ease-out ${isHovering ? 'shadow-lift' : ''}`}
              style={{ transform: 'translateZ(0)' }}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e] shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-caption font-semibold tracking-wide text-on-surface-variant shadow-sm border border-outline-variant/60">
                  <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" /> moncheck.bj · Pub 15s
                </span>
                <Icon name="more_horiz" className="text-outline" />
              </div>
              {/* 15s product ad — self-contained component, EN|FR toggle + replay */}
              <div className="ad-stage bg-surface-container-low" style={{ minHeight: 460, height: 480 }}>
                <Ad15s />
              </div>
            </div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.2 }}
              style={{ transform: 'translateZ(40px)' }}
              className="absolute -bottom-5 left-6 hidden rounded-[12px] border border-primary/20 bg-primary-container px-3 py-2.5 shadow-sm md:flex items-center gap-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-white shadow-sm"><Icon name="shield" className="text-[16px]" /></div>
              <div><div className="text-caption font-black text-on-surface leading-none">100% vérifié</div><div className="text-xs font-medium text-on-surface-variant">Source gouv.bj</div></div>
            </motion.div>


          </motion.div>

          {/* bottom glow */}
          <div className="pointer-events-none absolute -bottom-6 left-6 right-6 h-8 rounded-full bg-black/[0.06] blur-xl" />
        </div>
      </div>
    </section>
  )
}

function LogoWall({ tr }) {
  return (
    <section id="sources" className="border-y border-outline-variant/50 bg-surface-container-low">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-10">
        <span className="text-caption font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{tr('landing.sourcesLabel')}</span>
        <div className="flex flex-wrap items-center gap-3 text-caption font-medium text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm"><span className="h-2 w-2 rounded-full bg-secondary" /> gouv.bj</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm"><span className="h-2 w-2 rounded-full bg-secondary" /> sgg.gouv.bj</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm"><span className="h-2 w-2 rounded-full bg-primary" /> Journal officiel</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm"><span className="h-2 w-2 rounded-full bg-primary" /> Lois & Décrets</span>
        </div>
        <span className="text-caption text-on-surface-variant">{tr('landing.sourcesNote')}</span>
      </div>
    </section>
  )
}

function BentoFeatures({ tr }) {
  return (
    <section id="features" className="mx-auto max-w-[1280px] px-4 py-12 md:px-10 md:py-16">
      <div className="max-w-[60ch]">
        <h2 className="text-[28px] font-bold leading-none tracking-[-0.02em] text-on-surface md:text-[36px]">Tout ce qui compte, expliqué simplement.</h2>
        <p className="mt-3 max-w-[52ch] text-body-md leading-relaxed text-on-surface-variant">Pas de jargon. Pas de bluff. Juste ce que dit la loi, ce que ça change pour vous, et quoi vérifier ensuite.</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="home-hero-card relative overflow-hidden rounded-[16px] border border-white/15 p-6 text-white md:col-span-12 md:p-8 shadow-card">
          <div className="relative z-10 max-w-[42ch]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-caption font-medium"><Icon name="gavel" className="text-[14px]" /> Droit & réglementation</div>
            <h3 className="text-[22px] font-semibold leading-tight md:text-[24px]">Chaque changement, sourcé.</h3>
            <p className="mt-2 text-body-md leading-relaxed text-white/80">Alertes quotidiennes depuis les journaux officiels. Catégorie, date d'effet, lien original — rien n'est inventé.</p>
            <ul className="mt-4 space-y-1.5 text-body-md text-white/85">
              <li className="flex items-center gap-2"><Icon name="check" className="text-[16px] text-secondary-container" /> Filtrage par vos centres d'intérêt</li>
              <li className="flex items-center gap-2"><Icon name="check" className="text-[16px] text-secondary-container" /> Sévérité et source visible d'un coup d'œil</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-[16px] border border-secondary/15 bg-secondary-container p-6 md:col-span-5 shadow-sm">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 text-on-secondary-container shadow-sm"><Icon name="savings" /></div>
            <h3 className="mt-4 text-headline-md text-on-secondary-container">{tr('landing.moneyTitle')}</h3>
            <p className="mt-2 text-body-md leading-relaxed text-on-secondary-container/80">{tr('landing.moneyDesc')}</p>
          </div>
          <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-caption"><span className="text-on-surface-variant">Objectif</span><span className="font-semibold text-on-surface">62%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full w-[62%] rounded-full bg-secondary" /></div>
            <div className="mt-2 flex justify-between text-caption text-on-surface-variant"><span>248 000 CFA</span><span>400 000 CFA</span></div>
          </div>
        </div>
        <div className="rounded-[12px] border border-outline-variant bg-white p-6 md:col-span-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container"><Icon name="smart_toy" /></div>
          <h3 className="mt-4 text-headline-md text-on-surface">{tr('landing.aiTitle')}</h3>
          <p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">{tr('landing.aiDesc')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-outline-variant px-3 py-1 text-caption">{tr('landing.aiExample1')}</span>
            <span className="rounded-full border border-outline-variant px-3 py-1 text-caption">{tr('landing.aiExample2')}</span>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[12px] border border-outline-variant bg-surface-container-low p-6 md:col-span-12">
          <div className="relative">
            <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wide text-secondary"><Icon name="notifications" className="text-[16px]" /> {tr('landing.alertsKicker')}</div>
            <h3 className="mt-2 text-headline-md text-on-surface">{tr('landing.alertsTitle')}</h3>
            <p className="mt-2 max-w-[52ch] text-body-md leading-relaxed text-on-surface-variant">{tr('landing.alertsDesc')}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white p-3 shadow-sm"><div className="text-headline-md font-bold text-on-surface">{tr('landing.stat1v')}</div><div className="text-caption text-on-surface-variant">{tr('landing.stat1l')}</div></div>
              <div className="rounded-xl bg-white p-3 shadow-sm"><div className="text-headline-md font-bold text-on-surface">{tr('landing.stat2v')}</div><div className="text-caption text-on-surface-variant">{tr('landing.stat2l')}</div></div>
              <div className="rounded-xl bg-white p-3 shadow-sm"><div className="text-headline-md font-bold text-on-surface">{tr('landing.stat3v')}</div><div className="text-caption text-on-surface-variant">{tr('landing.stat3l')}</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks({ tr }) {
  const steps = [
    { n: '01', title: tr('landing.step1t'), desc: tr('landing.step1d'), icon: 'tune' },
    { n: '02', title: tr('landing.step2t'), desc: tr('landing.step2d'), icon: 'inbox' },
    { n: '03', title: tr('landing.step3t'), desc: tr('landing.step3d'), icon: 'auto_awesome' },
  ]
  return (
    <section id="how" className="bg-white">
      <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-10 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-on-surface md:text-[32px]">{tr('landing.howTitle')}</h2>
          <p className="max-w-[36ch] text-body-md text-on-surface-variant">{tr('landing.howSub')}</p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.n} className={`relative rounded-[12px] border border-outline-variant p-6 ${i === 1 ? 'bg-white shadow-sm' : 'bg-surface-container-low'}`}>
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container shadow-sm text-on-secondary-container"><Icon name={s.icon} className="text-[18px]" /></div>
                <span className="text-caption font-semibold tracking-wide text-outline">{s.n}</span>
              </div>
              <h3 className="mt-5 text-label-md font-semibold text-on-surface">{s.title}</h3>
              <p className="mt-1.5 text-body-md leading-relaxed text-on-surface-variant">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Trust({ tr }) {
  const reduce = useReducedMotion()
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-10 md:px-10">
      <div className="relative overflow-hidden flex flex-col gap-6 rounded-[12px] border border-white/10 bg-primary p-6 text-white md:flex-row md:items-center md:justify-between md:p-8">
        <div aria-hidden="true" className="afro-pattern-cream pointer-events-none absolute inset-0 opacity-15" />
        <div className="relative z-10 max-w-[52ch]">
          <h3 className="text-headline-md">{tr('landing.trustTitle')}</h3>
          <p className="mt-2 text-body-md leading-relaxed text-white/75">{tr('landing.trustDesc')}</p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-label-md font-semibold text-white"><Icon name="shield" className="text-[16px]" /> {tr('landing.trustPill1')}</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-label-md text-white"><Icon name="verified_user" className="text-[16px]" /> {tr('landing.trustPill2')}</span>
        </div>
      </div>
    </section>
  )
}

function FinalCTA({ tr }) {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pb-12 md:px-10">
      <div className="rounded-[12px] border border-outline-variant bg-surface-container-low p-8 text-center md:p-12">
        <h2 className="mx-auto max-w-[18ch] text-[30px] font-bold leading-none tracking-[-0.02em] text-on-surface md:text-[40px]">{tr('landing.ctaTitle')}</h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-body-md text-on-surface-variant">{tr('landing.ctaSub')}</p>
        <div className="mt-6 flex justify-center">
<a href="#/welcome" className="btn-duo btn-duo--primary min-h-[44px] px-7 py-3.5 text-label-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary">
             {tr('landing.ctaBtn')} <Icon name="arrow_forward" className="text-[18px]" />
           </a>
        </div>
        <p className="mt-3 text-caption text-on-surface-variant">{tr('landing.ctaNote')}</p>
      </div>
    </section>
  )
}

function LanguagePickerBar({ onLangChange }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('moncheck-lang') || 'fr' } catch { return 'fr' }
  })
  return (
    <div className="border-b border-outline-variant/50 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-2 md:px-10">
        <span className="text-caption font-medium text-on-surface-variant">Choisir la langue / Choose language</span>
        <div className="flex items-center gap-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); try { localStorage.setItem('moncheck-lang', l.code) } catch {}; onLangChange?.(l.code) }}
              className={`rounded-full px-3 py-1.5 text-caption font-semibold transition ${lang === l.code ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
              aria-pressed={lang === l.code}
            >
              {l.shortLabel || l.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Landing({ onSignIn, onLangChange, t }) {
  const tr = t || ((k) => k)
  const { isLoaded, signIn } = useSignIn()
  const [loginBusy, setLoginBusy] = useState(false)

  // Direct sign-in for returning users — skips the onboarding survey entirely.
  const loginWithGoogle = async () => {
    if (!CLERK_ACTIVE || !isLoaded || !signIn) {
      window.location.hash = '#/welcome'
      return
    }
    setLoginBusy(true)
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + '/',
      })
    } catch {
      setLoginBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <LandingNav onSignIn={onSignIn} onLogin={loginWithGoogle} loginBusy={loginBusy} tr={tr} />
      <LanguagePickerBar onLangChange={onLangChange} />
      <Hero tr={tr} onLogin={loginWithGoogle} />
      <LogoWall tr={tr} />
      <BentoFeatures tr={tr} />
      <HowItWorks tr={tr} />
      <Trust tr={tr} />
      <FinalCTA tr={tr} />
      <footer className="border-t border-outline-variant bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-6 text-caption text-on-surface-variant md:flex-row md:items-center md:justify-between md:px-10">
          <span className="font-semibold text-on-surface"><LogoWordmark /> · {tr('landing.footerTag')}</span>
          <span>{tr('landing.footerLegal')}</span>
        </div>
      </footer>
    </div>
  )
}
