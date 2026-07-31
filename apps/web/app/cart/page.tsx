"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Notice, QuantityStepper } from "@europmade/ui"
import { StorefrontShell, VatRow, formatEuro } from "../_components/storefront-shell"
import {
  deleteCartLine,
  getCart,
  OrderServiceApiError,
  patchCartLine,
  type CartView,
} from "../_lib/order-service-api"

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartView | "loading" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError(null)
    getCart()
      .then(setCart)
      .catch((err: unknown) => {
        setCart("error")
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : "Winkelwagen laden mislukt. Log in om verder te gaan."
        )
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const groups = useMemo(() => {
    if (cart === "loading" || cart === "error") return []
    const map = new Map<string, CartView["lines"]>()
    for (const line of cart.lines) {
      const bucket = map.get(line.seller_id) ?? []
      bucket.push(line)
      map.set(line.seller_id, bucket)
    }
    return [...map.entries()]
  }, [cart])

  async function onQty(lineId: string, quantity: number) {
    setBusy(true)
    setError(null)
    try {
      const next = await patchCartLine(lineId, quantity)
      setCart(next)
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : "Aantal bijwerken mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  async function onRemove(lineId: string) {
    setBusy(true)
    setError(null)
    try {
      await deleteCartLine(lineId)
      load()
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : "Verwijderen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  const count =
    cart !== "loading" && cart !== "error" ? cart.lines.length : undefined

  return (
    <StorefrontShell cartCount={count}>
      <h1 className="text-[19px] font-bold text-wf-900">
        Winkelwagen
        {count != null ? ` (${count} ${count === 1 ? "product" : "producten"})` : ""}
      </h1>

      {cart === "loading" ? (
        <p className="mt-4 text-sm text-wf-600">Laden…</p>
      ) : cart === "error" ? (
        <Notice variant="warning" className="mt-4 max-w-xl">
          {error ?? "Laden mislukt."}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => router.push("/login")}
          >
            Inloggen
          </button>
        </Notice>
      ) : cart.lines.length === 0 ? (
        <Notice className="mt-4 max-w-xl">Je winkelwagen is leeg.</Notice>
      ) : (
        <div className="mt-5 grid gap-6 desktop:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            {cart.split_notice ? <Notice>{cart.split_notice}</Notice> : null}
            {groups.map(([sellerId, lines]) => (
              <section
                key={sellerId}
                className="rounded-lg border border-wf-200 p-4"
              >
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                  Verkoper {sellerId.slice(-6)}
                </h2>
                <ul className="space-y-4">
                  {lines.map((line) => (
                    <li
                      key={line.line_id}
                      className="flex flex-wrap items-center justify-between gap-3 border-t border-wf-100 pt-3 first:border-0 first:pt-0"
                    >
                      <div>
                        <p className="text-sm font-semibold text-wf-900">
                          Offer {line.offer_id.slice(-8)}
                        </p>
                        <p className="text-[11px] text-wf-500">
                          {formatEuro(line.total_unit_price)} / stuk
                        </p>
                      </div>
                      <QuantityStepper
                        value={line.quantity}
                        min={1}
                        max={line.quantity_available}
                        disabled={busy}
                        onChange={(q) => void onQty(line.line_id, q)}
                      />
                      <button
                        type="button"
                        className="text-xs font-semibold text-wf-700 underline"
                        disabled={busy}
                        onClick={() => void onRemove(line.line_id)}
                      >
                        Verwijderen
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <aside className="h-fit rounded-lg border border-wf-200 p-4">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              Overzicht
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotaal</span>
                <span>{formatEuro(cart.totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Verzendkosten</span>
                <span>{formatEuro(cart.totals.shipping_total)}</span>
              </div>
              <div className="flex justify-between border-t border-wf-200 pt-2 font-bold">
                <span>Totaal</span>
                <span>{formatEuro(cart.totals.total)}</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-wf-500">
              BTW-uitsplitsing volgt in checkout.
            </p>
            {error ? (
              <Notice variant="warning" className="mt-3">
                {error}
              </Notice>
            ) : null}
            <Button
              className="mt-4 w-full"
              type="button"
              disabled={busy}
              onClick={() => router.push("/checkout")}
            >
              Naar checkout
            </Button>
          </aside>
        </div>
      )}
    </StorefrontShell>
  )
}
