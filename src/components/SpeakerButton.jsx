'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { IconSpeaker } from './Icons';

/**
 * Reads the plain-French explanation aloud with the Web Speech API.
 * Hidden entirely when the browser has no speech synthesis.
 */
export default function SpeakerButton({ text }) {
  const { t } = useI18n();
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!supported) return undefined;
    const onEnd = () => setSpeaking(false);
    window.speechSynthesis.addEventListener('end', onEnd);
    return () => window.speechSynthesis.removeEventListener('end', onEnd);
  }, [supported]);

  if (!supported) return null;

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    const frVoice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('fr'));
    if (frVoice) utterance.voice = frVoice;
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-pressed={speaking}>
      <IconSpeaker />
      {speaking ? t('alerts.detail.stop') : t('alerts.detail.listen')}
    </button>
  );
}
