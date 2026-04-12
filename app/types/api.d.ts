import type { $Fetch } from 'ofetch'

declare module 'nuxt/app' {
  interface NuxtApp {
    $api: $Fetch
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $api: $Fetch
  }
}

export {}