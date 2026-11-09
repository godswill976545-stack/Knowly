'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { normalizeBeninPhone, isValidEmail } from '@/lib/phone';
import { supabaseBrowser } from '@/lib/supabase-client';
import { IS_DEMO, WHATSAPP_OTP_ENABLED } from '@/lib/config';
import { demoLogin } from '@/lib/profile';
import OtpCodeInput from '@/components/OtpCodeInput';
import { IconWhatsApp } from '@/components/Icons';

const RESEND_SECONDS = 60;
const SEND_COOLDOWN_KEY = 'moncheck:last-code-sent';

function friendlyErrorKey(err) {
  const code = err?.code || '';
  const msg = String(err?.message || '').toLowerCase();
  if (code === 'otp_expired' || msg.includes('expired')) return 'errors.expiredCode';
  if (
    code === 'invalid_otp' ||
    code === 'token_not_found' ||
    msg.includes('otp') ||
    msg.includes('token')
  )
    return 'errors.invalidCode';
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_sms_send_rate_limit' ||
    code === 'rate_limit' ||
    msg.includes('rate') ||
    msg.includes('limit') ||
    err?.status === 429
  )
    return 'errors.tooManyRequests';
  if (msg.includes('phone')) return 'errors.invalidPhone';
  if (msg.includes('email')) return 'errors.invalidEmail';
  return 'errors.generic';
}

