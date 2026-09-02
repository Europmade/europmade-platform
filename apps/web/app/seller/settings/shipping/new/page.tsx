"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Notice } from "@europmade/ui"
import { SellerGate } from "../../../_components/seller-gate"
import {
  buildEmptyProfileDraft,
  ShippingProfileEditor,
} from "../../../_components/shipping/shipping-profile-editor"
import {
  CommerceCloudApiError,
  createShippingProfile,
  type SellerShippingProfile,
} from "../../../_lib/commerce-cloud-api"

export default function NewShippingProfilePage() {
  const router = useRouter()
  const [draft, setDraft] = useState<Partial<SellerShippingProfile>>(
    buildEmptyProfileDraft()
  )
  const [advanced, setAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(asActive: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await createShippingProfile({
        ...draft,
        name: draft.name?.trim() || "",
        status: asActive ? "active" : "draft",
      })
      router.push(`/seller/settings/shipping/${res.shipping_profile.id}`)
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

  return (
    <SellerGate
      breadcrumb={[
        { label: "Dashboard", href: "/seller" },
        { label: "Verzending", href: "/seller/settings/shipping" },
        { label: "Nieuw profiel" },
      ]}
    >
      <h1 className="mb-4 text-lg font-bold text-wf-900">Nieuw verzendprofiel</h1>
      {error ? <Notice variant="warning">{error}</Notice> : null}
      <ShippingProfileEditor
        draft={draft}
        onChange={setDraft}
        showAdvanced={advanced}
        onToggleAdvanced={() => setAdvanced((v) => !v)}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => void save(true)}>
          Opslaan en activeren
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void save(false)}
        >
          Opslaan als concept
        </Button>
      </div>
    </SellerGate>
  )
}
