'use client';

import { useI18n } from '@/lib/i18n';
import { IconCheck } from './Icons';

export default function SourceBadge({ name, url }) {
  const { t } = useI18n();
  return (
    <a
      className="source-badge"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={`${t('home.sourceOfficial')} : ${name}`}
    >
      <IconCheck />
      {t('home.sourceOfficial')}
    </a>
  );
}
