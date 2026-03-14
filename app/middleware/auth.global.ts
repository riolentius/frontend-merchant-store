import { defineNuxtRouteMiddleware, navigateTo, useCookie } from "nuxt/app"

export default defineNuxtRouteMiddleware((to) => {
  // Public routes that don't need auth
  const publicRoutes = ['/auth/login']
  if (publicRoutes.includes(to.path)) return

  const token = useCookie('admin_token')

  if (!token.value) {
    return navigateTo('/auth/login')
  }
})