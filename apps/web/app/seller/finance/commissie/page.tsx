"use client"

import { Badge } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { DEMO_ORDERS } from "../../_lib/demo-data"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

const DEMO_COMMISSIONS = DEMO_ORDERS.slice(0, 10).map((o, i) => ({
  id: `com_${i}`,
  order_number: o.order_number,
  date: o.created_at,
  base: o.total,
  rate: 0.12,
  amount: Math.round(o.total * 0.12 * 100) / 100,
  status: i % 3 === 0 ? "Open" : "Verwerkt",
}))

export default function SellerFinanceCommissiePage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavFinance", locale), href: "/seller/finance" },
        { label: t("sellerFinanceCommission", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerFinanceCommissionOverview", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerFinanceCommissionIntro", locale)}
      </p>

      {DEMO_COMMISSIONS.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t("sellerFinanceCommissionEmptyTitle", locale)}
            description={t("sellerFinanceCommissionEmptyDesc", locale)}
          />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  t("commonOrder", locale),
                  t("commonDate", locale),
                  t("commonBase", locale),
                  t("commonRate", locale),
                  t("commonCommission", locale),
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
              {DEMO_COMMISSIONS.map((row) => (
                <tr key={row.id} className="border-b border-wf-200 last:border-b-0">
                  <td className="px-4 py-2.5">{row.order_number}</td>
                  <td className="px-4 py-2.5">
                    {new Date(row.date).toLocaleDateString(intl)}
                  </td>
                  <td className="px-4 py-2.5">{formatEuro(row.base)}</td>
                  <td className="px-4 py-2.5">{row.rate * 100}%</td>
                  <td className="px-4 py-2.5">{formatEuro(row.amount)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">
                      {statusLabel(row.status, locale)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SellerGate>
  )
}
