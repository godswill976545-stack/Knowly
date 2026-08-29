import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useRef, useState } from 'react'

const Icon = ({ name, className = '', fill = false }) => (
  <span className={`material-symbols-outlined ${fill ? 'ms-fill' : ''} ${className}`}>{name}</span>
)

function LandingNav({ onSignIn }) {
  const clerkActive = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
  return (
    <nav className="sticky top-0 z-50 flex h-[64px] items-center justify-between border-b border-outline-variant/60 bg-white/80 px-4 backdrop-blur-md md:px-10">
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Icon name="gavel" className="text-[18px]" />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-on-surface">Knowly</span>
          <span className="hidden text-caption text-outline md:inline">Guide juridique & financier — Bénin</span>
        </div>
        <div className="hidden items-center gap-6 lg:flex">
          <a href="#features" className="text-label-md text-on-surface-variant hover:text-on-surface">Fonctionnalités</a>
          <a href="#sources" className="text-label-md text-on-surface-variant hover:text-on-surface">Sources</a>
          <a href="#how" className="text-label-md text-on-surface-variant hover:text-on-surface">Comment ça marche</a>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <a href="#how" className="hidden text-label-md text-on-surface-variant hover:text-on-surface md:inline">Découvrir</a>
        {clerkActive ? (
          <a
            href="#/sign-in"
            className="btn-duo btn-duo--dark px-5 py-2.5 text-label-md"
          >
            Ouvrir Knowly
          </a>
        ) : (
          <a
            href="#/sign-in"
            onClick={(e) => { e.preventDefault(); onSignIn?.() }}
            className="btn-duo btn-duo--dark px-5 py-2.5 text-label-md"
          >
            Ouvrir Knowly
          </a>
        )}
      </div>
    </nav>
  )
}

function FloatingOrb({ delay = 0, size = 80, color = 'rgba(88,204,2,0.15)', top = '10%', left = '20%' }) {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: [-8, 8, -8] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      className="pointer-events-none absolute rounded-full blur-2xl"
      style={{ width: size, height: size, background: color, top, left }}
    />
  )
}

function IsometricStack() {
  return (
    <div className="relative h-32 w-32 select-none" style={{ transform: 'rotateX(12deg) rotateY(-12deg)' }}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#1cb0f6] to-[#0e7490] shadow-[0_12px_32px_rgba(28,176,246,0.35)]" style={{ transform: 'translateZ(0px)' }} />
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#58cc02] to-[#2d6a00] opacity-90" style={{ transform: 'translateZ(12px) translateX(6px) translateY(-6px)' }} />
      <div className="absolute inset-0 rounded-2xl bg-white shadow-xl flex items-center justify-center" style={{ transform: 'translateZ(24px) translateX(12px) translateY(-12px)' }}>
        <Icon name="gavel" className="text-[36px] text-primary" />
      </div>
      <div className="absolute -bottom-1 left-4 right-4 h-3 rounded-full bg-black/10 blur-md" />
    </div>
  )
}

