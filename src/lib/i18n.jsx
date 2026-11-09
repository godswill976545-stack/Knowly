'use client';

import { createContext, useContext, useState } from 'react';
import fr from './translations/fr.json';

// Only French is active for now. Fon and Yoruba files are prepared (same keys,
// empty values) so translators can fill them in later without touching code.
const LOCALES = { fr };
const LANGS = [
  { code: 'fr', label: 'Français' },
  { code: 'fon', label: 'Fon', soon: true },
  { code: 'yo', label: 'Yoruba', soon: true },
];

const I18nContext = createContext({ lang: 'fr', langs: LANGS, setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('fr');

  const t = (key, vars) => {
    let s = (LOCALES[lang] && LOCALES[lang][key]) || fr[key] || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{${k}}`, String(v ?? ''));
      }
    }
    return s;
  };

  return (
    <I18nContext.Provider value={{ lang, langs: LANGS, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
