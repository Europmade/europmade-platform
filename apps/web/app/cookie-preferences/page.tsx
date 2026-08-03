"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
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
import { cn } from "@europmade/utils"

/**
 * Cookie Consent — Voorkeuren beheren (S3-01-06 / cookie-02).
 */
export default function CookiePreferencesPage() {
  const router = useRouter()
  const [affiliateTracking, setAffiliateTracking] = useState(true)
  const [analytics, setAnalytics] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const existing = loadPreferences()
    if (existing) {
      setAffiliateTracking(existing.affiliate_tracking)
      setAnalytics(existing.analytics)
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    const visitorKey = getOrCreateVisitorKey()
    const prefs: CookiePreferences = {
      necessary: true,
      affiliate_tracking: affiliateTracking,
      analytics,
      decided_at: new Date().toISOString(),
    }
    savePreferences(prefs)
    if (affiliateTracking) {
      persistVisitorCookie(visitorKey)
    } else {
      clearAffiliateTrackingCookies()
    }
    try {
      await recordConsent(visitorKey, affiliateTracking)
    } catch {
      // Lokale voorkeuren zijn leidend; server-sync is best-effort.
    }
    setSaving(false)
    router.push("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-wf-100 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-md border border-wf-400 bg-white px-6 py-8">
        <h1 className="text-[19px] font-bold text-wf-900">Cookievoorkeuren</h1>
        <p className="mt-1.5 text-xs text-wf-600">
          Beheer per categorie welke cookies zijn toegestaan.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <ToggleRow
            title="Noodzakelijk"
            description="Vereist voor het functioneren van de website (bijv. sessiebeheer, winkelwagen). Kan niet worden uitgeschakeld."
            on
            locked
          />
          <ToggleRow
            title="Affiliate-tracking"
            description="Maakt cookie-gebaseerde toeschrijving aan een Affiliate mogelijk (ConsentRecord)."
            on={affiliateTracking}
            onToggle={() => setAffiliateTracking((v) => !v)}
          />
          <ToggleRow
            title="Analytics"
            description="Geanonimiseerde statistieken over websitegebruik."
            on={analytics}
            onToggle={() => setAnalytics((v) => !v)}
          />

          <div className="flex flex-wrap gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Opslaan…" : "Voorkeuren opslaan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ToggleRow({
  title,
  description,
  on,
  locked,
  onToggle,
}: {
  title: string
  description: string
  on: boolean
  locked?: boolean
  onToggle?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-wf-200 py-4">
      <div>
        <div className="text-sm font-semibold text-wf-900">{title}</div>
        <div className="mt-1 text-[11.5px] leading-relaxed text-wf-600">
          {description}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-disabled={locked || undefined}
        disabled={locked}
        onClick={onToggle}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          on ? "border-wf-900 bg-wf-900" : "border-wf-400 bg-wf-200",
          locked && "opacity-70"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 rounded-full bg-white transition-transform",
            on ? "left-5" : "left-0.5"
          )}
          style={{ width: 18, height: 18 }}
        />
      </button>
    </div>
  )
}
