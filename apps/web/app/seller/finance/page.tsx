"use client"

import Link from "next/link"
import { SellerGate } from "../_components/seller-gate"
import { KpiCard } from "../_components/kpi-card"
import { DashboardSection } from "../_components/dashboard-section"
import { formatEuro } from "../../_components/storefront-shell"
import {
  DEMO_FINANCE,
  DEMO_PAYOUTS,
  DEMO_REVENUE_HISTORY,
} from "../_lib/demo-data"

/**
 * Financiën — KPI's bovenaan met demo-data + omzethistorie.
 */
export default function SellerFinanceDashboardPage() {
  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Financiën", href: "/seller/finance" },
        { label: "Finance Dashboard" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Financiën</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Saldo, uitbetalingen, commissies en marketingkosten.
      </p>

      <DashboardSection title="Overzicht" wrapChildren={false}>
        <div className="mt-2 grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
          <KpiCard
            emphasis="primary"
            value={formatEuro(DEMO_FINANCE.available_balance)}
            label="Beschikbaar saldo"
            source="api"
          />
          <KpiCard
            value={formatEuro(DEMO_FINANCE.next_payout_amount)}
            label="Volgende uitbetaling"
            source="api"
            note={`Op ${DEMO_FINANCE.next_payout_date}`}
            href="/seller/finance/uitbetalingen"
            linkLabel="Uitbetalingen"
          />
          <KpiCard
            value={formatEuro(DEMO_FINANCE.open_commissions)}
            label="Open commissies"
            source="api"
            href="/seller/finance/commissie"
            linkLabel="Commissie"
          />
          <KpiCard
            value={formatEuro(DEMO_FINANCE.marketing_costs)}
            label="Marketingkosten"
            source="api"
            href="/seller/marketing/billing"
            linkLabel="Marketing facturen"
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Omzethistorie" wrapChildren={false}>
        <div className="mt-2 overflow-hidden rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {["Maand", "Omzet"].map((h) => (
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
              {[...DEMO_REVENUE_HISTORY].reverse().map((row) => (
                <tr
                  key={row.month}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5 text-wf-800">{row.month}</td>
                  <td className="px-4 py-2.5 text-wf-800">
                    {formatEuro(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardSection>

      <DashboardSection title="Open uitbetalingen" wrapChildren={false}>
        <div className="mt-2 overflow-hidden rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {["Status", "Bedrag", "Datum"].map((h) => (
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
                <tr
                  key={p.id}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5 text-wf-800">{p.status}</td>
                  <td className="px-4 py-2.5 text-wf-800">
                    {formatEuro(p.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-wf-800">{p.eligible_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardSection>

      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Snelkoppelingen
        </h2>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          {[
            {
              label: "Commissie-overzicht",
              href: "/seller/finance/commissie",
            },
            {
              label: "Facturen downloaden",
              href: "/seller/finance/facturen",
            },
            {
              label: "Uitbetalingen",
              href: "/seller/finance/uitbetalingen",
            },
            {
              label: "BTW-overzicht (OSS)",
              href: "/seller/finance/btw",
            },
          ].map((item, index, arr) => (
            <div
              key={item.href}
              className={`flex items-center justify-between px-4 py-3 text-xs text-wf-700 ${
                index < arr.length - 1 ? "border-b border-wf-200" : ""
              }`}
            >
              <span>{item.label}</span>
              <Link
                href={item.href}
                className="text-[11px] text-wf-800 underline"
              >
                Bekijken →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </SellerGate>
  )
}
