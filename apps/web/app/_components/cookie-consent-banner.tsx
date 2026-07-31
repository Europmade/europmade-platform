"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@europmade/ui"
import { recordConsent } from "../_lib/affiliate-api"
import {
  clearAffiliateTrackingCookies,
  getOrCreateVisitorKey,
  loadPreferences,
  persistVisitorCookie,
  savePreferences,
  type CookiePreferences,
} from "../_lib/cookie-consent"

/**
 * Cookie Consent — Eerste bezoek (S3-01-06 / cookie-01 wireframe).
 */
export function CookieConsentBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (pathname?.startsWith("/cookie-preferences")) {
      setVisible(false)
      return
    }
    setVisible(loadPreferences() === null)
  }, [pathname])

  async function applyDecision(affiliateTracking: boolean) {
    const visitorKey = getOrCreateVisitorKey()
    await recordConsent(visitorKey, affiliateTracking)
    const prefs: CookiePreferences = {
      necessary: true,
      affiliate_tracking: affiliateTracking,
      analytics: false,
      decided_at: new Date().toISOString(),
    }
    savePreferences(prefs)
    if (affiliateTracking) {
      persistVisitorCookie(visitorKey)
    } else {
      clearAffiliateTrackingCookies()
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-wf-900 bg-white px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] tablet:px-7">
      <h3 className="text-sm font-bold text-wf-900">Jouw privacy</h3>
      <p className="mt-2 max-w-2xl text-[11.5px] leading-relaxed text-wf-600">
        We gebruiken cookies voor het functioneren van de site en, met jouw
        toestemming, voor affiliate-trackinglinks. Zonder toestemming kun je nog
        steeds via een coupon-code aan een Affiliate worden toegeschreven.
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <Button type="button" onClick={() => void applyDecision(true)}>
          Alles accepteren
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void applyDecision(false)}
        >
          Weigeren
        </Button>
        <Link
          href="/cookie-preferences"
          className="inline-flex items-center justify-center rounded-wf border border-transparent px-[18px] py-[9px] text-sm font-semibold text-wf-700 underline hover:text-wf-900"
        >
          Voorkeuren beheren
        </Link>
      </div>
    </div>
  )
}
