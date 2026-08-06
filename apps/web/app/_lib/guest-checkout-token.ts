const TOKEN_KEY = "em_guest_checkout_token"
const PENDING_ORDER_KEY = "em_guest_pending_order"

function randomToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `gco_${crypto.randomUUID().replace(/-/g, "")}`
  }
  return `gco_${Math.random().toString(36).slice(2)}${Date.now()}`
}

export function getGuestCheckoutToken(): string {
  if (typeof window === "undefined") return randomToken()
  const existing = localStorage.getItem(TOKEN_KEY)?.trim()
  if (existing && existing.length >= 8) return existing
  const created = randomToken()
  localStorage.setItem(TOKEN_KEY, created)
  return created
}

export function rememberPendingGuestOrder(paymentReference: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(PENDING_ORDER_KEY, paymentReference)
}

export function readPendingGuestOrder(): string | null {
  if (typeof window === "undefined") return null
  const value = localStorage.getItem(PENDING_ORDER_KEY)?.trim()
  return value && value.length >= 8 ? value : null
}

export function clearPendingGuestOrder() {
  if (typeof window === "undefined") return
  localStorage.removeItem(PENDING_ORDER_KEY)
}