export default function ConnexionPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [mode, setMode] = useState('phone'); // 'phone' | 'email'
  const [step, setStep] = useState('ident'); // 'ident' | 'code'
  const [phoneRaw, setPhoneRaw] = useState('');
  const [email, setEmail] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState(null); // { e164, display }
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastChannel, setLastChannel] = useState('sms');
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [countdown]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const sendCode = async (channel) => {
    setError(null);

    if (mode === 'phone') {
      const norm = normalizeBeninPhone(phoneRaw);
      if (!norm.ok) {
        // Landlines (01 2x / 01 3x, or old 8-digit 2x) can't receive SMS.
        let d = phoneRaw.replace(/\D/g, '');
        if (d.startsWith('00229')) d = d.slice(5);
        else if (d.startsWith('229')) d = d.slice(3);
        if (d.length === 8) d = `01${d}`;
        setError(/^01[23]/.test(d) ? 'errors.landline' : 'errors.invalidPhone');
        return;
      }
      setNormalizedPhone(norm);
    } else if (!isValidEmail(email)) {
      setError('errors.invalidEmail');
      return;
    }

    // Client-side cooldown, on top of the Supabase rate limits.
    const lastSent = Number(localStorage.getItem(SEND_COOLDOWN_KEY) || 0);
    const wait = lastSent + RESEND_SECONDS * 1000 - Date.now();
    if (wait > 0 && channel !== 'whatsapp') {
      setCountdown(Math.ceil(wait / 1000));
      setError('errors.tooManyRequests');
      return;
    }

    setSending(true);
    try {
      if (IS_DEMO) {
        setLastChannel(channel);
        setStep('code');
        setCountdown(RESEND_SECONDS);
        return;
      }

      const sb = supabaseBrowser();
      let result;
      if (mode === 'phone') {
        result = await sb.auth.signInWithOtp({
          phone: normalizedPhone.e164,
          options: { shouldCreateUser: true, channel },
        });
      } else {
        result = await sb.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: true },
        });
      }
      if (result.error) {
        setError(friendlyErrorKey(result.error));
        return;
      }
      localStorage.setItem(SEND_COOLDOWN_KEY, String(Date.now()));
      setLastChannel(channel);
      setStep('code');
      setCountdown(RESEND_SECONDS);
    } catch {
      setError(mode === 'phone' ? 'errors.smsFail' : 'errors.emailFail');
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (code) => {
    setError(null);
    setVerifying(true);
    try {
      if (IS_DEMO) {
        demoLogin(mode === 'phone' ? normalizedPhone?.e164 : email.trim(), mode);
        router.replace('/accueil');
        return;
      }
      const sb = supabaseBrowser();
      const result =
        mode === 'phone'
          ? await sb.auth.verifyOtp({ phone: normalizedPhone.e164, token: code, type: 'sms' })
          : await sb.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
      if (result.error) {
        setError(friendlyErrorKey(result.error));
        return;
      }
      router.replace('/accueil');
      router.refresh();
    } catch {
      setError('errors.generic');
    } finally {
      setVerifying(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setStep('ident');
    setError(null);
    setCountdown(0);
  };

  const changeTarget = () => {
    setStep('ident');
    setError(null);
    setCountdown(0);
  };

  return (
    <div className="page page--no-nav">
      <div className="kente-strip" />
      <div style={{ padding: '32px 0 8px', textAlign: 'center' }}>
        <div className="brand" style={{ justifyContent: 'center', fontSize: 26 }}>
          <span className="brand-mark">M</span>
          MonCheck
        </div>
      </div>

      {step === 'ident' && (
        <>
          <h1 style={{ textAlign: 'center' }}>{t('login.title')}</h1>
          <p style={{ textAlign: 'center', color: '#6f6553' }}>{t('login.subtitle')}</p>

          <div className="card">
            {mode === 'phone' ? (
              <>
                <div className="field">
                  <label htmlFor="phone">{t('login.phoneLabel')}</label>
                  <div className="phone-wrap">
                    <span className="phone-prefix">+229</span>
                    <input
                      id="phone"
                      className="phone-input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="01 97 00 00 01"
                      value={phoneRaw}
                      onChange={(e) => setPhoneRaw(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendCode('sms')}
                      aria-label={t('login.phoneLabel')}
                    />
                  </div>
                  <p className="form-hint">{t('login.phoneHint')}</p>
                </div>

                {error && (
                  <div className="form-error" role="alert">
                    {t(error)}
                  </div>
                )}

                <div className="stack">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => sendCode('sms')}
                    disabled={sending}
                  >
                    📩 {sending ? t('login.waiting') : t('login.sendCode')}
                  </button>
                  {WHATSAPP_OTP_ENABLED && (
                    <button
                      type="button"
                      className="btn btn-whatsapp"
                      onClick={() => sendCode('whatsapp')}
                      disabled={sending}
                    >
                      <IconWhatsApp />
                      {t('login.whatsapp')}
                    </button>
                  )}
                  <button type="button" className="link-btn" onClick={() => switchMode('email')}>
                    {t('login.useEmail')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="email">{t('login.emailLabel')}</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendCode('sms')}
                  />
                </div>

                {error && (
                  <div className="form-error" role="alert">
                    {t(error)}
                  </div>
                )}

                <div className="stack">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => sendCode('sms')}
                    disabled={sending}
                  >
                    📩 {sending ? t('login.waiting') : t('login.sendCodeEmail')}
                  </button>
                  <button type="button" className="link-btn" onClick={() => switchMode('phone')}>
                    {t('login.usePhone')}
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="center form-hint">🔒 {t('login.secure')}</p>
          {IS_DEMO && (
            <div className="offline-banner" style={{ position: 'static', borderRadius: 10 }}>
              {t('login.demoNote')}
            </div>
          )}
        </>
      )}

      {step === 'code' && (
        <>
          <h1 style={{ textAlign: 'center' }}>{t('login.codeTitle')}</h1>
          <p style={{ textAlign: 'center', color: '#6f6553' }}>
            {mode === 'phone'
              ? t('login.codeSentSms', { phone: normalizedPhone?.display || '' })
              : t('login.codeSentEmail', { email: email.trim() })}
          </p>

          <OtpCodeInput onComplete={verifyCode} disabled={verifying} />

          {verifying && (
            <div className="center">
              <div className="spinner" />
            </div>
          )}

          {error && (
            <div className="form-error" role="alert">
              {t(error)}
            </div>
          )}

          <div className="stack" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => sendCode(lastChannel)}
              disabled={countdown > 0 || sending}
            >
              {countdown > 0 ? t('login.resendIn', { s: countdown }) : t('login.resend')}
            </button>
            {mode === 'phone' && (
              <button type="button" className="link-btn" onClick={changeTarget}>
                {t('login.changeNumber')}
              </button>
            )}
            {mode === 'email' && (
              <button type="button" className="link-btn" onClick={changeTarget}>
                {t('login.changeEmail')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
