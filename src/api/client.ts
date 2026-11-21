/** API 请求封装：统一携带 token、处理 401 */
const TOKEN_KEY = 'hello_tryon_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/** 401 时的统一处理（由 router 注入，避免循环依赖） */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

interface ApiError extends Error {
  status?: number
}

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

  const resp = await fetch(path, { method, headers, body: payload })

  if (resp.status === 401) {
    setToken(null)
    onUnauthorized?.()
    const err: ApiError = new Error('登录态已失效，请重新登录')
    err.status = 401
    throw err
  }

  const data = (await resp.json().catch(() => null)) as
    | (T & { detail?: string })
    | null

  if (!resp.ok) {
    const detail =
      typeof data?.detail === 'string' ? data.detail : `请求失败（${resp.status}）`
    const err: ApiError = new Error(detail)
    err.status = resp.status
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
