/**
 * Shared Admin → Medusa fetch: session cookie + optional Bearer token.
 * Bearer is kept in sessionStorage after login so /admin/* stays authorized
 * even when cross-host cookie edge cases block connect.sid.
 */

import { medusaBackendUrl } from "./medusa-backend-url"

const TOKEN_KEY = "em_admin_auth_token"

export function getAdminAuthToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAdminAuthToken(token: string | null): void {
  if (typeof window === "undefined") return
  try {
    if (!token) window.sessionStorage.removeItem(TOKEN_KEY)
    else window.sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // ignore quota / private mode
  }
}

export async function adminFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const token = getAdminAuthToken()
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  return fetch(`${medusaBackendUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers,
  })
}
