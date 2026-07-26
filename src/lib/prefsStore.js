// Preferenze di interfaccia (lingua, tema): persistite in localStorage con la
// stessa logica di paletteStore/presetStore, così la scelta dell'utente
// sopravvive alla chiusura del browser invece di ripartire dal default.

const LANG_KEY = 'envireader.lang.v1';
const THEME_KEY = 'envireader.theme.v1';

// Lingue effettivamente presenti in public/translations.json. Serve al solo
// riconoscimento della lingua del browser alla prima visita: le chiavi mancanti
// ricadono comunque sull'inglese tramite tr().
export const SUPPORTED_LANGS = ['en', 'it', 'es', 'fr', 'de'];

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage disabilitato (navigazione privata, policy aziendali)
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota piena o storage negato: la scelta resta valida per questa sessione
  }
}

// Prima visita: si parte dalla lingua del browser se è tra quelle tradotte,
// altrimenti inglese. Una scelta esplicita salvata vince sempre.
export function loadLang() {
  const stored = read(LANG_KEY);
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  try {
    const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of tags) {
      const code = String(tag || '').slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGS.includes(code)) return code;
    }
  } catch {
    // niente navigator (SSR, ambienti ristretti): si resta sull'inglese
  }
  return 'en';
}

export const persistLang = (lang) => write(LANG_KEY, lang);

// Senza una scelta salvata si segue il tema di sistema invece di forzare
// il chiaro: chi lavora in dark mode non viene accecato a ogni ricarica.
export function loadTheme() {
  const stored = read(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export const persistTheme = (theme) => write(THEME_KEY, theme);
