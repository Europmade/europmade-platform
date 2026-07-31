"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  AffiliateApiError,
  getAffiliate,
  type AffiliateRecord,
} from "../../_lib/affiliate-api"
import { AffiliateShell } from "./affiliate-shell"

export type AffiliateGateProps = {
  breadcrumb: Array<{ label: string; href?: string }>
  children: React.ReactNode
  /** Sta registratiepagina toe zonder goedgekeurde affiliate. */
  allowRegistration?: boolean
}

/**
 * Sessie + affiliate-status voor Affiliate Dashboard (S3-07-04/05).
 */
export function AffiliateGate({
  breadcrumb,
  children,
  allowRegistration = false,
}: AffiliateGateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [affiliate, setAffiliate] = useState<
    AffiliateRecord | null | "loading"
  >("loading")

  useEffect(() => {
    let cancelled = false
    getAffiliate()
      .then(({ affiliate: current }) => {
        if (cancelled) return
        if (!current) {
          if (allowRegistration || pathname === "/affiliate/register") {
            setAffiliate(null)
            return
          }
          router.replace("/affiliate/register")
          return
        }
        if (
          current.onboarding_status !== "Goedgekeurd" &&
          !allowRegistration &&
          pathname !== "/affiliate/register"
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
            `/login?redirect=${encodeURIComponent(pathname || "/affiliate")}`
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
        Laden…
      </div>
    )
  }

  return (
    <AffiliateShell breadcrumb={breadcrumb}>{children}</AffiliateShell>
  )
}
