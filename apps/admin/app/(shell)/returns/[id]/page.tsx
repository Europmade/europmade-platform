"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import {
  OrderAdminApiError,
  forceAdminRefund,
  getAdminReturn,
} from "../../../../lib/order-admin-api"

function formatEuro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("nl-NL")
}

export default function ReturnDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getAdminReturn>
  > | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await getAdminReturn(params.id)
    setData(res)
  }

  useEffect(() => {
    let cancelled = false
    getAdminReturn(params.id)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof OrderAdminApiError
            ? err.message
            : "Retour laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [params.id])

  async function onForceRefund() {
    if (reason.trim().length < 3) return
    setBusy(true)
    setError(null)
    try {
      await forceAdminRefund(params.id, reason.trim())
      setReason("")
      await load()
    } catch (err: unknown) {
      setError(
        err instanceof OrderAdminApiError
          ? err.message
          : "Force refund mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (!data && !error) {
    return <p className="text-xs text-wf-600">Laden…</p>
  }

  const r = data?.return
  const line = data?.line

  return (
    <div>
      <Link href="/returns" className="text-xs font-semibold underline">
        ← Terug naar retouren
      </Link>
      <h1 className="mt-3 text-[19px] font-bold text-wf-900">Retourdetail</h1>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {data && r ? (
        <>
          <section className="mt-5 rounded-lg border border-wf-300 p-4 text-xs">
            <h2 className="text-[12px] font-semibold uppercase text-wf-700">
              Retourinformatie
            </h2>
            <div className="mt-3 grid gap-3 tablet:grid-cols-2">
              <div>
                <div className="text-wf-500">Status</div>
                <Badge variant="outline">{r.status}</Badge>
              </div>
              <div>
                <div className="text-wf-500">Datum</div>
                {formatDate(r.created_at)}
              </div>
              <div>
                <div className="text-wf-500">Reden</div>
                {r.reason || "—"}
              </div>
              <div>
                <div className="text-wf-500">Refundstatus</div>
                {r.refund_status || "—"}
              </div>
              <div>
                <div className="text-wf-500">Tracking</div>
                {r.tracking_code ? (
                  r.tracking_url ? (
                    <a
                      href={r.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {r.tracking_code}
                    </a>
                  ) : (
                    r.tracking_code
                  )
                ) : (
                  "Niet beschikbaar"
                )}
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-wf-300 p-4 text-xs">
            <h2 className="text-[12px] font-semibold uppercase text-wf-700">
              Order
            </h2>
            <p className="mt-2">
              <Link
                href={`/orders/${data.order.id}`}
                className="font-semibold underline"
              >
                {data.order.order_number}
              </Link>{" "}
              · {data.order.payment_status} ·{" "}
              {formatDate(data.order.created_at)}
            </p>
          </section>

          <section className="mt-4 grid gap-4 tablet:grid-cols-2">
            <div className="rounded-lg border border-wf-300 p-4 text-xs">
              <h2 className="text-[12px] font-semibold uppercase text-wf-700">
                Klant
              </h2>
              <p className="mt-2">{data.customer.name || "Niet beschikbaar"}</p>
              <p>{data.customer.email || "Niet beschikbaar"}</p>
            </div>
            <div className="rounded-lg border border-wf-300 p-4 text-xs">
              <h2 className="text-[12px] font-semibold uppercase text-wf-700">
                Seller
              </h2>
              <p className="mt-2 font-semibold">{data.seller.name}</p>
              <Link
                href={`/partners/${data.seller.id}`}
                className="underline"
              >
                Open Seller →
              </Link>
            </div>
          </section>

          {line ? (
            <section className="mt-4 rounded-lg border border-wf-300 p-4 text-xs">
              <h2 className="text-[12px] font-semibold uppercase text-wf-700">
                Product / orderregel
              </h2>
              <p className="mt-2 font-semibold">
                {line.product_id ? (
                  <Link
                    href={`/product-cloud/products/${line.product_id}`}
                    className="underline"
                  >
                    {line.product_name}
                  </Link>
                ) : (
                  line.product_name
                )}
              </p>
              <p className="text-wf-500">
                {line.variant_name || "—"} · SKU {line.sku || "—"}
              </p>
              <p className="mt-1">
                {line.quantity} × {formatEuro(line.unit_price)} ={" "}
                {formatEuro(line.line_total)}
              </p>
            </section>
          ) : null}

          {data.force_refund_available ? (
            <section className="mt-4 max-w-lg rounded-lg border border-wf-400 p-4 text-xs">
              <h2 className="text-sm font-bold">Force refund (Admin)</h2>
              <p className="mt-1 text-wf-600">
                Bestaande workflow POST …/force-refund. Verplichte reden.
              </p>
              <div className="mt-3">
                <Input
                  label="Reden"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={busy || reason.trim().length < 3}
                onClick={onForceRefund}
              >
                Forceer terugbetaling
              </Button>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
