import Link from 'next/link';
import fr from '@/lib/translations/fr.json';

export default function NotFound() {
  return (
    <div className="page page--no-nav">
      <div className="kente-strip" />
      <div style={{ textAlign: 'center', marginTop: 48 }}>
        <div style={{ fontSize: 44 }}>🧭</div>
        <h1>{fr['notFound.title']}</h1>
        <p style={{ color: '#6f6553' }}>{fr['notFound.body']}</p>
        <Link href="/accueil" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 16, padding: '0 28px' }}>
          {fr['notFound.home']}
        </Link>
      </div>
    </div>
  );
}
