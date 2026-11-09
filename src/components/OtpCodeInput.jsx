'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';

const LENGTH = 6;

/**
 * Six big boxes for the 6-digit code: numeric keypad, auto-advance, paste
 * support, autocomplete="one-time-code". Calls onComplete once filled.
 */
export default function OtpCodeInput({ onComplete, disabled }) {
  const { t } = useI18n();
  const [digits, setDigits] = useState(Array(LENGTH).fill(''));
  const refs = useRef([]);
  const doneRef = useRef(false);

  // After a failed verification (disabled goes true → false), allow the code
  // to be submitted again once all six digits are filled.
  useEffect(() => {
    if (!disabled) doneRef.current = false;
  }, [disabled]);

  const emit = (next) => {
    const code = next.join('');
    if (code.length < LENGTH) {
      doneRef.current = false;
      return;
    }
    if (!doneRef.current) {
      doneRef.current = true;
      onComplete(code);
    }
  };

  const setDigit = (index, value, nextDigits) => {
    const d = value.replace(/\D/g, '').slice(-1);
    const next = nextDigits || [...digits];
    next[index] = d;
    setDigits(next);
    if (d && index < LENGTH - 1) refs.current[index + 1]?.focus();
    emit(next);
  };

  const onChange = (index, e) => {
    // Paste of several digits lands in one box: spread them out.
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 1) {
      const next = Array(LENGTH).fill('');
      for (let i = 0; i < LENGTH && i < raw.length; i++) next[i] = raw[i];
      setDigits(next);
      const focusAt = Math.min(raw.length, LENGTH - 1);
      refs.current[focusAt]?.focus();
      emit(next);
      return;
    }
    setDigit(index, raw, [...digits]);
  };

  const onKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }
  };

  const onPaste = (e) => {
    const raw = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!raw) return;
    e.preventDefault();
    const next = Array(LENGTH).fill('');
    for (let i = 0; i < raw.length; i++) next[i] = raw[i];
    setDigits(next);
    refs.current[Math.min(raw.length, LENGTH - 1)]?.focus();
    emit(next);
  };

  return (
    <div className="otp-row" onPaste={onPaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`otp-box${digit ? ' filled' : ''}`}
          type="tel"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={LENGTH}
          value={digit}
          aria-label={t('login.digit', { n: i + 1 })}
          disabled={disabled}
          onChange={(e) => onChange(i, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
