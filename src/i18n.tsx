import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LanguageContext } from './languageContext';
import { getCurrentLanguage, setCurrentLanguage, translate, type Language } from './translations';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (nextLanguage: Language) => {
    setCurrentLanguage(nextLanguage);
    setLanguageState(nextLanguage);
  };

  const value = useMemo(
    () => ({ language, setLanguage, t: translate }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
