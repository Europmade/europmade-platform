"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Notice } from "@europmade/ui"
import { FinanceNav } from "../../../../../components/finance-nav"
import {
  FinanceAdminApiError,
  formatFinanceDate,
  formatFinanceEuro,
  getFinanceAffiliate,
  type FinancePeriodKey,
} from "../../../../../lib/finance-admin-api"

export default function FinanceAffiliateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [period, setPeriod] = useState<FinancePeriodKey>("last_30_days")
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getFinanceAffiliate>
  > | null>(null)

  useEffect(() => {
    let cancelled = false
    getFinanceAffiliate(id, period)
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof FinanceAdminApiError
              ? err.message
              : "Affiliate-finance laden mislukt."
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, period])

  const affiliate = data?.affiliate

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">
        {affiliate?.affiliate_name ?? "Affiliate finance"}
      </h1>
      <div className="mt-4">
        <FinanceNav period={period} onPeriodChange={setPeriod} />
      </div>
      {error ? <Notice variant="warning">{error}</Notice> : null}
      {!affiliate ? (
        error ? null : (
          <p className="text-xs text-wf-600">Laden…</p>
        )
      ) : (
        <>
          <p className="mb-3 text-xs text-wf-600">
            Status: {affiliate.status ? <Badge>{affiliate.status}</Badge> : "—"}{" "}
            ·{" "}
            <Link href={`/affiliate/${affiliate.affiliate_id}`} className="underline">
              Affiliate-review
            </Link>
          </p>
          <dl className="mb-6 grid grid-cols-2 gap-3 text-xs tablet:grid-cols-4">
            <div className="rounded border border-wf-300 bg-white p-3">
              <dt className="text-wf-500">Omzet</dt>
              <dd className="font-semibold">
                {formatFinanceEuro(affiliate.revenue)}
              </dd>
            </div>
            <div className="rounded border border-wf-300 bg-white p-3">
              <dt className="text-wf-500">Commissie</dt>
              <dd className="font-semibold">
                {formatFinanceEuro(affiliate.commission)}
              </dd>
            </div>
            <div className="rounded border border-wf-300 bg-white p-3">
              <dt className="text-wf-500">Openstaand</dt>
              <dd className="font-semibold">
                {formatFinanceEuro(affiliate.commission_open)}
              </dd>
            </div>
            <div className="rounded border border-wf-300 bg-white p-3">
              <dt className="text-wf-500">Betaald / teruggedraaid</dt>
              <dd className="font-semibold">
                {formatFinanceEuro(affiliate.payout_paid)} /{" "}
                {formatFinanceEuro(affiliate.payout_reversed)}
              </dd>
            </div>
          </dl>
          <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Uitbetalingen
          </h2>
          <ul className="mb-6 space-y-1 text-xs">
            {(data?.payouts ?? []).map((p) => (
              <li key={p.id}>
                <Link href={`/finance/payouts/${p.id}`} className="underline">
                  {p.id}
                </Link>{" "}
                {formatFinanceEuro(p.amount)} <Badge>{p.status}</Badge> ·
                eligible {formatFinanceDate(p.eligible_at)}
              </li>
            ))}
          </ul>
          <h2 className="mb-2 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Recente transacties
          </h2>
          <ul className="space-y-1 text-xs">
            {(data?.transactions ?? []).map((t) => (
              <li key={t.id}>
                <Link href={`/finance/transactions/${t.id}`} className="underline">
                  {formatFinanceDate(t.created_at)}
                </Link>{" "}
                {t.type} {formatFinanceEuro(t.amount)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
