"use client"

import { SellerGate } from "../_components/seller-gate"
import {
  extensionMarketingModules,
  mvpMarketingModules,
} from "../_lib/marketing/module-registry"
import { MarketingModuleCard } from "./_components/marketing-module-card"

/**
 * Marketing Center hub — MVP-modules + uitbreidpunten (registry only).
 */
export default function SellerMarketingCenterPage() {
  const mvp = mvpMarketingModules()
  const extensions = extensionMarketingModules()

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Marketing" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Marketing Center</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Banners, sponsored products, affiliate-commissies en marketingfacturen.
      </p>

      <h2 className="mb-2.5 mt-8 text-[12px] uppercase tracking-[0.04em] text-wf-500">
        Marketplace-modules
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
