export interface AuthUser {
  id:       string
  email:    string
  role:     string
}

export interface LoginCredentials {
  email:    string
  password: string
}

export interface AuthResponse {
  accessToken: string
  user?:       AuthUser
}

export const useAuth = () => {
  const token = useCookie<string | null>('admin_token', {
    default:  () => null,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7,
  })

  const user = useCookie<AuthUser | null>('admin_user', {
    default:  () => null,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7,
  })

  const isAuthenticated = computed(() => !!token.value)

  const setAuth = (authData: AuthResponse) => {
    token.value = authData.accessToken
    if (authData.user) user.value = authData.user
  }

  const clearAuth = () => {
    token.value = null
    user.value  = null
  }

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const config = useRuntimeConfig()
    const response = await $fetch<AuthResponse>(
      `${config.public.apiBase}/api/admin/login`,
      {
        method:  'POST',
        body:    credentials,
        headers: { 'Content-Type': 'application/json' },
      }
    )
    setAuth(response)
    return response
  }

  const logout = async () => {
    clearAuth()
    await navigateTo('/auth/login')
  }

  return {
    token: readonly(token),
    user:  readonly(user),
    isAuthenticated,
    login,
    logout,
    setAuth,
    clearAuth,
  }
}