import { useContext } from 'react';
import { LanguageContext } from '../languageContext';
import type { LanguageContextValue } from '../languageContext';

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
