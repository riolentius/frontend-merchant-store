// ============================================================
// app/mocks/auth.mock.ts
// ============================================================

import type { AuthResponse, AuthUser } from '~/composables/useAuth'

export const mockUser: AuthUser = {
  id: 1,
  username: 'admin',
  role: 'admin',
}

export const mockCredentials = {
  email: 'admin',
  password: 'admin123',
}

export const mockAuthResponse: AuthResponse = {
  accessToken: 'mock-jwt-token.ui-development.do-not-use-in-prod',
  user: mockUser,
}

// Simulates POST /api/v1/auth/login
export const mockLogin = async (
  username: string,
  password: string
): Promise<AuthResponse> => {
  await delay(600)

  if (username === mockCredentials.email && password === mockCredentials.password) {
    return mockAuthResponse
  }

  // Mimic a real 401 error shape so error handling in login.vue works the same
  throw { response: { status: 401 } }
}

// ── Shared helper ──────────────────────────────────────────
export const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))