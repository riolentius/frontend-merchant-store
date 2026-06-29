import Aura from '@primeuix/themes/aura'

export default defineNuxtConfig({
  modules: ['@primevue/nuxt-module'],

  css: [
    '~/assets/css/auth.css',
    '~/assets/css/primevue-auth.css',
    '~/assets/css/dashboard.css',
    '~/assets/css/dashboard-page.css',
  ],

  // Disable SSR for all admin + auth pages
  // These pages need browser APIs (cookies, $api plugin)
  routeRules: {
    '/admin/**': { ssr: false },
    '/auth/**': { ssr: false },
  },

  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: { darkModeSelector: false || 'none' },
      },
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
    },
  },

  app: {
    head: {
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap",
        },
      ],
    },
  },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
})