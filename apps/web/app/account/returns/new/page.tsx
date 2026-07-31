"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button, Notice } from "@europmade/ui"
import { BuyerGate } from "../../_components/buyer-gate"
import {
  OrderServiceApiError,
  requestReturn,
} from "../../../_lib/order-service-api"

function ReturnForm() {
  const router = useRouter()
  const search = useSearchParams()
  const orderLineId = search.get("order_line_id") ?? ""
  const orderId = search.get("order_id") ?? ""
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orderLineId) {
      setError("Geen orderregel geselecteerd.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await requestReturn(orderLineId, reason)
      router.replace(`/account/returns/${result.return.id}`)
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : "Retour aanmelden mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <BuyerGate
      breadcrumb={[
        { label: "Mijn EuropMade", href: "/account" },
        { label: "Mijn bestellingen", href: "/account/orders" },
        ...(orderId
          ? [{ label: "Order", href: `/account/orders/${orderId}` }]
          : []),
        { label: "Retour aanmelden" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Retour aanmelden</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Alleen binnen de wettelijke herroepingstermijn van 14 dagen.
      </p>

      {!orderLineId ? (
        <Notice variant="warning" className="mt-4">
          Selecteer een orderregel via orderdetail.
        </Notice>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 max-w-lg space-y-4">
          <div className="text-xs text-wf-600">
            Orderregel: <span className="font-mono text-wf-800">{orderLineId}</span>
          </div>
          <label className="block text-xs font-semibold text-wf-800">
            Reden
            <textarea
              className="mt-1.5 w-full rounded-md border border-wf-400 px-3 py-2 text-sm text-wf-900"
              rows={4}
              required
              minLength={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Waarom wil je dit product retourneren?"
            />
          </label>
          {error ? <Notice variant="warning">{error}</Notice> : null}
          <Button type="submit" disabled={busy || reason.trim().length < 3}>
            {busy ? "Versturen…" : "Retourverzoek versturen"}
          </Button>
        </form>
      )}
    </BuyerGate>
  )
}

export default function NewReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-wf-600">
          Laden…
        </div>
      }
    >
      <ReturnForm />
    </Suspense>
  )
}
