"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  AffiliateApiError,
  getAffiliate,
  type AffiliateRecord,
} from "../../_lib/affiliate-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"
import { AffiliateShell } from "./affiliate-shell"

export type AffiliateGateProps = {
  breadcrumb: Array<{ label: string; href?: string }>
  children: React.ReactNode
  /** Sta registratiepagina toe zonder goedgekeurde affiliate. */
  allowRegistration?: boolean
}

/**
 * Sessie + affiliate-status voor Affiliate Dashboard.
 */
export function AffiliateGate({
  breadcrumb,
  children,
  allowRegistration = false,
}: AffiliateGateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useStorefrontLocale()
  const [affiliate, setAffiliate] = useState<
    AffiliateRecord | null | "loading"
  >("loading")

  useEffect(() => {
    let cancelled = false
    getAffiliate()
      .then(({ affiliate: current }) => {
        if (cancelled) return
        if (!current) {
          if (allowRegistration || pathname.startsWith("/affiliate/register")) {
            setAffiliate(null)
            return
          }
          router.replace("/affiliate/register")
          return
        }
        if (
          current.onboarding_status !== "Goedgekeurd" &&
          !allowRegistration &&
          !pathname.startsWith("/affiliate/register")
        ) {
          router.replace("/affiliate/register")
          return
        }
        setAffiliate(current)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof AffiliateApiError && err.status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent(pathname || "/affiliate/dashboard")}`
          )
          return
        }
        if (allowRegistration) {
          setAffiliate(null)
          return
        }
        router.replace("/affiliate/register")
      })
    return () => {
      cancelled = true
    }
  }, [router, pathname, allowRegistration])

  if (affiliate === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-wf-100 text-sm text-wf-600">
        {t("loading", locale)}
      </div>
    )
  }

  return (
    <AffiliateShell breadcrumb={breadcrumb}>{children}</AffiliateShell>
  )
}
