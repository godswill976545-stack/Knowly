'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { getProfile, demoLogout } from '@/lib/profile';
import { supabaseBrowser } from '@/lib/supabase-client';
import { IS_DEMO } from '@/lib/config';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export default function AidePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  const logout = async () => {
    if (!window.confirm(t('aide.logoutConfirm'))) return;
    if (IS_DEMO) {
      demoLogout();
    } else {
      await supabaseBrowser().auth.signOut();
    }
    router.replace('/connexion');
    router.refresh();
  };

  return (
    <div className="page">
      <Header />
      <h1>{t('aide.title')}</h1>

      <h2 className="section-title">{t('aide.account')}</h2>
      <div className="card">
        {profile?.phone && (
          <p style={{ marginBottom: 6 }}>
            📱 {t('aide.phone')} : <strong>{profile.phone}</strong>
          </p>
        )}
        {profile?.email && (
          <p style={{ marginBottom: 6 }}>
            ✉️ {t('aide.email')} : <strong>{profile.email}</strong>
          </p>
        )}
        {profile?.first_name && (
          <p style={{ marginBottom: 6 }}>
            👤 {t('aide.name')} : <strong>{profile.first_name}</strong>
          </p>
        )}
        <button type="button" className="btn btn-danger" onClick={logout}>
          🚪 {t('aide.logout')}
        </button>
      </div>

      <h2 className="section-title">{t('aide.installTitle')}</h2>
      <div className="card">
        <p style={{ color: '#4a4233' }}>{t('aide.installBody')}</p>
      </div>

      <h2 className="section-title">{t('aide.offlineTitle')}</h2>
      <div className="card">
        <p style={{ color: '#4a4233' }}>{t('aide.offlineBody')}</p>
      </div>

      <h2 className="section-title">{t('aide.aboutTitle')}</h2>
      <div className="card">
        <p style={{ color: '#4a4233' }}>{t('aide.aboutBody')}</p>
        <p className="form-hint">{t('aide.version')}</p>
      </div>

      <BottomNav />
    </div>
  );
}
