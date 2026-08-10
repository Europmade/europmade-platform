"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  getOnboarding,
  PartnerOnboardingApiError,
  type OnboardingRecord,
} from "../../partner-onboarding/_lib/partner-onboarding-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { SellerShell } from "./seller-shell"

function roleLabel(
  onboarding: OnboardingRecord,
  locale: StorefrontLocale
): string {
  if (onboarding.is_retailer && onboarding.is_producer_or_brand_owner) {
    return t("sellerRoleRetailerProducer", locale)
  }
  if (onboarding.is_producer_or_brand_owner) {
    return t("sellerRoleProducerBrand", locale)
  }
  if (onboarding.is_retailer) {
    return t("partnerRoleRetailer", locale)
  }
  return t("sellerRolePartner", locale)
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
  const locale = useStorefrontLocale()
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
        {t("loading", locale)}
      </div>
    )
  }

  return (
    <SellerShell
      roleLabel={roleLabel(onboarding, locale)}
      breadcrumb={breadcrumb}
    >
      {children}
    </SellerShell>
  )
}
