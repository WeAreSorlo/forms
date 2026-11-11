import * as resources from '@/translations'
import i18next from 'i18next'

// Its own instance, without react-i18next, whose default instance and defaults belong to a host sharing its copy
const i18n = i18next.createInstance()

i18n.init({
  resources: resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export const { t } = i18n
export default i18n
