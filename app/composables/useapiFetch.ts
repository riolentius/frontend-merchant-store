export const useApiFetch = () => {
  const config = useRuntimeConfig()
  const token  = useCookie('admin_token')
 
  const apiFetch = async <T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const url = `${config.public.apiBase}/api/admin${path}`
 
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
        ...(options.headers ?? {}),
      },
    })
 
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw Object.assign(new Error(err.message ?? 'Request failed'), {
        status: res.status,
        data:   err,
      })
    }
 
    return res.json() as Promise<T>
  }
 
  return { apiFetch }
}