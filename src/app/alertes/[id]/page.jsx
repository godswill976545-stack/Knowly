'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { fetchAlertById, whatsappShareUrl } from '@/lib/alerts-client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SourceBadge from '@/components/SourceBadge';
import SpeakerButton from '@/components/SpeakerButton';
import { IconWhatsApp, IconArrowLeft } from '@/components/Icons';

export default function AlertDetailPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchAlertById(id).then((a) => {
      if (!alive) return;
      if (!a) setNotFound(true);
      else setAlert(a);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const explain = async () => {
    setExplaining(true);
    try {
      const res = await fetch(`/api/alerts/${id}/explain`);
      if (res.ok) {
        const data = await res.json();
        setExplanation(data.explanation);
      } else {
        setExplanation(`${alert.summary} ${alert.what_to_do || ''}`.trim());
      }
    } catch {
      // Offline: fall back to the alert's own plain text.
      setExplanation(`${alert.summary} ${alert.what_to_do || ''}`.trim());
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="page">
      <Header />

      <Link href="/alertes" className="icon-btn" style={{ marginBottom: 12 }}>
        <IconArrowLeft size={18} />
        {t('alerts.detail.back')}
      </Link>

      {notFound && (
        <div className="card center" style={{ color: '#6f6553' }}>
          {t('alerts.notFound')}
        </div>
      )}

      {alert && (
        <>
          <article className="card">
            <div className="alert-meta">
              <span className="status-dot" aria-hidden="true" />
              {formatDate(alert.published_at)}
            </div>
            <h1 style={{ fontSize: 22 }}>{alert.title}</h1>
            <p style={{ fontSize: 17 }}>{alert.summary}</p>
            <div className="alert-who">
              {t('home.whoPrefix')} {alert.who}
            </div>
            <SourceBadge name={alert.source_name} url={alert.source_url} />

            <h2 className="section-title">{t('alerts.detail.whatToDo')}</h2>
            <p>{alert.what_to_do}</p>
            {alert.body && <p style={{ color: '#4a4233' }}>{alert.body}</p>}

            <a
              href={alert.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
              style={{ marginTop: 8 }}
            >
              📄 {t('alerts.detail.source')}
            </a>
          </article>

          <div className="stack" style={{ marginBottom: 12 }}>
            <button type="button" className="btn btn-primary" onClick={explain} disabled={explaining}>
              💡 {explaining ? t('alerts.detail.explaining') : t('alerts.detail.explain')}
            </button>
            <a
              href={whatsappShareUrl(alert)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              <IconWhatsApp />
              {t('alerts.share')}
            </a>
          </div>

          {explanation && (
            <article className="card">
              <h2 className="section-title mt-0">{t('alerts.detail.explanationTitle')}</h2>
              <p className="answer">{explanation}</p>
              <SpeakerButton text={explanation} />
              <div className="disclaimer">{t('alerts.detail.disclaimer')}</div>
            </article>
          )}
        </>
      )}

      <BottomNav />
    </div>
  );
}
