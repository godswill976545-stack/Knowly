import { useEffect, useState } from 'react'

// 15-second product ad, ported from the standalone "MonCheck — 15s Ad (EN_FR).html"
// into a self-contained component (no iframe): same scenes, timing, copy and
// EN|FR toggle. Styles are scoped under .mc so they can't collide with the app.

const COPY = {
  en: {
    a1: 'Laws change.', a2: 'Nobody tells you.',
    b1: 'LEGAL ALERT', b2: 'Advancement to 12th step: conditions met?', b3: 'Official source · Effective date shown', b4: 'Every change. Sourced. In plain words.',
    c1: 'Your savings', c2: '62% of your goal',
    d1: '“I earned 5,000 francs.”', d2: 'Just speak. It’s logged.',
    e1: 'Tax notice · Contract · Invoice…<br>[ paste anything ]', e2: 'What it says · Why it matters · What to check', e3: 'An AI that cites its sources.',
    f1: 'Know your rights. <em>Grow your money.</em>', f2: 'Free · FR · EN · Yorùbá · Fon',
    g1: 'FRAUD DETECTOR', g2: '⚠ Likely Ponzi scheme', g3: '✗ Promises guaranteed returns<br>✗ Asks for payment first', g4: 'Check any website before you pay.',
  },
  fr: {
    a1: 'Les lois changent.', a2: 'Personne ne vous prévient.',
    b1: 'ALERTE JURIDIQUE', b2: 'Avancement au 12e échelon : conditions remplies ?', b3: 'Source officielle · Date d’effet indiquée', b4: 'Chaque changement. Sourcé. En mots simples.',
    c1: 'Votre épargne', c2: '62 % de votre objectif',
    d1: '« J’ai gagné 5 000 francs. »', d2: 'Parlez, c’est noté.',
    e1: 'Avis d’impôt · Contrat · Facture…<br>[ collez n’importe quoi ]', e2: 'Ce que ça dit · Pourquoi ça compte · Quoi vérifier', e3: 'Une IA qui cite ses sources.',
    f1: 'Connaissez vos droits. <em>Faites fructifier votre argent.</em>', f2: 'Gratuit · FR · EN · Yorùbá · Fon',
    g1: 'DÉTECTEUR DE FRAUDE', g2: '⚠ Arnaque pyramidale probable', g3: '✗ Promet des gains garantis<br>✗ Exige un paiement d’abord', g4: 'Vérifiez un site avant de payer.',
  },
}

const SCENE_STARTS = [0, 2, 4.4, 6.7, 8.7, 10.8, 13.1]
const DURATION = 15

