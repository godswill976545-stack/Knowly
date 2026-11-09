'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { fetchPublishedAlerts } from '@/lib/alerts-client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import AlertCard from '@/components/AlertCard';

const FILTERS = [
  { id: 'tout', key: 'alerts.filter.tout' },
  { id: 'impots', key: 'alerts.filter.impots' },
  { id: 'banque_mobile_money', key: 'alerts.filter.banque' },
  { id: 'travail', key: 'alerts.filter.travail' },
  { id: 'commerce', key: 'alerts.filter.commerce' },
];

export default function AlertesPage() {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState(null);
  const [filter, setFilter] = useState('tout');

  useEffect(() => {
    let alive = true;
    fetchPublishedAlerts().then((list) => {
      if (alive) setAlerts(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const visible = filter === 'tout' ? alerts : alerts?.filter((a) => a.category === filter);

  return (
    <div className="page">
      <Header />
      <h1>{t('alerts.title')}</h1>
      <p style={{ color: '#6f6553' }}>{t('alerts.subtitle')}</p>

      <div className="chip-row" role="tablist" aria-label="Catégories">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`chip${filter === f.id ? ' active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {t(f.key)}
          </button>
        ))}
      </div>

      {alerts === null && (
        <div className="center" style={{ padding: 32 }}>
          <div className="spinner" />
        </div>
      )}

      {alerts !== null && visible.length === 0 && (
        <div className="card center" style={{ color: '#6f6553' }}>
          {t('alerts.empty')}
        </div>
      )}

      {visible?.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}

      <BottomNav />
    </div>
  );
}
