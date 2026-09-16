"use client"

import { useEffect, useState } from "react"
import { Badge } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"
import { medusaBackendUrl } from "../../../_lib/medusa-backend-url"

type CommissionRow = {
  id: string
  order_number: string
  order_subtotal: number
  amount: number
  percentage: number
  status: string
  created_at: string
}

export default function SellerFinanceCommissiePage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const [commissions, setCommissions] = useState<CommissionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
    fetch(`${medusaBackendUrl()}/store/finance/seller`, {
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(PK ? { "x-publishable-api-key": PK } : {}),
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setCommissions(d?.commissions ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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

      {!loading && commissions.length === 0 ? (
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
              {commissions.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5">{row.order_number}</td>
                  <td className="px-4 py-2.5">
                    {new Date(row.created_at).toLocaleDateString(intl)}
                  </td>
                  <td className="px-4 py-2.5">
                    {formatEuro(row.order_subtotal)}
                  </td>
                  <td className="px-4 py-2.5">
                    {(row.percentage * 100).toFixed(1)}%
                  </td>
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
