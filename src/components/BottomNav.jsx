'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { IconHome, IconMegaphone, IconWallet, IconHelp } from './Icons';

const TABS = [
  { href: '/accueil', key: 'nav.accueil', icon: IconHome, match: ['/accueil'] },
  { href: '/alertes', key: 'nav.alertes', icon: IconMegaphone, match: ['/alertes'] },
  { href: '/budget', key: 'nav.budget', icon: IconWallet, match: ['/budget'] },
  { href: '/aide', key: 'nav.aide', icon: IconHelp, match: ['/aide'] },
];

export default function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {TABS.map((tab) => {
        const active = tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`nav-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon />
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
