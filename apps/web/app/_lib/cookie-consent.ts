/**
 * Client-side cookie/consent helpers (ADR-0029 / S3-01-06).
 */

export const VISITOR_COOKIE = "em_aff_vid"
export const CLICK_COOKIE = "em_aff_clk"
export const CONSENT_STORAGE_KEY = "em_cookie_prefs"

export type CookiePreferences = {
  necessary: true
  affiliate_tracking: boolean
  analytics: boolean
  decided_at: string
}

const ATTRIBUTION_MAX_AGE_SEC = 30 * 24 * 60 * 60

function isBrowser(): boolean {
  return typeof document !== "undefined" && typeof window !== "undefined"
}

export function readCookie(name: string): string | null {
  if (!isBrowser()) return null
  const parts = document.cookie.split(";").map((p) => p.trim())
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1))
    }
  }
  return null
}

export function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (!isBrowser()) return
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`
}

export function clearCookie(name: string) {
  if (!isBrowser()) return
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

export function getOrCreateVisitorKey(): string {
  const existing = readCookie(VISITOR_COOKIE)
  if (existing && existing.length >= 8) return existing
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `vid-${Date.now()}-${Math.random().toString(36).slice(2)}`
  // Alleen na toestemming mag de cookie gezet worden (ADR-0029).
  // Houd een tijdelijke sleutel in sessionStorage tot accept.
  if (isBrowser()) {
    try {
      const staged = sessionStorage.getItem("em_aff_vid_staged")
      if (staged && staged.length >= 8) return staged
      sessionStorage.setItem("em_aff_vid_staged", key)
    } catch {
      return key
    }
  }
  return key
}

export function persistVisitorCookie(visitorKey: string) {
  writeCookie(VISITOR_COOKIE, visitorKey, ATTRIBUTION_MAX_AGE_SEC)
  if (isBrowser()) {
    try {
      sessionStorage.removeItem("em_aff_vid_staged")
    } catch {
      // ignore
    }
  }
}

export function persistClickCookie(clickId: string) {
  writeCookie(CLICK_COOKIE, clickId, ATTRIBUTION_MAX_AGE_SEC)
}

export function clearAffiliateTrackingCookies() {
  clearCookie(VISITOR_COOKIE)
  clearCookie(CLICK_COOKIE)
}

export function loadPreferences(): CookiePreferences | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("affiliate_tracking" in parsed) ||
      typeof (parsed as CookiePreferences).affiliate_tracking !== "boolean"
    ) {
      return null
    }
    return {
      necessary: true,
      affiliate_tracking: (parsed as CookiePreferences).affiliate_tracking,
      analytics:
        typeof (parsed as CookiePreferences).analytics === "boolean"
          ? (parsed as CookiePreferences).analytics
          : false,
      decided_at:
        typeof (parsed as CookiePreferences).decided_at === "string"
          ? (parsed as CookiePreferences).decided_at
          : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function savePreferences(prefs: CookiePreferences) {
  if (!isBrowser()) return
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(prefs))
}
