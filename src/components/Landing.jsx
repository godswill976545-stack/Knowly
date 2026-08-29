import { motion, useReducedMotion } from 'motion/react'

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
            className="rounded-full bg-primary px-5 py-2.5 text-label-md font-semibold text-white transition hover:bg-[#1e2a4a] active:scale-[0.98]"
          >
            Ouvrir Knowly
          </a>
        ) : (
          <a
            href="#/sign-in"
            onClick={(e) => { e.preventDefault(); onSignIn?.() }}
            className="rounded-full bg-primary px-5 py-2.5 text-label-md font-semibold text-white transition hover:bg-[#1e2a4a] active:scale-[0.98]"
          >
            Ouvrir Knowly
          </a>
        )}
      </div>
    </nav>
  )
}

function Hero({ onSignIn }) {
  const reduce = useReducedMotion()
  return (
    <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 px-4 py-10 md:grid-cols-2 md:gap-10 md:px-10 md:py-14 lg:py-16">
      <div className="flex flex-col justify-center">
        <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          <span className="text-caption font-medium text-on-surface-variant">Sources officielles vérifiées — mis à jour quotidiennement</span>
        </div>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[14ch] text-[32px] font-bold leading-[0.95] tracking-[-0.02em] text-on-surface md:text-[44px] lg:text-[48px]"
        >
          Vos droits, <span className="text-secondary italic">clairs.</span> Votre argent, en ordre.
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
          <a href="#/sign-in" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-label-md font-semibold text-white transition hover:bg-[#1e2a4a] active:translate-y-px">
            Commencer — c'est gratuit <Icon name="arrow_forward" className="text-[18px]" />
          </a>
          <a href="#features" className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-white px-5 py-3 text-label-md font-medium text-on-surface hover:bg-surface-container-low">
            Voir comment ça marche
          </a>
        </motion.div>
        <div className="mt-6 flex items-center gap-3 text-caption text-on-surface-variant">
          <span className="flex items-center gap-1"><Icon name="verified" className="text-[14px] text-secondary" /> Sans jargon</span>
          <span className="h-3 w-px bg-outline-variant" />
          <span className="flex items-center gap-1"><Icon name="lock" className="text-[14px]" /> Données chiffrées</span>
          <span className="h-3 w-px bg-outline-variant" />
          <span>4 langues · FR · EN · Yorùbá · Fon</span>
        </div>
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container-low px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-error/70" /><span className="h-2.5 w-2.5 rounded-full bg-yellow-400" /><span className="h-2.5 w-2.5 rounded-full bg-secondary/70" />
            </div>
            <span className="text-caption font-medium text-on-surface-variant">knowly.bj — Aperçu</span>
            <Icon name="more_horiz" className="text-outline" />
          </div>
          <div className="grid grid-cols-5 gap-0">
            <div className="col-span-2 border-r border-outline-variant/60 bg-surface-container-low p-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-secondary-container px-3 py-2 text-on-secondary-container"><Icon name="home" className="text-[16px]" /><span className="text-caption font-semibold">Accueil</span></div>
                <div className="flex items-center gap-2 px-3 py-2 text-on-surface-variant"><Icon name="notifications" className="text-[16px]" /><span className="text-caption">Alertes</span><span className="ml-auto rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-white">3</span></div>
                <div className="flex items-center gap-2 px-3 py-2 text-on-surface-variant"><Icon name="payments" className="text-[16px]" /><span className="text-caption">Argent</span></div>
                <div className="flex items-center gap-2 px-3 py-2 text-on-surface-variant"><Icon name="smart_toy" className="text-[16px]" /><span className="text-caption">Assistant IA</span></div>
              </div>
              <div className="mt-6 rounded-xl bg-white p-3 shadow-sm">
                <div className="text-caption font-semibold text-on-surface">Votre épargne</div>
                <div className="mt-1 text-headline-md font-bold text-on-surface">248 000 <span className="text-caption font-normal text-on-surface-variant">CFA</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full w-[62%] rounded-full bg-primary" /></div>
                <div className="mt-1 text-caption text-on-surface-variant">62% · Ordinateur portable</div>
              </div>
            </div>
            <div className="col-span-3 p-4">
              <div className="rounded-xl border-l-4 border-l-secondary bg-surface-container-low p-4">
                <div className="mb-2 flex items-center gap-2"><span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-secondary-container">Fonction publique</span><span className="ml-auto flex items-center gap-1 text-caption text-secondary"><Icon name="verified" className="text-[12px]" /> Officiel</span></div>
                <div className="text-label-md font-semibold leading-tight text-on-surface">Avancement au 12e échelon — conditions remplies ?</div>
                <p className="mt-1.5 text-caption leading-relaxed text-on-surface-variant">Le Conseil a autorisé l'avancement des 1 110 agents au 11e échelon. Vérifiez ancienneté et mérite.</p>
                <div className="mt-3 inline-flex items-center gap-1 text-caption font-medium text-primary">Comprendre en 30s <Icon name="arrow_forward" className="text-[14px]" /></div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-outline-variant bg-white p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"><Icon name="smart_toy" className="text-[16px]" /></div>
                <div className="flex-1"><div className="text-caption font-medium text-on-surface">Expliquez-moi tout</div><div className="text-caption text-on-surface-variant">Collez un avis d'impôt, un bail...</div></div>
                <Icon name="send" className="text-on-surface-variant" />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-2 hidden rounded-xl border border-outline-variant bg-white p-3 shadow-lg md:flex md:items-center md:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container"><Icon name="trending_up" className="text-[18px]" /></div>
          <div><div className="text-label-md font-semibold text-on-surface">+ 50 000 CFA / mois</div><div className="text-caption text-on-surface-variant">Capacité d'épargne estimée</div></div>
        </div>
      </motion.div>
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
        <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-primary p-6 text-white md:col-span-7 md:p-8">
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
        <div className="flex flex-col justify-between rounded-2xl border border-outline-variant bg-secondary-container p-6 md:col-span-5">
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
          <a href="#/sign-in" className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-label-md font-semibold text-white shadow-sm hover:bg-[#1e2a4a] active:scale-[0.98]">
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
