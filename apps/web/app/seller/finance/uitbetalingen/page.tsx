"use client"

import { useEffect, useState } from "react"
import { Badge, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"
import { medusaBackendUrl } from "../../../_lib/medusa-backend-url"

type PayoutRow = {
  id: string
  amount: number
  status: string
  eligible_at: string
  order_number: string | null
}

export default function SellerFinanceUitbetalingenPage() {
  const locale = useStorefrontLocale()
  const [payouts, setPayouts] = useState<PayoutRow[]>([])
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
        setPayouts(d?.payouts ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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

      <Notice variant="info" className="mt-4">
        {t("sellerFinancePayoutNotInvoice", locale)}
      </Notice>

      {!loading && payouts.length === 0 ? (
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
                  t("commonOrder", locale),
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
              {payouts.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">
                      {statusLabel(p.status, locale)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">{formatEuro(p.amount)}</td>
                  <td className="px-4 py-2.5">{p.eligible_at}</td>
                  <td className="px-4 py-2.5">{p.order_number ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SellerGate>
  )
}
