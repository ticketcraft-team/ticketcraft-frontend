import { createContext } from 'react';
import { type Language, translate } from './translations';

export interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: typeof translate;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
