import fr from './translations/fr.json'
import en from './translations/en.json'
import yo from './translations/yo.json'
import fon from './translations/fon.json'

export const DICTS = { fr, en, yo, fon }

export const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'yo', label: 'Yorùbá' },
  { code: 'fon', label: 'Fon', beta: true },
]

export function translate(lang, key, params) {
  const dict = DICTS[lang] ?? DICTS.fr
  let text = dict[key] ?? DICTS.fr[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v))
    }
  }
  return text
}
