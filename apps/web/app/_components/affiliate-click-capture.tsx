"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { trackAffiliateClick } from "../_lib/affiliate-api"
import {
  getOrCreateVisitorKey,
  loadPreferences,
  persistClickCookie,
  persistVisitorCookie,
  readCookie,
  VISITOR_COOKIE,
} from "../_lib/cookie-consent"

/**
 * Server-side click na ?ref=… alleen bij actieve toestemming (ADR-0029).
 */
export function AffiliateClickCapture() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const tracking = searchParams.get("ref")?.trim()
    if (!tracking || tracking.length < 3) return

    const prefs = loadPreferences()
    if (!prefs?.affiliate_tracking) return

    let visitorKey = readCookie(VISITOR_COOKIE)
    if (!visitorKey) {
      visitorKey = getOrCreateVisitorKey()
      persistVisitorCookie(visitorKey)
    }

    let cancelled = false
    trackAffiliateClick(tracking, visitorKey)
      .then((result) => {
        if (!cancelled) persistClickCookie(result.click_id)
      })
      .catch(() => {
        // stil: ongeldige param / geen consent server-side
      })

    return () => {
      cancelled = true
    }
  }, [searchParams])

  return null
}
