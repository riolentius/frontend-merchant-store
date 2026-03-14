// https://nuxt.com/docs/api/configuration/nuxt-config
import Aura from '@primeuix/themes/aura'

export default defineNuxtConfig({
  modules: [
    '@primevue/nuxt-module',
  ],

  // Global stylesheets
  css: [
    '~/assets/css/auth.css',          // auth pages layout + variables
    '~/assets/css/primevue-auth.css', // PrimeVue overrides for auth
    '~/assets/css/dashboard.css',     // dashboard layout + sidebar + topbar
    '~/assets/css/dashboard-page.css', // dashboard page-specific styles
  ],

  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false || 'none',
        },
      },
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080',
    },
  },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
})