import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedAlert } from '@/lib/alerts-server';
import { formatDate } from '@/lib/format';
import { APP_URL } from '@/lib/config';
import fr from '@/lib/translations/fr.json';

// Public, lightweight, shareable alert page. Works for visitors who are not
// signed in, and renders clean Open Graph tags for WhatsApp previews.
export async function generateMetadata({ params }) {
  const { id } = await params;
  const alert = await getPublishedAlert(id);
  if (!alert) return { title: fr['alerts.notFound'] };
  const url = `${APP_URL}/alerte/${alert.id}`;
  return {
    title: alert.title,
    description: alert.summary,
    openGraph: {
      title: alert.title,
      description: alert.summary,
      url,
      type: 'article',
      locale: 'fr_FR',
      siteName: fr['app.name'],
      images: [{ url: `${APP_URL}/icons/icon-512.png`, width: 512, height: 512 }],
    },
    twitter: { card: 'summary', title: alert.title, description: alert.summary },
  };
}

export default async function PublicAlertPage({ params }) {
  const { id } = await params;
  const alert = await getPublishedAlert(id);
  if (!alert) notFound();

  const message = `${alert.title}\n${alert.summary}\n${APP_URL}/alerte/${alert.id}\nVia MonCheck`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className="page page--no-nav">
      <div className="kente-strip" />
      <div style={{ padding: '14px 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="brand-mark">M</span>
        <strong style={{ fontSize: 20 }}>MonCheck</strong>
      </div>

      <article className="card" style={{ marginTop: 12 }}>
        <div className="alert-meta">
          <span className="status-dot" aria-hidden="true" />
          {formatDate(alert.published_at)}
        </div>
        <h1 style={{ fontSize: 22 }}>{alert.title}</h1>
        <p style={{ fontSize: 17 }}>{alert.summary}</p>
        <div className="alert-who">
          {fr['home.whoPrefix']} {alert.who}
        </div>
        {alert.body && <p>{alert.body}</p>}
        <h2 className="section-title">{fr['alerts.detail.whatToDo']}</h2>
        <p>{alert.what_to_do}</p>

        <a
          className="source-badge"
          href={alert.source_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          ✔ {fr['home.sourceOfficial']}
        </a>

        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp" style={{ marginTop: 14 }}>
          {fr['alerts.share']}
        </a>

        <div className="disclaimer">{fr['alerts.detail.disclaimer']}</div>
      </article>

      <div className="card center" style={{ padding: 22 }}>
        <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>MonCheck</p>
        <p style={{ color: '#6f6553' }}>{fr['share.ctaSub']}</p>
        <div className="stack" style={{ marginTop: 10 }}>
          <Link href="/connexion" className="btn btn-primary">
            {fr['share.cta']}
          </Link>
          <Link href="/accueil" className="btn btn-ghost">
            {fr['share.openApp']}
          </Link>
        </div>
      </div>
    </div>
  );
}
