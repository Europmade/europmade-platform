"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Button,
  Checkbox,
  ChoiceCard,
  ChoiceCardGroup,
  Input,
  Notice,
  ReviewBlock,
  Stepper,
} from "@europmade/ui"
import { StorefrontShell, VatRow, formatEuro } from "../_components/storefront-shell"
import {
  getCart,
  OrderServiceApiError,
  placeOrder,
  type CartView,
} from "../_lib/order-service-api"

const STEPS = ["Verzending", "Betaling", "Controle"]

export default function CheckoutPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [cart, setCart] = useState<CartView | "loading" | "error">("loading")
  const [shipping, setShipping] = useState("")
  const [billing, setBilling] = useState("")
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getCart()
      .then(setCart)
      .catch((err: unknown) => {
        setCart("error")
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : "Checkout vereist een ingelogde klant."
        )
      })
  }, [])

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

  async function onPlace() {
    if (cart === "loading" || cart === "error") return
    if (!shipping.trim() || !billing.trim()) {
      setError("Vul bezorg- en factuuradres in.")
      return
    }
    if (!terms) {
      setError("Accepteer de voorwaarden om te bestellen.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const payment_reference = `pay-${Date.now()}-${Math.floor(Math.random() * 9999)}`
      const result = await placeOrder({
        payment_reference,
        shipping_address: shipping.trim(),
        billing_address: billing.trim(),
        lines: cart.lines.map((l) => ({
          offer_id: l.offer_id,
          quantity: l.quantity,
        })),
      })
      router.push(
        `/order/confirmation?payment_reference=${encodeURIComponent(result.payment_reference)}&order_set_id=${encodeURIComponent(result.order_set_id)}`
      )
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : "Bestelling plaatsen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (cart === "loading") {
    return (
      <StorefrontShell>
        <p className="text-sm text-wf-600">Checkout laden…</p>
      </StorefrontShell>
    )
  }

  if (cart === "error" || cart.lines.length === 0) {
    return (
      <StorefrontShell>
        <Notice variant="warning" className="max-w-xl">
          {error ?? "Je winkelwagen is leeg."}
        </Notice>
        <Button className="mt-4" type="button" onClick={() => router.push("/cart")}>
          Naar winkelwagen
        </Button>
      </StorefrontShell>
    )
  }

  return (
    <StorefrontShell cartCount={cart.lines.length}>
      <h1 className="mb-4 text-[19px] font-bold text-wf-900">Checkout</h1>

      {step === 0 && !shipping ? (
        <div className="mb-6 max-w-xl">
          <ChoiceCardGroup label="Doorgaan naar checkout">
            <ChoiceCard
              title="Ingelogd verdergaan"
              description="Je bent ingelogd; vul je adressen in."
              selected
            />
            <ChoiceCard
              title="Verder als gast"
              description="Gastcheckout volgt — log in om te bestellen."
              selected={false}
              onClick={() => router.push("/login")}
            />
          </ChoiceCardGroup>
        </div>
      ) : null}

      <Stepper steps={STEPS} currentStep={step} className="mb-6" />

      <div className="grid gap-6 desktop:grid-cols-[1.5fr_1fr]">
        <div>
          {step === 0 ? (
            <section className="space-y-3 rounded-lg border border-wf-200 p-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                Verzending
              </h2>
              <label className="block text-xs font-semibold text-wf-700">
                Bezorgadres
                <Input
                  className="mt-1.5"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  placeholder="Straat, postcode, plaats"
                />
              </label>
              <label className="block text-xs font-semibold text-wf-700">
                Factuuradres
                <Input
                  className="mt-1.5"
                  value={billing}
                  onChange={(e) => setBilling(e.target.value)}
                  placeholder="Straat, postcode, plaats"
                />
              </label>
              <Button
                type="button"
                disabled={!shipping.trim() || !billing.trim()}
                onClick={() => setStep(1)}
              >
                Verder naar betaling
              </Button>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-3 rounded-lg border border-wf-200 p-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                Betaling
              </h2>
              <Notice>
                MVP: betaling wordt gesimuleerd na bevestigen (ADR-0021). Stripe
                volgt zodra keys zijn geconfigureerd (ADR-0018).
              </Notice>
              <div className="flex gap-2">
                <Button variant="secondary" type="button" onClick={() => setStep(0)}>
                  Terug
                </Button>
                <Button type="button" onClick={() => setStep(2)}>
                  Verder naar controle
                </Button>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-3 rounded-lg border border-wf-200 p-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                Controle
              </h2>
              <ReviewBlock title="Adressen">
                <p className="text-sm text-wf-700">Bezorg: {shipping}</p>
                <p className="text-sm text-wf-700">Factuur: {billing}</p>
              </ReviewBlock>
              <ReviewBlock title="Betaalmethode">
                <p className="text-sm text-wf-700">Gesimuleerde betaling (MVP)</p>
              </ReviewBlock>
              <ReviewBlock title="Gesplitste bestelling">
                <p className="text-sm text-wf-700">
                  {cart.seller_count} deelbestelling
                  {cart.seller_count === 1 ? "" : "en"}
                </p>
              </ReviewBlock>
              <Checkbox
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                label="Ik ga akkoord met de voorwaarden"
              />
              {error ? (
                <Notice variant="warning">{error}</Notice>
              ) : null}
              <div className="flex gap-2">
                <Button variant="secondary" type="button" onClick={() => setStep(1)}>
                  Terug
                </Button>
                <Button
                  type="button"
                  disabled={busy || !terms}
                  onClick={() => void onPlace()}
                >
                  {busy ? "Plaatsen…" : "Bestelling plaatsen"}
                </Button>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="h-fit rounded-lg border border-wf-200 p-4">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
            Besteloverzicht
          </h2>
          {cart.split_notice ? (
            <Notice className="mb-3">{cart.split_notice}</Notice>
          ) : null}
          {groups.map(([sellerId, lines]) => (
            <div key={sellerId} className="mb-3 border-b border-wf-100 pb-3 text-xs">
              <p className="mb-1 font-semibold text-wf-800">
                Verkoper {sellerId.slice(-6)}
              </p>
              {lines.map((l) => (
                <p key={l.line_id} className="text-wf-600">
                  {l.quantity}× {formatEuro(l.total_unit_price)}
                </p>
              ))}
            </div>
          ))}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotaal</span>
              <span>{formatEuro(cart.totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Verzendkosten</span>
              <span>{formatEuro(cart.totals.shipping_total)}</span>
            </div>
            <VatRow
              amount={cart.totals.vat_amount}
              tooltip={cart.totals.vat_tooltip}
            />
            <div className="flex justify-between border-t border-wf-200 pt-2 font-bold">
              <span>Totaal te betalen</span>
              <span>{formatEuro(cart.totals.total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </StorefrontShell>
  )
}
