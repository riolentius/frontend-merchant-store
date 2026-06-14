import { defineNuxtRouteMiddleware, navigateTo, useCookie } from "nuxt/app"

export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith('/auth')) return

  const token = useCookie('admin_token')
  if (!token.value) {
    return navigateTo('/auth/login')
  }
})