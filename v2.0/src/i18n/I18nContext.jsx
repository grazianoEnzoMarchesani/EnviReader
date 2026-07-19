import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { FALLBACK_I18N } from './fallbackEn';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [i18n, setI18n] = useState(FALLBACK_I18N);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}translations.json`)
      .then((r) => r.json())
      // merge per lingua: un translations.json vecchio (es. cache del browser)
      // non deve cancellare le chiavi già presenti nel fallback
      .then((data) =>
        setI18n((prev) => {
          const next = { ...prev };
          for (const [lng, table] of Object.entries(data)) next[lng] = { ...prev[lng], ...table };
          return next;
        }),
      )
      .catch(() => {});
  }, []);

  const value = useMemo(() => {
    const tr = (key) => {
      const cur = i18n[lang];
      if (cur && cur[key] != null) return cur[key];
      if (i18n.en && i18n.en[key] != null) return i18n.en[key];
      return key;
    };
    return { tr, lang, setLang, languages: Object.keys(i18n) };
  }, [i18n, lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
