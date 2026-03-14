import { navigateTo, useCookie, useRuntimeConfig } from "nuxt/app"
import { computed, readonly } from "vue"

export interface AuthUser {
  id: number
  username: string
  email?: string
  role: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResponse {
  access_token: string
  user?: AuthUser
}

export const useAuth = () => {
  // useCookie is SSR-safe — works on both server and client
  const token = useCookie<string | null>('admin_token', {
    default: () => null,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  const user = useCookie<AuthUser | null>('admin_user', {
    default: () => null,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })

  const isAuthenticated = computed(() => !!token.value)

  const setAuth = (authData: AuthResponse) => {
    token.value = authData.access_token
    if (authData.user) {
      user.value = authData.user
    }
  }

  const clearAuth = () => {
    token.value = null
    user.value = null
  }

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const config = useRuntimeConfig()
    const baseURL = config.public.apiBase

    const response = await $fetch<AuthResponse>(`${baseURL}/api/v1/auth/login`, {
      method: 'POST',
      body: credentials,
      headers: { 'Content-Type': 'application/json' },
    })

    setAuth(response)
    return response
  }

  const logout = async () => {
    clearAuth()
    await navigateTo('/auth/login')
  }

  return {
    token: readonly(token),
    user: readonly(user),
    isAuthenticated,
    login,
    logout,
    setAuth,
    clearAuth,
  }
}