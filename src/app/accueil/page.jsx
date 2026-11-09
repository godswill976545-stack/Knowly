'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { formatFCFA, monthKey, todayISO } from '@/lib/format';
import { getProfile, saveFirstName } from '@/lib/profile';
import { fetchPublishedAlerts } from '@/lib/alerts-client';
import { listMonth } from '@/lib/budget';
import { IS_DEMO } from '@/lib/config';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import AlertCard from '@/components/AlertCard';
import WelcomeModal from '@/components/WelcomeModal';

export default function AccueilPage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState(null);
  const [latest, setLatest] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [hasIncome, setHasIncome] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const [p, alerts, entries] = await Promise.all([
        getProfile(),
        fetchPublishedAlerts(),
        listMonth(monthKey(todayISO())),
      ]);
      if (!alive) return;

      setProfile(p);
      if (alerts.length) setLatest(alerts[0]);

      const income = entries.filter((e) => e.type === 'revenu').reduce((s, e) => s + e.amount_xof, 0);
      const expense = entries.filter((e) => e.type === 'depense').reduce((s, e) => s + e.amount_xof, 0);
      setHasIncome(income > 0);
      setRemaining(income - expense);

      const firstName = p?.first_name || p?.name || '';
      const seen = localStorage.getItem('moncheck:welcome');
      setShowWelcome(!firstName && !seen);
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const finishWelcome = async (name) => {
    localStorage.setItem('moncheck:welcome', '1');
    if (name) {
      await saveFirstName(name);
      setProfile((prev) => ({ ...prev, first_name: name }));
    }
    setShowWelcome(false);
  };

  const firstName = profile?.first_name || profile?.name || '';

  return (
    <div className="page">
      <Header />

      {IS_DEMO && (
        <div className="offline-banner" style={{ position: 'static', borderRadius: 10, marginBottom: 12 }}>
          {t('home.demoBanner')}
        </div>
      )}

      {/* Greeting + remaining budget */}
      <section style={{ marginBottom: 18 }}>
        <h1>{firstName ? t('home.greeting', { name: firstName }) : t('home.greetingNoName')}</h1>
        <p style={{ fontSize: 18, fontWeight: 700, color: hasIncome ? '#14572a' : '#6f6553' }}>
          {hasIncome ? t('home.remaining', { amount: formatFCFA(remaining) }) : t('home.remainingEmpty')}
        </p>
        {!hasIncome && (
          <Link href="/budget" style={{ fontWeight: 700, textDecoration: 'underline' }}>
            {t('home.addIncome')}
          </Link>
        )}
      </section>

      {/* Three big actions */}
      <div className="stack" style={{ marginBottom: 18 }}>
        <Link href="/alertes" className="home-action">
          <span className="ha-icon" aria-hidden="true">📢</span>
          <span>
            <span className="ha-label" style={{ display: 'block' }}>{t('home.alertesAction')}</span>
            <span className="ha-sub">{t('home.alertesSub')}</span>
          </span>
          <span className="ha-arrow" aria-hidden="true">›</span>
        </Link>
        <Link href="/budget" className="home-action">
          <span className="ha-icon" aria-hidden="true">💰</span>
          <span>
            <span className="ha-label" style={{ display: 'block' }}>{t('home.budgetAction')}</span>
            <span className="ha-sub">{t('home.budgetSub')}</span>
          </span>
          <span className="ha-arrow" aria-hidden="true">›</span>
        </Link>
        <Link href="/question" className="home-action">
          <span className="ha-icon" aria-hidden="true">💬</span>
          <span>
            <span className="ha-label" style={{ display: 'block' }}>{t('home.questionAction')}</span>
            <span className="ha-sub">{t('home.questionSub')}</span>
          </span>
          <span className="ha-arrow" aria-hidden="true">›</span>
        </Link>
      </div>

      {/* Latest alert */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 className="section-title mt-0">{t('home.latestAlert')}</h2>
          <Link href="/alertes" style={{ fontWeight: 700, fontSize: 14 }}>
            {t('home.seeAll')} ›
          </Link>
        </div>
        {latest ? (
          <AlertCard alert={latest} />
        ) : (
          <div className="card center" style={{ color: '#6f6553' }}>
            {t('home.noAlerts')}
          </div>
        )}
      </section>

      {showWelcome && <WelcomeModal onDone={finishWelcome} />}
      <BottomNav />
    </div>
  );
}
