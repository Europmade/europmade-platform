"use client"

import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"

const DEMO_VAT = [
  { country: "NL", rate: 21, base: 18420.5, vat: 3868.31 },
  { country: "DE", rate: 19, base: 4120.0, vat: 782.8 },
  { country: "BE", rate: 21, base: 2980.75, vat: 625.96 },
  { country: "FR", rate: 20, base: 1560.0, vat: 312.0 },
]

export default function SellerFinanceBtwPage() {
  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Financiën", href: "/seller/finance" },
        { label: "BTW (OSS)" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">BTW-overzicht (OSS)</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Omzet en BTW per EU-land voor One-Stop-Shop rapportage.
      </p>

      {DEMO_VAT.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Geen BTW-gegevens"
            description="OSS-regels verschijnen hier zodra er grensoverschrijdende verkopen zijn."
          />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {["Land", "Tarief", "Grondslag", "BTW"].map((h) => (
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
