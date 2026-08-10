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
import { useStorefrontLocale } from "../_lib/i18n/use-storefront-locale"
import { t } from "../_lib/i18n/messages"

/**
 * Cookie Consent — Eerste bezoek (S3-01-06 / cookie-01 wireframe).
 */
export function CookieConsentBanner() {
  const pathname = usePathname()
  const locale = useStorefrontLocale()
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
    const prefs: CookiePreferences = {
      necessary: true,
      affiliate_tracking: affiliateTracking,
      analytics: false,
      decided_at: new Date().toISOString(),
    }
    // Lokale beslissing is leidend (banner moet altijd kunnen sluiten).
    savePreferences(prefs)
    if (affiliateTracking) {
      persistVisitorCookie(visitorKey)
    } else {
      clearAffiliateTrackingCookies()
    }
    setVisible(false)
    // ConsentRecord op de backend is best-effort (ADR-0029 / affiliate).
    try {
      await recordConsent(visitorKey, affiliateTracking)
    } catch {
      // Netwerk/backend-fout mag de UI niet blokkeren.
    }
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-wf-900 bg-white px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] tablet:px-7">
      <h3 className="text-sm font-bold text-wf-900">
        {t("cookieBannerTitle", locale)}
      </h3>
      <p className="mt-2 max-w-2xl text-[11.5px] leading-relaxed text-wf-600">
        {t("cookieBannerBody", locale)}
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <Button type="button" onClick={() => void applyDecision(true)}>
          {t("cookieAcceptAll", locale)}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void applyDecision(false)}
        >
          {t("cookieReject", locale)}
        </Button>
        <Link
          href="/cookie-preferences"
          className="inline-flex items-center justify-center rounded-wf border border-transparent px-[18px] py-[9px] text-sm font-semibold text-wf-700 underline hover:text-wf-900"
        >
          {t("cookieManagePreferences", locale)}
        </Link>
      </div>
    </div>
  )
}
