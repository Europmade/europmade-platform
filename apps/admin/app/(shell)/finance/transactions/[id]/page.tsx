"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Notice } from "@europmade/ui"
import { FinanceNav } from "../../../../../components/finance-nav"
import {
  FINANCE_TXN_TYPE_LABELS,
  FinanceAdminApiError,
  formatFinanceDate,
  formatFinanceEuro,
  getFinanceTransaction,
  type FinanceTxnType,
} from "../../../../../lib/finance-admin-api"

export default function FinanceTransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getFinanceTransaction>
  > | null>(null)

  useEffect(() => {
    let cancelled = false
    getFinanceTransaction(id)
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
              : "Transactie laden mislukt."
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const row = data?.transaction

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Transactiedetail</h1>
      <div className="mt-4">
        <FinanceNav />
      </div>
      {error ? <Notice variant="warning">{error}</Notice> : null}
      {!data || !row ? (
        error ? null : (
          <p className="text-xs text-wf-600">Laden…</p>
        )
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-wf-300 bg-white p-4 text-xs">
            <p className="text-[11px] uppercase tracking-[0.04em] text-wf-500">
              {FINANCE_TXN_TYPE_LABELS[row.type as FinanceTxnType] ?? row.type}
            </p>
            <p className="mt-1 text-lg font-semibold text-wf-900">
              {formatFinanceEuro(row.amount)} {row.currency}
            </p>
            <p className="mt-1">
              Status: <Badge>{row.status}</Badge>
            </p>
            <dl className="mt-3 grid gap-2 tablet:grid-cols-2">
              <div>
                <dt className="text-wf-500">Datum</dt>
                <dd>{formatFinanceDate(row.created_at)}</dd>
              </div>
              <div>
                <dt className="text-wf-500">Order</dt>
                <dd>
                  {row.order_id ? (
                    <Link href={`/orders/${row.order_id}`} className="underline">
                      {row.order_number || row.order_id}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-wf-500">Partij</dt>
                <dd>
                  {row.party_type === "seller" && row.party_id ? (
                    <Link
                      href={`/finance/sellers/${row.party_id}`}
                      className="underline"
                    >
                      {row.party_name}
                    </Link>
                  ) : row.party_type === "affiliate" && row.party_id ? (
                    <Link
                      href={`/finance/affiliates/${row.party_id}`}
                      className="underline"
                    >
                      {row.party_name}
                    </Link>
                  ) : (
                    row.party_name || "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-wf-500">Commissie</dt>
                <dd>
                  {row.commission_amount != null
                    ? formatFinanceEuro(row.commission_amount)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-wf-500">Payout-status</dt>
                <dd>{row.payout_status || "—"}</dd>
              </div>
              <div>
                <dt className="text-wf-500">Referentie</dt>
                <dd>{row.reference || "—"}</dd>
              </div>
            </dl>
          </section>

          {data.payout ? (
            <section className="rounded-lg border border-wf-300 bg-white p-4 text-xs">
              <h2 className="mb-2 font-semibold">Payout</h2>
              <p>
                <Link
                  href={`/finance/payouts/${data.payout.id}`}
                  className="underline"
                >
                  {data.payout.id}
                </Link>{" "}
                · {formatFinanceEuro(data.payout.amount)} · {data.payout.status}
              </p>
              <p className="mt-1 text-wf-500">
                eligible_at {formatFinanceDate(data.payout.eligible_at)} ·
                processed_at {formatFinanceDate(data.payout.processed_at)}
              </p>
            </section>
          ) : null}

          <section className="rounded-lg border border-wf-300 bg-white p-4 text-xs">
            <h2 className="mb-2 font-semibold">Commissies op deze order</h2>
            {data.commissions.length === 0 ? (
              <p className="text-wf-500">Geen commissieregels.</p>
            ) : (
              <ul className="space-y-1">
                {data.commissions.map((c) => (
                  <li key={c.id}>
                    {c.recipient_type}: {formatFinanceEuro(c.amount)} (
                    {(c.percentage * 100).toFixed(1)}%) · {c.status}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-wf-300 bg-white p-4 text-xs">
            <h2 className="mb-2 font-semibold">Terugbetalingen / creditnota&apos;s</h2>
            {data.refunds.length === 0 ? (
              <p className="text-wf-500">Geen creditnota&apos;s.</p>
            ) : (
              <ul className="space-y-1">
                {data.refunds.map((r) => (
                  <li key={r.id}>
                    {r.id}: {formatFinanceEuro(r.total_amount)} ·{" "}
                    {formatFinanceDate(r.issued_at)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
