export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const token  = useCookie('admin_token')

  const api = $fetch.create({
    baseURL: `${config.public.apiBase}/api/admin`,

    onRequest({ options }) {
      if (token.value) {
        const headers = new Headers(options.headers as HeadersInit)
        headers.set('Authorization', `Bearer ${token.value}`)
        options.headers = headers
      }
    },

    onResponseError({ response }) {
      if (response.status === 401) {
        const tokenCookie = useCookie('admin_token')
        tokenCookie.value = null
        navigateTo('/auth/login')
      }
    },
  })

  return {
    provide: { api },
  }
})