const STYLES = `
.mc{--ink:#2b2118;--cream:#fbf5e6;--green:#18803d;--mint:#dfefd8;--mute:#6f6553;--red:#c0392e;
  position:relative;width:100%;height:100%;overflow:hidden;color:var(--ink);
  font-family:'Nunito Sans',system-ui,sans-serif;text-align:center}
@media (prefers-color-scheme:dark){.mc{--ink:#f4edda;--cream:#171208;--green:#4cd081;--mint:#1d3a26;--mute:#97896b}}
.mc-s{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:7% 9%;text-align:center}
.mc h1{font-size:clamp(24px,4.2vw,42px);line-height:1.12;letter-spacing:-.02em;font-weight:800;margin:0}
.mc h1 em{color:var(--green);font-style:normal}
.mc .cap{font-size:clamp(13px,1.6vw,17px);color:var(--mute);margin-top:16px}
.mc .card{width:100%;max-width:340px;background:var(--mint);border-radius:20px;padding:20px;text-align:left;margin-top:22px}
.mc .tag{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.08em;background:var(--ink);color:var(--cream);padding:5px 12px;border-radius:99px;text-transform:uppercase}
.mc .card b{display:block;font-size:clamp(15px,1.9vw,21px);margin:12px 0 6px}
.mc .card small{color:var(--mute);font-size:13px}
.mc .rise{animation:mcRise .6s .15s both}
.mc .rise2{animation:mcRise .6s .6s both}
.mc .rise3{animation:mcRise .6s 1.15s both}
@keyframes mcRise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
.mc .big{font-size:clamp(40px,6.5vw,72px);font-weight:800;letter-spacing:-.03em}
.mc .bar{width:100%;max-width:340px;height:12px;background:var(--mint);border-radius:9px;margin-top:20px;overflow:hidden}
.mc .bar i{display:block;height:100%;width:0;background:var(--green);border-radius:9px}
.mc .on .bar i,.mc .bar i{animation:mcFill 1.2s .5s forwards}
@keyframes mcFill{to{width:62%}}
.mc .mic{width:72px;height:72px;border-radius:50%;background:var(--ink);margin:24px auto 14px;position:relative}
.mc .mic::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid var(--green);animation:mcPulse 1.2s infinite}
@keyframes mcPulse{from{transform:scale(1);opacity:1}to{transform:scale(1.8);opacity:0}}
.mc .doc{width:100%;max-width:340px;border:1.5px dashed var(--mute);border-radius:16px;padding:16px;color:var(--mute);font-size:14px;text-align:left}
.mc .ans{width:100%;max-width:340px;background:var(--ink);color:var(--cream);border-radius:18px;padding:16px;margin-top:14px;text-align:left;font-size:14px;line-height:1.5}
.mc .logo{font-size:clamp(32px,5vw,56px);font-weight:800;letter-spacing:-.03em}
.mc .logo span{color:var(--green)}
.mc .url{width:100%;max-width:340px;background:var(--mint);border-radius:14px;padding:13px 16px;font-family:ui-monospace,monospace;font-size:clamp(13px,1.6vw,16px);text-align:left;position:relative;overflow:hidden;margin-top:18px}
.mc .url::after{content:"";position:absolute;top:0;bottom:0;width:30%;background:linear-gradient(90deg,transparent,rgba(24,128,61,.35),transparent);left:-40%;animation:mcSw .9s .4s ease-in-out}
@keyframes mcSw{to{left:110%}}
.mc .warn{width:100%;max-width:340px;background:var(--red);color:#fff;border-radius:16px;padding:15px;margin-top:13px;text-align:left;font-weight:700;font-size:clamp(14px,1.7vw,18px)}
.mc .warn small{display:block;font-weight:500;opacity:.92;margin-top:7px;font-size:.78em;line-height:1.6}
.mc .on .warn{animation:mcRise .5s 1s both,mcShake .4s 1.5s}
@keyframes mcShake{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.mc .pb{position:absolute;left:0;bottom:0;height:4px;background:var(--green);transition:width .2s linear;z-index:2}
.mc .ctl{position:absolute;top:10px;font:600 12px 'Nunito Sans',system-ui;background:var(--ink);color:var(--cream);border:0;border-radius:99px;padding:6px 12px;cursor:pointer;opacity:.65;z-index:2}
.mc .ctl:hover{opacity:1}
.mc .ctl-lang{left:10px}
.mc .ctl-re{right:10px}
/* The ad is a self-contained marketing piece (like the standalone HTML it
   ports): keep its own animations playing even when the visitor prefers
   reduced motion — without this, the global site rule freezes the scenes. */
@media (prefers-reduced-motion: reduce){
  .mc .rise,.mc .rise2,.mc .rise3{animation:mcRise .6s .15s both !important}
  .mc .rise2{animation-delay:.6s !important}
  .mc .rise3{animation-delay:1.15s !important}
  .mc .bar i{animation:mcFill 1.2s .5s forwards !important}
  .mc .mic::after{animation:mcPulse 1.2s infinite !important}
  .mc .url::after{animation:mcSw .9s .4s ease-in-out !important}
  .mc .on .warn{animation:mcRise .5s 1s both,mcShake .4s 1.5s !important}
}
`

