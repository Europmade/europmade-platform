"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  getOnboarding,
  PartnerOnboardingApiError,
  type OnboardingRecord,
} from "../../partner-onboarding/_lib/partner-onboarding-api"
import { SellerShell } from "./seller-shell"

function roleLabel(onboarding: OnboardingRecord): string {
  if (onboarding.is_retailer && onboarding.is_producer_or_brand_owner) {
    return "Retailer + Producent"
  }
  if (onboarding.is_producer_or_brand_owner) {
    return "Producent/Merkhouder"
  }
  if (onboarding.is_retailer) {
    return "Retailer"
  }
  return "Partner"
}

export type SellerGateProps = {
  breadcrumb: Array<{ label: string; href?: string }>
  children: React.ReactNode
}

/**
 * Sessie + goedgekeurde partner vereist voor Seller Dashboard.
 */
export function SellerGate({ breadcrumb, children }: SellerGateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [onboarding, setOnboarding] = useState<
    OnboardingRecord | null | "loading"
  >("loading")

  useEffect(() => {
    let cancelled = false
    getOnboarding()
      .then(({ onboarding: current }) => {
        if (cancelled) return
        if (!current) {
          router.replace("/partner-onboarding")
          return
        }
        if (current.onboarding_status !== "Goedgekeurd") {
          router.replace("/partner-onboarding/status")
          return
        }
        setOnboarding(current)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof PartnerOnboardingApiError && err.status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent(pathname || "/seller")}`
          )
          return
        }
        router.replace("/partner-onboarding")
      })
    return () => {
      cancelled = true
    }
  }, [router, pathname])

  if (onboarding === "loading" || !onboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-wf-100 text-sm text-wf-600">
        Laden…
      </div>
    )
  }

  return (
    <SellerShell roleLabel={roleLabel(onboarding)} breadcrumb={breadcrumb}>
      {children}
    </SellerShell>
  )
}
