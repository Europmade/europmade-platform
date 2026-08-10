"use client"

import { Badge } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { DEMO_PAYOUTS } from "../../_lib/demo-data"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

export default function SellerFinanceUitbetalingenPage() {
  const locale = useStorefrontLocale()
  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavFinance", locale), href: "/seller/finance" },
        { label: t("sellerFinancePayouts", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerFinancePayouts", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerFinancePayoutsIntro", locale)}
      </p>

      {DEMO_PAYOUTS.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t("sellerFinancePayoutsEmptyTitle", locale)}
            description={t("sellerFinancePayoutsEmptyDesc", locale)}
          />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  t("commonStatus", locale),
                  t("commonAmount", locale),
                  t("commonDate", locale),
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
              {DEMO_PAYOUTS.map((p) => (
                <tr key={p.id} className="border-b border-wf-200 last:border-b-0">
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">
                      {statusLabel(p.status, locale)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">{formatEuro(p.amount)}</td>
                  <td className="px-4 py-2.5">{p.eligible_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SellerGate>
  )
}