function Scene({ idx, t }) {
  const html = (key) => ({ __html: t[key] })
  switch (idx) {
    case 0:
      return (
        <div className="mc-s on">
          <h1 className="rise" dangerouslySetInnerHTML={html('a1')} />
          <h1 className="rise2" style={{ color: 'var(--green)' }} dangerouslySetInnerHTML={html('a2')} />
        </div>
      )
    case 1:
      return (
        <div className="mc-s on">
          <span className="tag rise">{t.b1}</span>
          <div className="card rise2"><b>{t.b2}</b><small>{t.b3}</small></div>
          <p className="cap rise3">{t.b4}</p>
        </div>
      )
    case 2:
      return (
        <div className="mc-s on">
          <p className="cap rise" style={{ margin: 0 }}>{t.c1}</p>
          <div className="big rise">248 000 <span style={{ fontSize: '.35em' }}>CFA</span></div>
          <div className="bar"><i /></div>
          <p className="cap rise3">{t.c2}</p>
        </div>
      )
    case 3:
      return (
        <div className="mc-s on">
          <div className="mic rise" />
          <p className="rise2" style={{ fontWeight: 700, fontSize: 'clamp(16px,2vw,21px)', margin: 0 }}>{t.d1}</p>
          <p className="cap rise3">{t.d2}</p>
        </div>
      )
    case 4:
      return (
        <div className="mc-s on">
          <div className="doc rise" dangerouslySetInnerHTML={html('e1')} />
          <div className="ans rise2" dangerouslySetInnerHTML={html('e2')} />
          <p className="cap rise3">{t.e3}</p>
        </div>
      )
    case 5:
      return (
        <div className="mc-s on">
          <span className="tag rise">{t.g1}</span>
          <div className="url rise">fast-profit-x2.com</div>
          <div className="warn rise2"><span dangerouslySetInnerHTML={html('g2')} /><small dangerouslySetInnerHTML={html('g3')} /></div>
          <p className="cap rise3">{t.g4}</p>
        </div>
      )
    default:
      return (
        <div className="mc-s on">
          <div className="logo rise">Mon<span>Check</span></div>
          <h1 style={{ fontSize: 'clamp(17px,2.4vw,26px)', marginTop: 12, fontWeight: 600 }} className="rise2" dangerouslySetInnerHTML={html('f1')} />
          <p className="cap rise3">{t.f2}</p>
        </div>
      )
  }
}

export default function Ad15s({ startLang = 'en' }) {
  const [lang, setLang] = useState(startLang)
  const [elapsed, setElapsed] = useState(0)
  const [runId, setRunId] = useState(0)

  // Scene clock: a 100ms interval that only accumulates while the page is
  // visible, so a background tab doesn't burn through the 15s and land frozen
  // on the last scene. Scene cuts are driven by this timer; entry animations
  // are handled purely by CSS and are neutralized automatically when the
  // visitor prefers reduced motion — the scenes still play.
  useEffect(() => {
    setElapsed(0)
    const interval = setInterval(() => {
      if (document.hidden) return
      setElapsed((e) => {
        const next = e + 0.1
        if (next >= DURATION) clearInterval(interval)
        return Math.min(next, DURATION)
      })
    }, 100)
    return () => clearInterval(interval)
  }, [runId])

  const replay = () => { setElapsed(0); setRunId((n) => n + 1) }
  const switchLang = () => { setLang((l) => (l === 'en' ? 'fr' : 'en')); replay() }

  let idx = 0
  for (let i = 0; i < SCENE_STARTS.length; i++) {
    if (SCENE_STARTS[i] <= elapsed) idx = i
  }
  const t = COPY[lang]

  return (
    <div className="mc" role="img" aria-label="Publicité MonCheck de 15 secondes">
      <style>{STYLES}</style>
      <Scene key={`${idx}-${lang}-${runId}`} idx={idx} t={t} />
      <div className="pb" style={{ width: `${Math.min(100, (elapsed / DURATION) * 100)}%` }} />
      <button type="button" className="ctl ctl-lang" onClick={switchLang}>EN | FR</button>
      <button type="button" className="ctl ctl-re" onClick={replay}>Replay</button>
    </div>
  )
}