function Hero({ onSignIn }) {
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
      {/* warm mesh behind hero */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#fdfcf8] via-[#f8f9ff] to-white" />
      <div className="pointer-events-none absolute -top-24 right-[-10%] h-[520px] w-[680px] rounded-full bg-gradient-to-br from-[#dcfce7]/60 via-[#e0f2fe]/50 to-[#fef9c3]/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-[-5%] h-[420px] w-[560px] rounded-full bg-gradient-to-tr from-[#1cb0f6]/10 to-[#58cc02]/10 blur-3xl" />

      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 px-4 py-10 md:grid-cols-2 md:gap-10 md:px-10 md:py-14 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 shadow-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-caption font-semibold tracking-wide text-emerald-800">Sources officielles vérifiées — mis à jour quotidiennement</span>
          </div>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[14ch] text-[32px] font-bold leading-[0.95] tracking-[-0.02em] text-on-surface md:text-[44px] lg:text-[52px]"
          >
            Vos droits, <span className="relative inline-block text-emerald-600 italic">clairs.<span className="absolute bottom-1 left-0 h-2 w-full -z-10 bg-[#ffc800]/30 -rotate-1" /></span> Votre argent, en ordre.
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 max-w-[42ch] text-body-md leading-relaxed text-on-surface-variant"
          >
            Comprenez les lois béninoises et gérez votre budget — expliqués simplement, à partir de sources officielles.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <a href="#/sign-in" className="btn-duo btn-duo--primary px-7 py-3.5 text-[15px]">
              Commencer — c'est gratuit <Icon name="arrow_forward" className="text-[18px]" />
            </a>
            <a href="#features" className="btn-duo btn-duo--white px-5 py-3 text-label-md">
              Voir comment ça marche
            </a>
          </motion.div>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-caption text-on-surface-variant">
            <span className="flex items-center gap-1.5"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="verified" className="text-[14px]" /></span> Sans jargon</span>
            <span className="h-3 w-px bg-outline-variant" />
            <span className="flex items-center gap-1.5"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700"><Icon name="lock" className="text-[14px]" /></span> Données chiffrées</span>
            <span className="h-3 w-px bg-outline-variant" />
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold tracking-wide text-on-surface shadow-sm border border-outline-variant">4 langues · FR · EN · Yorùbá · Fon</span>
          </div>
        </div>

        <div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={handleLeave}
          className="relative perspective-1000"
        >
          {/* floating orbs behind */}
          <FloatingOrb size={220} color="rgba(88,204,2,0.10)" top="0%" left="10%" delay={0} />
          <FloatingOrb size={180} color="rgba(28,176,246,0.12)" top="20%" left="55%" delay={0.6} />
          <FloatingOrb size={140} color="rgba(255,200,0,0.14)" top="55%" left="5%" delay={1.2} />

          {/* 3D premade-feel element cluster - top right floating stack */}
          <motion.div
            animate={reduce ? {} : { y: [0, -10, 0], rotate: [ -1, 1, -1] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-6 right-6 z-20 hidden md:flex perspective-1000"
          >
            <div className="preserve-3d">
              <IsometricStack />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#ffc800] text-on-surface shadow-[0_4px_0_#e5b500] border-2 border-white"
              >
                <Icon name="star" fill className="text-[14px]" />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            style={reduce ? {} : { rotateX, rotateY }}
            onHoverStart={() => setIsHovering(true)}
            className="relative preserve-3d will-change-transform"
          >
            <div
              className={`relative overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12),0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300 ${isHovering ? 'shadow-[0_32px_96px_rgba(15,23,42,0.16)]' : ''}`}
              style={{ transform: 'translateZ(0)' }}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/40 bg-gradient-to-r from-surface-container-low to-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e] shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-caption font-semibold tracking-wide text-on-surface-variant shadow-sm border border-outline-variant/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> knowly.bj — Aperçu LIVE
                </span>
                <Icon name="more_horiz" className="text-outline" />
              </div>
              <div className="grid grid-cols-5 gap-0">
                <div className="col-span-2 border-r border-outline-variant/40 bg-gradient-to-b from-surface-container-low to-[#f8fafc] p-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-2.5 text-white shadow-[0_4px_0_#065f46]"><Icon name="home" className="text-[16px]" /><span className="text-caption font-bold">Accueil</span></div>
                    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-on-surface-variant shadow-sm border border-outline-variant/40"><Icon name="notifications" className="text-[16px] text-orange-500" /><span className="text-caption font-medium">Alertes</span><span className="ml-auto rounded-full bg-[#ff4b4b] px-2 py-0.5 text-[10px] font-black text-white shadow-[0_2px_0_#e04343]">3</span></div>
                    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-on-surface-variant shadow-sm border border-outline-variant/40"><Icon name="payments" className="text-[16px] text-sky-500" /><span className="text-caption font-medium">Argent</span></div>
                    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-on-surface-variant shadow-sm border border-outline-variant/40"><Icon name="smart_toy" className="text-[16px] text-violet-500" /><span className="text-caption font-medium">Assistant IA</span></div>
                  </div>
                  <div className="mt-6 rounded-2xl bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-bold tracking-wide text-on-surface">Votre épargne</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">+12%</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1 text-[22px] font-black tracking-tight text-on-surface">248 000 <span className="text-caption font-medium text-on-surface-variant">CFA</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container shadow-inner"><div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#58cc02] to-[#46a302]" /></div>
                    <div className="mt-1.5 flex justify-between text-[11px] font-medium text-on-surface-variant"><span>62% · Ordinateur portable</span><span className="text-emerald-600">Objectif</span></div>
                  </div>
                </div>
                <div className="col-span-3 bg-white p-4">
                  <div className="rounded-2xl border-l-[4px] border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm">
                    <div className="mb-2 flex items-center gap-2"><span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-[0_2px_0_#065f46]">Fonction publique</span><span className="ml-auto flex items-center gap-1 text-caption font-bold text-emerald-700"><Icon name="verified" fill className="text-[12px]" /> Officiel</span></div>
                    <div className="text-label-md font-bold leading-tight text-on-surface">Avancement au 12e échelon — conditions remplies ?</div>
                    <p className="mt-1.5 text-caption leading-relaxed text-on-surface-variant">Le Conseil a autorisé l'avancement des 1 110 agents au 11e échelon. Vérifiez ancienneté et mérite.</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-caption font-bold text-emerald-700 shadow-sm border border-emerald-200">Comprendre en 30s <Icon name="arrow_forward" className="text-[14px]" /></div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-outline-variant/40 bg-gradient-to-r from-white to-surface-container-low p-3 shadow-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-[0_3px_0_#4c1d95]"><Icon name="smart_toy" className="text-[16px]" /></div>
                    <div className="flex-1"><div className="text-caption font-bold text-on-surface">Expliquez-moi tout ✨</div><div className="text-caption text-on-surface-variant">Collez un avis d'impôt, un bail...</div></div>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-sm"><Icon name="send" className="text-[14px]" /></span>
                  </div>
                </div>
              </div>
            </div>

            {/* floating chunky badges with 3D lift */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              style={{ transform: 'translateZ(30px)' }}
              className="absolute -bottom-5 -right-3 hidden rounded-2xl border border-emerald-200 bg-white p-3 shadow-[0_12px_32px_rgba(0,0,0,0.10),0_4px_0_#a7f3d0] md:flex md:items-center md:gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_3px_0_#065f46]"><Icon name="trending_up" className="text-[18px]" /></div>
              <div><div className="text-label-md font-black text-on-surface">+ 50 000 CFA / mois</div><div className="text-caption font-medium text-on-surface-variant">Capacité d'épargne estimée</div></div>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              style={{ transform: 'translateZ(40px)' }}
              className="absolute -left-4 top-12 hidden rounded-2xl border border-sky-200 bg-white px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.08),0_4px_0_#bae6fd] md:flex items-center gap-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-[0_2px_0_#0369a1]"><Icon name="shield" className="text-[16px]" /></div>
              <div><div className="text-caption font-black text-on-surface leading-none">100% vérifié</div><div className="text-[11px] font-medium text-on-surface-variant">Source gouv.bj</div></div>
            </motion.div>

            <motion.div
              animate={reduce ? {} : { y: [0, -6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transform: 'translateZ(20px)' }}
              className="absolute -left-2 bottom-20 hidden h-3 w-3 rounded-full bg-[#ffc800] shadow-[0_3px_0_#e5b500] md:block"
            />
            <motion.div
              animate={reduce ? {} : { y: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              style={{ transform: 'translateZ(15px)' }}
              className="absolute right-10 top-8 hidden h-2 w-2 rounded-full bg-[#1cb0f6] shadow-[0_2px_0_#1493cf] md:block"
            />
          </motion.div>

          {/* bottom glow */}
          <div className="pointer-events-none absolute -bottom-6 left-6 right-6 h-8 rounded-full bg-black/[0.06] blur-xl" />
        </div>
      </div>
    </section>
  )
}

function LogoWall() {
  return (
    <section id="sources" className="border-y border-outline-variant/50 bg-surface-container-low">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-10">
        <span className="text-caption font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Sources officielles</span>
        <div className="flex flex-wrap items-center gap-3 text-caption font-medium text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> gouv.bj</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> sgg.gouv.bj</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Journal officiel</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Lois & Décrets</span>
        </div>
        <span className="text-caption text-on-surface-variant">Vérifié quotidiennement · Aucune source non officielle</span>
      </div>
    </section>
  )
}

function BentoFeatures() {
  return (
    <section id="features" className="mx-auto max-w-[1280px] px-4 py-12 md:px-10 md:py-16">
      <div className="max-w-[60ch]">
        <h2 className="text-[28px] font-bold leading-none tracking-[-0.02em] text-on-surface md:text-[36px]">Tout ce qui compte, expliqué simplement.</h2>
        <p className="mt-3 max-w-[52ch] text-body-md leading-relaxed text-on-surface-variant">Pas de jargon. Pas de bluff. Juste ce que dit la loi, ce que ça change pour vous, et quoi vérifier ensuite.</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="home-hero-card relative overflow-hidden rounded-[24px] border border-white/10 p-6 text-white md:col-span-7 md:p-8 shadow-xl">
          <div className="relative z-10 max-w-[42ch]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-caption font-medium"><Icon name="gavel" className="text-[14px]" /> Droit & réglementation</div>
            <h3 className="text-[22px] font-semibold leading-tight md:text-[24px]">Chaque changement, sourcé.</h3>
            <p className="mt-2 text-body-md leading-relaxed text-white/80">Alertes quotidiennes depuis les journaux officiels. Catégorie, date d'effet, lien original — rien n'est inventé.</p>
            <ul className="mt-4 space-y-1.5 text-body-md text-white/85">
              <li className="flex items-center gap-2"><Icon name="check" className="text-[16px] text-secondary-container" /> Filtrage par vos centres d'intérêt</li>
              <li className="flex items-center gap-2"><Icon name="check" className="text-[16px] text-secondary-container" /> Sévérité et source visible d'un coup d'œil</li>
            </ul>
          </div>
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full border border-white/10" />
        </div>
        <div className="flex flex-col justify-between rounded-[24px] border border-secondary/15 bg-gradient-to-br from-[#d1fae5] to-[#a7f3d0] p-6 md:col-span-5 shadow-sm">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-on-secondary-container shadow-sm"><Icon name="savings" /></div>
            <h3 className="mt-4 text-headline-md text-on-secondary-container">Votre argent, clair.</h3>
            <p className="mt-2 text-body-md leading-relaxed text-on-secondary-container/80">Revenus, dépenses, épargne et objectif — en CFA, sans formule cachée. Mettez à jour en un tap.</p>
          </div>
          <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-caption"><span className="text-on-surface-variant">Objectif</span><span className="font-semibold text-on-surface">62%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full w-[62%] rounded-full bg-secondary" /></div>
            <div className="mt-2 flex justify-between text-caption text-on-surface-variant"><span>248 000 CFA</span><span>400 000 CFA</span></div>
          </div>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-white p-6 md:col-span-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-primary"><Icon name="smart_toy" /></div>
          <h3 className="mt-4 text-headline-md text-on-surface">Une IA qui cite ses sources.</h3>
          <p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">Collez un document, posez une question. Réponse en 4 parties — termes simples, pourquoi ça compte, quoi vérifier, sources officielles.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-outline-variant px-3 py-1 text-caption">Qu'est-ce que la TVA ?</span>
            <span className="rounded-full border border-outline-variant px-3 py-1 text-caption">Bail : quoi vérifier ?</span>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low p-6 md:col-span-7">
          <img src="https://picsum.photos/seed/knowly-benin-market/800/400" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.06]" />
          <div className="relative">
            <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wide text-secondary"><Icon name="notifications" className="text-[16px]" /> Alertes qui respectent votre temps</div>
            <h3 className="mt-2 text-headline-md text-on-surface">Zéro bruit. Que le signal.</h3>
            <p className="mt-2 max-w-[52ch] text-body-md leading-relaxed text-on-surface-variant">Chaque alerte affiche catégorie, sévérité et délai. « Comprendre en 30 secondes » ouvre l'explication IA avec le contexte complet.</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white p-3 shadow-sm"><div className="text-headline-md font-bold text-on-surface">7j/7</div><div className="text-caption text-on-surface-variant">Veille auto</div></div>
              <div className="rounded-xl bg-white p-3 shadow-sm"><div className="text-headline-md font-bold text-on-surface">8+</div><div className="text-caption text-on-surface-variant">Catégories</div></div>
              <div className="rounded-xl bg-white p-3 shadow-sm"><div className="text-headline-md font-bold text-on-surface">4</div><div className="text-caption text-on-surface-variant">Langues</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Choisissez vos sujets', desc: 'Impôts, emploi, logement, business... Knowly filtre le bruit.', icon: 'tune' },
    { n: '02', title: 'Recevez l’essentiel', desc: 'Une carte par changement, avec source et date d’effet.', icon: 'inbox' },
    { n: '03', title: 'Comprenez en 30 secondes', desc: 'L’IA explique, cite l’article, liste les vérifications.', icon: 'auto_awesome' },
  ]
  return (
    <section id="how" className="bg-white">
      <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-10 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-on-surface md:text-[32px]">En trois gestes.</h2>
          <p className="max-w-[36ch] text-body-md text-on-surface-variant">Conçu pour être utilisé entre deux tâches — pas un deuxième travail.</p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-outline-variant bg-surface-container-low p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm text-primary"><Icon name={s.icon} className="text-[18px]" /></div>
                <span className="text-caption font-mono font-semibold tracking-wide text-outline">{s.n}</span>
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

function Trust() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-10 md:px-10">
      <div className="flex flex-col gap-6 rounded-2xl border border-outline-variant bg-primary p-6 text-white md:flex-row md:items-center md:justify-between md:p-8">
        <div className="max-w-[52ch]">
          <h3 className="text-headline-md">Sécurité juridique : guide, pas avis.</h3>
          <p className="mt-2 text-body-md leading-relaxed text-white/75">Knowly explique. Pour une décision importante, vérifiez auprès de l'autorité compétente. Aucune donnée vendue.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-label-md font-semibold text-primary"><Icon name="shield" className="text-[16px]" /> Chiffrement</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-label-md text-white"><Icon name="verified_user" className="text-[16px]" /> Sources tracées</span>
        </div>
      </div>
    </section>
  )
}

function FinalCTA({ onSignIn }) {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pb-12 md:px-10">
      <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-8 text-center md:p-12">
        <h2 className="mx-auto max-w-[18ch] text-[30px] font-bold leading-none tracking-[-0.02em] text-on-surface md:text-[40px]">Prêt à y voir clair ?</h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-body-md text-on-surface-variant">Rejoignez Knowly. Vos alertes, votre budget et vos explications — au même endroit.</p>
        <div className="mt-6 flex justify-center">
          <a href="#/sign-in" className="btn-duo btn-duo--primary px-7 py-3.5 text-label-md shadow-sm">
            Créer mon compte <Icon name="arrow_forward" className="text-[18px]" />
          </a>
        </div>
        <p className="mt-3 text-caption text-on-surface-variant">Gratuit · 30 secondes · Bénin d'abord</p>
      </div>
    </section>
  )
}

export default function Landing({ onSignIn }) {
  return (
    <div className="min-h-screen bg-surface">
      <LandingNav onSignIn={onSignIn} />
      <Hero onSignIn={onSignIn} />
      <LogoWall />
      <BentoFeatures />
      <HowItWorks />
      <Trust />
      <FinalCTA onSignIn={onSignIn} />
      <footer className="border-t border-outline-variant bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-6 text-caption text-on-surface-variant md:flex-row md:items-center md:justify-between md:px-10">
          <span className="font-semibold text-on-surface">Knowly — Know your rights. Grow your money.</span>
          <span>© 2026 Knowly · Bénin · Ceci est un guide, pas un avis juridique.</span>
        </div>
      </footer>
    </div>
  )
}
