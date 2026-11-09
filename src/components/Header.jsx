'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { IconBell } from './Icons';

export default function Header() {
  const { t, langs, lang } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  return (
    <header className="header">
      <Link href="/accueil" className="brand" aria-label="MonCheck – Accueil">
        <span className="brand-mark">M</span>
        {t('app.name')}
      </Link>
      <div className="header-actions">
        <Link href="/alertes" className="icon-btn" aria-label={t('nav.alertes')}>
          <IconBell />
        </Link>
        <div className="lang-wrap" ref={wrapRef}>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('lang.label')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            FR ▾
          </button>
          {menuOpen && (
            <div className="lang-menu" role="menu">
              {langs.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={l.code === lang}
                  disabled={l.code !== 'fr'}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                  {l.code !== 'fr' && <span className="lang-sub">{t('common.bientot')}</span>}
                  {l.code === 'fr' && ' ✔'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
