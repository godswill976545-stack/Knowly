'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

/** Admin-only review: draft alerts are listed here and published one by one.
 *  Visibility is checked again on the server. */
export default function AdminPage() {
  const { t } = useI18n();
  const [drafts, setDrafts] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin');
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    const data = await res.json();
    setDrafts(data.drafts || []);
  };

  useEffect(() => {
    load();
  }, []);

  const publish = async (id) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setMessage(t('admin.published'));
      setTimeout(() => setMessage(''), 3000);
      load();
    }
  };

  return (
    <div className="page">
      <Header />
      <h1>{t('admin.title')}</h1>
      <p style={{ color: '#6f6553' }}>{t('admin.subtitle')}</p>

      {forbidden && (
        <div className="card center" style={{ color: '#6f6553' }}>
          {t('admin.notAdmin')}
        </div>
      )}

      {message && (
        <div className="offline-banner" style={{ position: 'static', borderRadius: 10, marginBottom: 12 }}>
          {message}
        </div>
      )}

      {drafts === null && !forbidden && (
        <div className="center" style={{ padding: 24 }}>
          <div className="spinner" />
        </div>
      )}

      {drafts !== null && drafts.length === 0 && (
        <div className="card center" style={{ color: '#6f6553' }}>
          {t('admin.empty')}
        </div>
      )}

      {drafts?.map((alert) => (
        <div key={alert.id} className="card">
          <span className="badge-pill">{t('alerts.draft')}</span>
          <h3 style={{ marginTop: 8 }}>{alert.title}</h3>
          <p>{alert.summary}</p>
          <p className="form-hint">
            {formatDate(alert.created_at)} · {alert.source_name}
          </p>
          <a
            href={alert.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-btn"
            style={{ display: 'block', marginBottom: 8 }}
          >
            {t('admin.seeSource')} ↗
          </a>
          <button type="button" className="btn btn-primary" onClick={() => publish(alert.id)}>
            ✔ {t('admin.publish')}
          </button>
        </div>
      ))}

      <BottomNav />
    </div>
  );
}
