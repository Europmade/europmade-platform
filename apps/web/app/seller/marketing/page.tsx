"use client"

import { SellerGate } from "../_components/seller-gate"
import {
  extensionMarketingModules,
  mvpMarketingModules,
} from "../_lib/marketing/module-registry"
import { MarketingModuleCard } from "./_components/marketing-module-card"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"

/**
 * Marketing Center hub — MVP-modules + uitbreidpunten (registry only).
 */
export default function SellerMarketingCenterPage() {
  const locale = useStorefrontLocale()
  const mvp = mvpMarketingModules()
  const extensions = extensionMarketingModules()

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavMarketing", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerNavMarketing", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerMarketingIntro", locale)}
      </p>

      <h2 className="mb-2.5 mt-8 text-[12px] uppercase tracking-[0.04em] text-wf-500">
        {t("sellerMarketingModules", locale)}
      </h2>
      <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
        {mvp.map((module) => (
          <MarketingModuleCard key={module.id} module={module} />
        ))}
      </div>

      {/* Uitbreidpunten: alleen data-attr, geen UI-kaarten. */}
      <div
        className="sr-only"
        data-marketing-extensions={extensions.map((e) => e.id).join(",")}
        aria-hidden
      />
    </SellerGate>
  )
}
