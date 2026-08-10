"use client"

import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"

const DEMO_VAT = [
  { country: "NL", rate: 21, base: 18420.5, vat: 3868.31 },
  { country: "DE", rate: 19, base: 4120.0, vat: 782.8 },
  { country: "BE", rate: 21, base: 2980.75, vat: 625.96 },
  { country: "FR", rate: 20, base: 1560.0, vat: 312.0 },
]

export default function SellerFinanceBtwPage() {
  const locale = useStorefrontLocale()
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

      {DEMO_VAT.length === 0 ? (
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
              {DEMO_VAT.map((row) => (
                <tr
                  key={row.country}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5">{row.country}</td>
                  <td className="px-4 py-2.5">{row.rate}%</td>
                  <td className="px-4 py-2.5">{formatEuro(row.base)}</td>
                  <td className="px-4 py-2.5">{formatEuro(row.vat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SellerGate>
  )
}
