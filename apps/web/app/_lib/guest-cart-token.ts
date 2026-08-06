/**
 * Guest cart token (ADR-0022) — browser-side opslag voor x-guest-cart-token.
 */

const STORAGE_KEY = "em_guest_cart_token"

export function getGuestCartToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const value = localStorage.getItem(STORAGE_KEY)?.trim()
    return value && value.length >= 8 ? value : null
  } catch {
    return null
  }
}

export function setGuestCartToken(token: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, token.trim())
  } catch {
    // private mode / quota
  }
}

export function clearGuestCartToken() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function rememberGuestTokenFromResponse(
  body: { guest_token?: string | null },
  response: Response
) {
  const header = response.headers.get("x-guest-cart-token")
  const token = (body.guest_token || header || "").trim()
  if (token.length >= 8) {
    setGuestCartToken(token)
  }
}
