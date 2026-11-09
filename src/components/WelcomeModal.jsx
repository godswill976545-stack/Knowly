'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

/**
 * One-time welcome shown on first login. Asks only for an optional first name.
 */
export default function WelcomeModal({ onDone }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    await onDone(name.trim());
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(43, 33, 24, 0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t('welcome.title')}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 560,
          margin: 0,
          borderRadius: '20px 20px 0 0',
          padding: 24,
        }}
      >
        <h2>{t('welcome.title')}</h2>
        <p style={{ color: '#6f6553' }}>{t('welcome.body')}</p>
        <div className="field">
          <label htmlFor="welcome-name">{t('welcome.nameLabel')}</label>
          <input
            id="welcome-name"
            className="input"
            value={name}
            maxLength={40}
            placeholder={t('welcome.namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && finish()}
          />
        </div>
        <div className="stack">
          <button type="button" className="btn btn-primary" disabled={saving} onClick={finish}>
            {t('welcome.start')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={saving}
            onClick={() => onDone(null)}
          >
            {t('welcome.skip')}
          </button>
        </div>
      </div>
    </div>
  );
}
