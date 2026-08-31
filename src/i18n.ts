import * as resources from '@/translations'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

// Isolated instance so the host application's global i18next is left untouched
const i18n = i18next.createInstance()

i18n.use(initReactI18next).init({
  resources: resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
