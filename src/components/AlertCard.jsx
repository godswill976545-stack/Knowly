'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { formatDateShort } from '@/lib/format';
import { whatsappShareUrl } from '@/lib/alerts-client';
import SourceBadge from './SourceBadge';
import { IconWhatsApp } from './Icons';

/** One alert card: status dot, title, one sentence, date, who, source badge,
 *  and the two actions "Explique-moi" / "Partager". */
export default function AlertCard({ alert, showExplain = true }) {
  const { t } = useI18n();
  const shareUrl = whatsappShareUrl(alert);

  return (
    <article className="card alert-card">
      <div className="ac-body">
        <div className="alert-meta">
          <span className="status-dot" aria-hidden="true" />
          {formatDateShort(alert.published_at)}
        </div>
        <Link href={`/alertes/${alert.id}`}>
          <h3>{alert.title}</h3>
        </Link>
        <p className="alert-sentence">{alert.summary}</p>
        <div className="alert-who">
          {t('home.whoPrefix')} {alert.who}
        </div>
        <SourceBadge name={alert.source_name} url={alert.source_url} />
        <div className="alert-actions">
          {showExplain && (
            <Link href={`/alertes/${alert.id}`} className="btn btn-ghost">
              💡 {t('home.explain')}
            </Link>
          )}
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp"
            onClick={(e) => e.stopPropagation()}
          >
            <IconWhatsApp />
            {t('home.share')}
          </a>
        </div>
      </div>
    </article>
  );
}
