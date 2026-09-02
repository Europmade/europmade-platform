"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button, Notice } from "@europmade/ui"
import { SellerGate } from "../../../../_components/seller-gate"
import { ShippingProfileEditor } from "../../../../_components/shipping/shipping-profile-editor"
import {
  CommerceCloudApiError,
  getShippingProfile,
  patchShippingProfile,
  type SellerShippingProfile,
} from "../../../../_lib/commerce-cloud-api"
import { formatEuro } from "../../../../../_components/storefront-shell"

export default function EditShippingProfilePage() {
  const params = useParams<{ id: string }>()
  const [draft, setDraft] = useState<SellerShippingProfile | null>(null)
  const [advanced, setAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    getShippingProfile(params.id)
      .then((res) => setDraft(res.shipping_profile))
      .catch((err: unknown) =>
        setError(
          err instanceof CommerceCloudApiError
            ? err.message
            : "Profiel laden mislukt."
        )
      )
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  async function save() {
    if (!draft) return
    setBusy(true)
    setError(null)
    try {
      const res = await patchShippingProfile(draft.id, {
        name: draft.name,
        description: draft.description,
        status: draft.status,
        country_rates: draft.country_rates,
        processing_settings: draft.processing_settings,
        carrier_mode: draft.carrier_mode,
        carrier_ref: draft.carrier_ref,
      })
      setDraft(res.shipping_profile)
      setNotice("Verzendprofiel opgeslagen.")
    } catch (err: unknown) {
      setError(
        err instanceof CommerceCloudApiError
          ? err.message
          : "Opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (!draft && !error) {
    return (
      <SellerGate breadcrumb={[{ label: "Verzending", href: "/seller/settings/shipping" }]}>
        <p className="text-xs text-wf-500">Laden…</p>
      </SellerGate>
    )
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: "Dashboard", href: "/seller" },
        { label: "Verzending", href: "/seller/settings/shipping" },
        { label: draft?.name || "Profiel" },
      ]}
    >
      {draft ? (
        <div className="mb-4 rounded-lg border border-wf-300 bg-wf-50 p-4 text-xs">
          <p className="text-sm font-bold uppercase text-wf-900">{draft.name}</p>
          <p className="mt-1 text-wf-600">
            {draft.status === "active" ? "✓ Actief" : draft.status}
            {" · "}
            {draft.active_country_count ?? 0} landen ·{" "}
            {draft.linked_product_count ?? 0} producten gekoppeld
          </p>
          <p className="mt-1 text-wf-600">
            Verwerking: Ma–Vr vóór{" "}
            {draft.processing_settings?.default_handover?.cutoff_time || "15:00"}
            {draft.min_shipping_cost != null
              ? ` · Vanaf ${formatEuro(draft.min_shipping_cost)}`
              : ""}
          </p>
        </div>
      ) : null}
      {error ? <Notice variant="warning">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}
      {draft ? (
        <>
          <ShippingProfileEditor
            draft={draft}
            onChange={(next) => setDraft(next as SellerShippingProfile)}
            showAdvanced={advanced}
            onToggleAdvanced={() => setAdvanced((v) => !v)}
          />
          <div className="mt-4">
            <Button size="sm" disabled={busy} onClick={() => void save()}>
              Opslaan
            </Button>
          </div>
        </>
      ) : null}
    </SellerGate>
  )
}
