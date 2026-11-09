import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import OfflineBanner from '@/components/OfflineBanner';
import SWRegister from '@/components/SWRegister';
import fr from '@/lib/translations/fr.json';
import { APP_URL } from '@/lib/config';

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: fr['meta.title'], template: `%s — ${fr['app.name']}` },
  description: fr['meta.description'],
  applicationName: fr['app.name'],
  manifest: '/manifest.webmanifest',
  openGraph: {
    siteName: fr['app.name'],
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
  },
  icons: { icon: '/favicon.svg', apple: '/icons/icon-192.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#fbf5e6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <I18nProvider>
          <OfflineBanner />
          {children}
          <SWRegister />
        </I18nProvider>
      </body>
    </html>
  );
}
