"use client"

import { Badge } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { KpiCard } from "../../_components/kpi-card"
import { DashboardSection } from "../../_components/dashboard-section"
import { formatEuro } from "../../../_components/storefront-shell"
import { DEMO_MARKETING_INVOICES } from "../../_lib/demo-data"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t, type StorefrontMessageKey } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

const TYPE_KEYS: Record<string, StorefrontMessageKey> = {
  banner_campaigns: "sellerBillingTypeBanner",
  affiliate_commissions: "sellerBillingTypeAffiliate",
  premium_options: "sellerBillingTypePremium",
}

/**
 * Marketing Facturen — demo-data.
 */
export default function SellerMarketingBillingPage() {
  const locale = useStorefrontLocale()
  const lines = DEMO_MARKETING_INVOICES
  const openAmount = lines
    .filter((l) => l.status !== "Betaald")
    .reduce((sum, l) => sum + l.amount, 0)
  const paidAmount = lines
    .filter((l) => l.status === "Betaald")
    .reduce((sum, l) => sum + l.amount, 0)
  const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0)

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavMarketing", locale), href: "/seller/marketing" },
        { label: t("sellerMktBillingTitle", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerMktBillingTitle", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerBillingIntro", locale)}
      </p>

      <DashboardSection title={t("commonSummary", locale)} wrapChildren={false}>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
          <KpiCard
            value={formatEuro(openAmount)}
            label={t("sellerBillingOutstanding", locale)}
            source="api"
          />
          <KpiCard
            value={formatEuro(paidAmount)}
            label={statusLabel("Betaald", locale)}
            source="api"
          />
          <KpiCard
            value={formatEuro(totalAmount)}
            label={t("sellerBillingTotal", locale)}
            source="api"
            emphasis="primary"
          />
        </div>
      </DashboardSection>

      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("commonHistory", locale)}
        </h2>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  t("commonDescription", locale),
                  t("commonAmount", locale),
                  t("commonStatus", locale),
                ].map((h) => (
                  <th
                    key={h}
                    className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5 text-wf-800">
                    <div>{line.description}</div>
                    <div className="mt-0.5 text-[10.5px] text-wf-500">
                      {TYPE_KEYS[line.type]
                        ? t(TYPE_KEYS[line.type]!, locale)
                        : line.type}{" "}
                      · {line.period_key}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-wf-800">
                    {formatEuro(line.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">
                      {statusLabel(line.status, locale)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SellerGate>
  )
}
