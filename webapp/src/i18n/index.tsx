import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type Translations = Record<string, any>;

type I18nContextValue = {
  lang: string;
  setLang: (l: string) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type Props = { children: ReactNode; defaultLang?: string; resources?: Record<string, Translations> };

export function I18nProvider({ children, defaultLang = 'en', resources = {} }: Props) {
  const [lang, setLang] = useState(defaultLang);

  const t = (key: string, fallback = '') => {
    const parts = key.split('.');
    const res = resources[lang] || {};
    let cur: any = res;
    for (const p of parts) {
      if (!cur) return fallback || key;
      cur = cur[p];
    }
    if (typeof cur === 'string') return cur;
    return fallback || key;
  };

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used inside I18nProvider');
  return ctx;
}

export default I18nProvider;
