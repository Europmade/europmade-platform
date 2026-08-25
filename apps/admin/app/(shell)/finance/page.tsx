"use client"

import { useEffect, useState } from "react"
import { Notice } from "@europmade/ui"
import { FinanceNav } from "../../../components/finance-nav"
import { KpiCard } from "../../../components/kpi-card"
import {
  FinanceAdminApiError,
  formatFinanceEuro,
  getFinanceOverview,
  type FinanceOverview,
  type FinancePeriodKey,
} from "../../../lib/finance-admin-api"

/**
 * G1 — Admin Finance dashboard. KPI's uit bestaande commission/payout/order-data.
 */
export default function AdminFinancePage() {
  const [period, setPeriod] = useState<FinancePeriodKey>("last_30_days")
  const [data, setData] = useState<FinanceOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getFinanceOverview(period)
      .then((res) => {
        if (cancelled) return
        setData(res)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof FinanceAdminApiError
            ? err.message
            : "Finance overzicht laden mislukt."
        )
        setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period])

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Finance</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Platformoverzicht op bestaande finance- en ordergegevens. Geen demo-data.
      </p>
      <div className="mt-4">
        <FinanceNav period={period} onPeriodChange={setPeriod} />
      </div>

      {error ? <Notice variant="warning">{error}</Notice> : null}
      {loading ? (
        <p className="mt-4 text-xs text-wf-600">Laden…</p>
      ) : data ? (
        <>
          <p className="mb-3 text-[11px] text-wf-500">
            Periode: {data.period.label}
            {data.period.from
              ? ` (${new Date(data.period.from).toLocaleDateString("nl-NL")} – ${new Date(data.period.to).toLocaleDateString("nl-NL")})`
              : " (gehele historie)"}
          </p>
          <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
            <KpiCard
              value={formatFinanceEuro(data.kpis.revenue)}
              label="Totale omzet"
              source="api"
              note={data.notes.revenue}
              href="/finance/transactions"
            />
            <KpiCard
              value={formatFinanceEuro(data.kpis.platform_commission)}
              label="Platformcommissie"
              source="api"
              note={data.notes.platform_commission}
            />
            <KpiCard
              value={formatFinanceEuro(data.kpis.seller_amount)}
              label="Seller-bedrag"
              source="api"
              note={data.notes.seller_amount}
              href="/finance/sellers"
            />
            <KpiCard
              value={formatFinanceEuro(data.kpis.affiliate_commission)}
              label="Affiliatecommissie"
              source="api"
              note={data.notes.affiliate_commission}
              href="/finance/affiliates"
            />
            <KpiCard
              value={formatFinanceEuro(data.kpis.payouts_scheduled)}
              label="Openstaande payouts"
              source="api"
              note={`${data.kpis.open_payout_count} stuks · ${data.notes.payouts_scheduled}`}
              href="/finance/payouts"
            />
            <KpiCard
              value={formatFinanceEuro(data.kpis.payouts_processing)}
              label="Payouts in behandeling"
              source="api"
              note={`${data.kpis.processing_payout_count} stuks`}
              href="/finance/payouts"
            />
            <KpiCard
              value={formatFinanceEuro(data.kpis.payouts_paid)}
              label="Uitbetaald"
              source="api"
              note={data.notes.payouts_paid}
              href="/finance/payouts"
            />
            <KpiCard
              value={formatFinanceEuro(data.kpis.reversed)}
              label="Teruggedraaid"
              source="api"
              note={data.notes.reversed}
            />
            <KpiCard
              value={String(data.kpis.transaction_count)}
              label="Financiële transacties"
              source="api"
              note={`${data.kpis.order_count} orders in periode`}
              href="/finance/transactions"
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
