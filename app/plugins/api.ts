export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const token  = useCookie('admin_token')

  const api = $fetch.create({
    baseURL: config.public.apiBase as string,

    onRequest({ options }) {
      if (token.value) {
        // Use Headers object to avoid type issues
        const headers = new Headers(options.headers as HeadersInit)
        headers.set('Authorization', `Bearer ${token.value}`)
        options.headers = headers
      }
    },

    onResponseError({ response }) {
      if (response.status === 401) {
        const { clearAuth } = useAuth()
        clearAuth()
        navigateTo('/auth/login')
      }
    },
  })

  return {
    provide: { api },
  }
})