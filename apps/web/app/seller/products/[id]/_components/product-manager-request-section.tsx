"use client"

import { useState } from "react"
import { Button, Notice } from "@europmade/ui"
import {
  ProductCloudApiError,
  requestProductManagerRole,
  type ProductManagerDetail,
} from "../../../_lib/product-cloud-api"

type Props = {
  productId: string
  request: NonNullable<ProductManagerDetail["product_manager_request"]>
  onChanged: () => Promise<void> | void
}

/**
 * Productbeheerder status + optional request-to-manage action for offer sellers.
 */
export function ProductManagerRequestSection({
  productId,
  request,
  onChanged,
}: Props) {
  const [open, setOpen] = useState(false)
  const [toelichting, setToelichting] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await requestProductManagerRole(productId, {
        toelichting: toelichting.trim() || undefined,
      })
      setOpen(false)
      setToelichting("")
      setNotice("Aanvraag Productbeheerder ingediend.")
      await onChanged()
    } catch (err) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : "Aanvraag indienen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded border border-wf-300 bg-white p-3">
      <h2 className="text-xs font-bold text-wf-900">Productbeheerder</h2>
      <p className="mt-1 text-[11px] text-wf-600">
        De Productbeheerder beheert de centrale Product Cloud-informatie. Dit is
        niet hetzelfde als Seller (commercieel aanbod).
      </p>

      {request.is_product_manager ? (
        <p className="mt-2 text-xs font-semibold text-emerald-800">
          Je bent Productbeheerder van dit product.
        </p>
      ) : request.pending || request.status === "In behandeling" ? (
        <p className="mt-2 text-xs font-semibold text-amber-800">
          Aanvraag Productbeheerder: In behandeling
        </p>
      ) : request.status === "Afgewezen" ? (
        <div className="mt-2 space-y-1 text-xs">
          <p className="font-semibold text-red-800">Aanvraag afgewezen</p>
          {request.decision_reason ? (
            <p className="text-wf-700">
              Terugkoppeling: {request.decision_reason}
            </p>
          ) : null}
        </div>
      ) : request.status === "Goedgekeurd" ? (
        <p className="mt-2 text-xs font-semibold text-emerald-800">
          Je bent Productbeheerder van dit product.
        </p>
      ) : (
        <p className="mt-2 text-xs text-wf-700">
          Je bent momenteel niet de Productbeheerder.
        </p>
      )}

      {error ? (
        <Notice variant="warning" className="mt-2">
          {error}
        </Notice>
      ) : null}
      {notice ? (
        <Notice variant="info" className="mt-2">
          {notice}
        </Notice>
      ) : null}

      {request.can_request ||
      (request.status === "Afgewezen" && !request.pending) ? (
        <div className="mt-3">
          {!open ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setOpen(true)}
            >
              {request.status === "Afgewezen"
                ? "Opnieuw aanvragen"
                : "Productbeheerder aanvragen"}
            </Button>
          ) : (
            <div className="space-y-2 rounded border border-wf-900 bg-wf-50/50 p-3">
              <p className="text-[11px] font-semibold text-wf-900">
                Productbeheerder aanvragen
              </p>
              <p className="text-[11px] text-wf-700">
                Je vraagt aan om de centrale Productinformatie van dit product te
                mogen beheren.
              </p>
              <label className="block text-[11px] text-wf-600">
                Toelichting (optioneel)
                <textarea
                  className="mt-1 w-full rounded border border-wf-300 bg-white px-2 py-1.5 text-xs"
                  rows={2}
                  value={toelichting}
                  onChange={(e) => setToelichting(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setOpen(false)
                    setToelichting("")
                  }}
                >
                  Annuleren
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void submit()}
                >
                  {busy ? "Indienen…" : "Aanvraag indienen"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
