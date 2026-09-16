"use client"

import { useEffect, useState } from "react"
import { Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"
import { medusaBackendUrl } from "../../../_lib/medusa-backend-url"

type VatRow = {
  country_code: string
  country_label: string
  amount_excl: number
  vat_rate: number
  vat_amount: number
}

export default function SellerFinanceBtwPage() {
  const locale = useStorefrontLocale()
  const [vatRows, setVatRows] = useState<VatRow[]>([])
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
        setVatRows(d?.vat_by_country ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavFinance", locale), href: "/seller/finance" },
        { label: t("sellerFinanceVatOssShort", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerFinanceVatOss", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerFinanceVatIntro", locale)}
      </p>

      <Notice variant="info" className="mt-4">
        {t("sellerFinanceVatDemoNotice", locale)}
      </Notice>

      {!loading && vatRows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t("sellerFinanceVatEmptyTitle", locale)}
            description={t("sellerFinanceVatEmptyDesc", locale)}
          />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  t("commonCountry", locale),
                  t("sellerFinanceVatRate", locale),
                  t("sellerFinanceVatBase", locale),
                  t("sellerFinanceVatLabel", locale),
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
              {vatRows.map((row) => (
                <tr
                  key={row.country_code}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5">
                    {row.country_label} ({row.country_code})
                  </td>
                  <td className="px-4 py-2.5">
                    {(row.vat_rate * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-2.5">
                    {formatEuro(row.amount_excl)}
                  </td>
                  <td className="px-4 py-2.5">
                    {formatEuro(row.vat_amount)}
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
