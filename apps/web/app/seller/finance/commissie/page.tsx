"use client"

import { Badge } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { DEMO_ORDERS } from "../../_lib/demo-data"

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
  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Financiën", href: "/seller/finance" },
        { label: "Commissie" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Commissie-overzicht</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Ingehouden platformcommissie per order.
      </p>

      {DEMO_COMMISSIONS.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Geen commissies"
            description="Commissieregels verschijnen hier zodra er betaalde orders zijn."
          />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {["Order", "Datum", "Basis", "Tarief", "Commissie", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {DEMO_COMMISSIONS.map((row) => (
                <tr key={row.id} className="border-b border-wf-200 last:border-b-0">
                  <td className="px-4 py-2.5">{row.order_number}</td>
                  <td className="px-4 py-2.5">
                    {new Date(row.date).toLocaleDateString("nl-NL")}
                  </td>
                  <td className="px-4 py-2.5">{formatEuro(row.base)}</td>
                  <td className="px-4 py-2.5">{row.rate * 100}%</td>
                  <td className="px-4 py-2.5">{formatEuro(row.amount)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">{row.status}</Badge>
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
