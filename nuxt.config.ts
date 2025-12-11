// https://nuxt.com/docs/api/configuration/nuxt-config
import Aura from '@primeuix/themes/aura';

export default defineNuxtConfig({
  modules: [
    '@primevue/nuxt-module'
  ],
  primevue: {
      options: {
          theme: {
              preset: Aura,
              options: {
                darkModeSelector: false || 'none',
              }
          }
      }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
