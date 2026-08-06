"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import { StorefrontShell, VatRow, formatEuro } from "../../_components/storefront-shell"
import {
  getOrderConfirmation,
  OrderServiceApiError,
} from "../../_lib/order-service-api"
import { clearPendingGuestOrder } from "../../_lib/guest-checkout-token"

function ConfirmationInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentRef = searchParams.get("payment_reference")?.trim() ?? ""
  const guest = searchParams.get("guest") === "1"
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<
    Awaited<ReturnType<typeof getOrderConfirmation>>["orders"] | "loading"
  >("loading")

  useEffect(() => {
    if (!paymentRef) {
      setOrders([])
      setError("Ontbrekende betaalreferentie.")
      return
    }
    getOrderConfirmation(paymentRef)
      .then((res) => {
        setOrders(res.orders)
        if (guest) clearPendingGuestOrder()
      })
      .catch((err: unknown) => {
        setOrders([])
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : "Bevestiging laden mislukt."
        )
      })
  }, [guest, paymentRef])

  const totals = (() => {
    if (orders === "loading" || orders.length === 0) {
      return { subtotal: 0, shipping: 0, vat: 0, total: 0 }
    }
    let goods = 0
    let vat = 0
    for (const row of orders) {
      for (const line of row.lines) {
        const unit = Number(line.unit_price_snapshot)
        const lineTotal = unit * Number(line.quantity)
        goods += lineTotal
        const rate = Number(line.vat_rate_snapshot)
        vat += lineTotal * (rate / (1 + rate))
      }
    }
    return {
      subtotal: Math.round(goods * 100) / 100,
      shipping: 0,
      vat: Math.round(vat * 100) / 100,
      total: Math.round(goods * 100) / 100,
    }
  })()

  return (
    <StorefrontShell>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-wf-900 text-xl text-white">
          ✓
        </div>
        <h1 className="text-[19px] font-bold text-wf-900">Bestelling geplaatst</h1>
        <p className="mt-2 text-sm text-wf-600">
          {orders !== "loading" && orders.length > 1
            ? `Je bestelling is opgesplitst in ${orders.length} pakketten — één per verkoper.`
            : "Bedankt voor je bestelling."}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Badge variant="solid">Betaald</Badge>
          {paymentRef ? (
            <Badge variant="outline">Ref {paymentRef.slice(-10)}</Badge>
          ) : null}
        </div>
      </div>

      <Notice className="mx-auto mb-6 max-w-xl">
        Je ontvangt per deelbestelling een aparte bevestiging. Track &amp; trace
        verschijnt zodra de verkoper verzendt.
      </Notice>

      {error ? (
        <Notice variant="warning" className="mx-auto mb-4 max-w-xl">
          {error}
        </Notice>
      ) : null}

      {orders === "loading" ? (
        <p className="text-center text-sm text-wf-600">Laden…</p>
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          {orders.map((row) => (
            <section
              key={row.order.id}
              className="rounded-lg border border-wf-200 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-wf-900">
                  Deelbestelling {row.order.order_number}
                </h2>
                <Badge variant="outline">
                  Verkoper {row.order.seller_id.slice(-6)}
                </Badge>
              </div>
              <p className="mb-2 text-[11px] text-wf-500">
                {row.order.shipping_address}
              </p>
              <ul className="space-y-1 text-sm text-wf-700">
                {row.lines.map((line) => (
                  <li key={line.id}>
                    {line.quantity}× {formatEuro(Number(line.unit_price_snapshot))}{" "}
                    <span className="text-[10px] text-wf-500">
                      (offer {line.offer_id.slice(-8)})
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <aside className="rounded-lg border border-wf-200 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotaal</span>
                <span>{formatEuro(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Verzendkosten</span>
                <span>{formatEuro(totals.shipping)}</span>
              </div>
              <VatRow
                amount={totals.vat}
                tooltip={`BTW over goederen (land NL). Tarief per regel uit Offer-snapshot.`}
              />
              <div className="flex justify-between border-t border-wf-200 pt-2 font-bold">
                <span>Totaal betaald</span>
                <span>{formatEuro(totals.total)}</span>
              </div>
            </div>
          </aside>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {guest ? (
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  router.push(`/register?claim_order=1&payment_reference=${encodeURIComponent(paymentRef)}`)
                }
              >
                Account aanmaken voor deze bestelling
              </Button>
            ) : null}
            <Button type="button" onClick={() => router.push("/cart")}>
              Bestelling bekijken
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => router.push("/")}
            >
              Verder winkelen
            </Button>
          </div>
        </div>
      )}
    </StorefrontShell>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <StorefrontShell>
          <p className="text-sm text-wf-600">Laden…</p>
        </StorefrontShell>
      }
    >
      <ConfirmationInner />
    </Suspense>
  )
}
