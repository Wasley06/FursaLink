import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from '../i18n/en.json';
import sw from '../i18n/sw.json';
import { useSystemConfig } from './SystemConfigContext';

export type Language = 'en' | 'sw';

type Dictionary = Record<string, string>;

const DICTS: Record<Language, Dictionary> = {
  en: en as Dictionary,
  sw: sw as Dictionary,
};

const STORAGE_KEY = 'fursalink:lang';

type I18nContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { config } = useSystemConfig();
  const [lang, setLang] = useState<Language>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'sw' || raw === 'en') return raw;
    return 'en';
  });

  // If the user hasn't explicitly chosen a language, allow remote defaultLanguage to control initial behavior.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const hasUserOverride = raw === 'sw' || raw === 'en';
    if (hasUserOverride) return;
    if (config?.defaultLanguage === 'sw' || config?.defaultLanguage === 'en') setLang(config.defaultLanguage);
  }, [config?.defaultLanguage]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === 'sw' ? 'sw' : 'en';
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTS[lang] || DICTS.en;
    const t = (key: string) => dict[key] || DICTS.en[key] || key;
    return { lang, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
