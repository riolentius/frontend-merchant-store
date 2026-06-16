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

const FINANCE_ROLES = ['superadmin']

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

  const role = computed(() => user.value?.role ?? null)
  const canViewFinancials = computed(
    () => !!role.value && FINANCE_ROLES.includes(role.value),
  )

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

  // Authoritative role from the signed JWT claims (GET /api/admin/me).
  const fetchMe = async (): Promise<AuthUser | null> => {
    const { apiFetch } = useApiFetch()
    try {
      const res = await apiFetch<{
        ok: boolean
        claims: { sub: string; email: string; role: string }
      }>('/me')
      user.value = {
        id:    res.claims.sub,
        email: res.claims.email,
        role:  res.claims.role,
      }
      return user.value
    } catch {
      return null
    }
  }

  const logout = async () => {
    clearAuth()
    await navigateTo('/auth/login')
  }

  return {
    token: readonly(token),
    user:  readonly(user),
    isAuthenticated,
    role,
    canViewFinancials,
    login,
    logout,
    setAuth,
    clearAuth,
    fetchMe,
  }
}