/** API 请求封装：统一携带 token、401 自动刷新重试 */
const TOKEN_KEY = 'hello_tryon_token'
const REFRESH_KEY = 'hello_tryon_refresh_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

/** 写入登录令牌；参数为 null 时清除 */
export function setTokens(token: string | null, refreshToken: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
  else localStorage.removeItem(REFRESH_KEY)
}

/** 401 时的统一处理（由 router 注入，避免循环依赖） */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

interface ApiError extends Error {
  status?: number
  code?: string
}

/** 用刷新令牌换取新令牌对（后端轮换：返回新的 access + refresh） */
async function doRefresh(): Promise<boolean> {
  const rt = getRefreshToken()
  if (!rt) return false
  try {
    const resp = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    })
    if (!resp.ok) return false
    const data = (await resp.json().catch(() => null)) as
      | { token?: string; refresh_token?: string }
      | null
    if (!data?.token || !data.refresh_token) return false
    setTokens(data.token, data.refresh_token)
    return true
  } catch {
    return false
  }
}

// 并发 401 共享同一次刷新，避免多个请求同时打 /refresh 导致轮换互相覆盖
let refreshing: Promise<boolean> | null = null

export async function request<T = unknown>(
  method: string,
  path: string,
  body?: FormData | object,
): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body // FormData 不设 Content-Type，交给浏览器写 boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let resp = await fetch(path, { method, headers, body: payload })

  // 访问令牌过期：单飞刷新后带新 token 重试一次（刷新请求自身不重试）
  if (resp.status === 401 && path !== '/api/auth/refresh' && getRefreshToken()) {
    refreshing ??= doRefresh().finally(() => {
      refreshing = null
    })
    if (await refreshing) {
      headers['Authorization'] = `Bearer ${getToken()}`
      resp = await fetch(path, { method, headers, body: payload })
    }
  }

  const data = (await resp.json().catch(() => null)) as
    | (T & { code?: string; message?: string })
    | null

  // 401 清登录态并跳登录页（保留后端返回的错误信息）
  if (resp.status === 401) {
    setTokens(null, null)
    onUnauthorized?.()
  }

  if (!resp.ok) {
    // 统一错误体 {code, message}
    const message = data?.message ?? `请求失败（${resp.status}）`
    const err: ApiError = new Error(message)
    err.status = resp.status
    err.code = data?.code
    throw err
  }
  return data as T
}

export const get = <T = unknown>(path: string) => request<T>('GET', path)
export const post = <T = unknown>(path: string, body?: object) =>
  request<T>('POST', path, body)
export const patch = <T = unknown>(path: string, body: object) =>
  request<T>('PATCH', path, body)
export const del = <T = unknown>(path: string) => request<T>('DELETE', path)
export const upload = <T = unknown>(path: string, form: FormData) =>
  request<T>('POST', path, form)
