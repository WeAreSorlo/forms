import * as resources from '@/translations'
import i18n from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'

i18n.use(initReactI18next).init({
  resources: resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export interface TranslationProviderProps {
  children: React.ReactNode
}

export default function TranslationProvider({ children }: TranslationProviderProps) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
