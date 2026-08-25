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
  getFinancePayout,
  type FinancePayout,
} from "../../../../../lib/finance-admin-api"

export default function FinancePayoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [error, setError] = useState<string | null>(null)
  const [payout, setPayout] = useState<FinancePayout | null>(null)

  useEffect(() => {
    let cancelled = false
    getFinancePayout(id)
      .then((res) => {
        if (!cancelled) {
          setPayout(res.payout)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof FinanceAdminApiError
              ? err.message
              : "Payout laden mislukt."
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Payout</h1>
      <div className="mt-4">
        <FinanceNav />
      </div>
      {error ? <Notice variant="warning">{error}</Notice> : null}
      {!payout ? (
        error ? null : (
          <p className="text-xs text-wf-600">Laden…</p>
        )
      ) : (
        <section className="rounded-lg border border-wf-300 bg-white p-4 text-xs">
          <p className="text-lg font-semibold">
            {formatFinanceEuro(payout.amount)} {payout.currency}
          </p>
          <p className="mt-1">
            <Badge>{payout.status}</Badge> · {payout.recipient_type}
          </p>
          <dl className="mt-3 grid gap-2 tablet:grid-cols-2">
            <div>
              <dt className="text-wf-500">Ontvanger</dt>
              <dd>
                {payout.recipient_type === "Seller" && payout.seller_id ? (
                  <Link
                    href={`/finance/sellers/${payout.seller_id}`}
                    className="underline"
                  >
                    {payout.seller_name}
                  </Link>
                ) : payout.affiliate_id ? (
                  <Link
                    href={`/finance/affiliates/${payout.affiliate_id}`}
                    className="underline"
                  >
                    {payout.affiliate_name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-wf-500">Order</dt>
              <dd>
                {payout.order_id ? (
                  <Link href={`/orders/${payout.order_id}`} className="underline">
                    {payout.order_number || payout.order_id}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-wf-500">eligible_at</dt>
              <dd>{formatFinanceDate(payout.eligible_at)}</dd>
            </div>
            <div>
              <dt className="text-wf-500">processed_at</dt>
              <dd>{formatFinanceDate(payout.processed_at)}</dd>
            </div>
            <div>
              <dt className="text-wf-500">Transferreferentie</dt>
              <dd>{payout.stripe_transfer_id || "—"}</dd>
            </div>
            <div>
              <dt className="text-wf-500">Periode</dt>
              <dd>{payout.period}</dd>
            </div>
          </dl>
          <p className="mt-4 text-wf-500">{payout.process_note}</p>
          <h2 className="mb-1 mt-4 font-semibold">Gekoppelde commissies</h2>
          <ul>
            {(payout.commissions ?? []).map((c) => (
              <li key={c.id}>
                {c.recipient_type}: {formatFinanceEuro(c.amount)} · {c.status}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
