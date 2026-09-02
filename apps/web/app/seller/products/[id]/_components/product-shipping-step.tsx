"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@europmade/ui"
import type { ProductManagerDetail } from "../../../_lib/product-cloud-api"
import { assignProductShippingProfile } from "../../../_lib/product-cloud-api"
import {
  listShippingProfiles,
  type SellerShippingProfile,
} from "../../../_lib/commerce-cloud-api"
import { formatEuro } from "../../../../_components/storefront-shell"
import { useEffect, useState } from "react"

type Props = {
  product: ProductManagerDetail
  productId: string
  offerDraft: {
    quantity_available: string
    region_code: string
  } | null
  onReload: () => void
  onSaveStock: () => Promise<void>
  stockSaving: boolean
}

export function ProductShippingStep(props: Props) {
  const { product, productId, offerDraft, onReload, onSaveStock, stockSaving } =
    props
  const router = useRouter()
  const [profiles, setProfiles] = useState<SellerShippingProfile[]>([])
  const [selectedId, setSelectedId] = useState(
    product.shipping_profile_id || ""
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listShippingProfiles().then((res) =>
      setProfiles(res.shipping_profiles.filter((p) => p.status === "active"))
    )
  }, [])

  const profile =
    product.shipping_profile ||
    profiles.find((p) => p.id === product.shipping_profile_id) ||
    null

  async function applyProfile(profileId: string) {
    setBusy(true)
    setError(null)
    try {
      await assignProductShippingProfile(productId, profileId || null)
      setSelectedId(profileId)
      onReload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Koppelen mislukt.")
    } finally {
      setBusy(false)
    }
  }

  const previewCountries = profile
    ? Object.entries(profile.country_rates || {})
        .filter(([, cfg]) => cfg.active !== false)
        .slice(0, 6)
    : []

  return (
    <div className="space-y-4">
      <div className="rounded border border-wf-300 bg-white p-3 text-xs">
        <h2 className="font-semibold text-wf-900">Voorraad & verzending</h2>
        <p className="mt-1 text-[11px] text-wf-600">
          Koppel een verzendprofiel. Je hoeft hier geen landen opnieuw in te
          vullen — dat regel je centraal onder Instellingen → Verzending.
        </p>
      </div>

      <section className="rounded border border-wf-300 bg-white p-3">
        <h3 className="text-xs font-bold text-wf-900">Verzending</h3>
        {profile ? (
          <div className="mt-2 space-y-2 text-xs">
            <p className="font-semibold text-emerald-800">
              ✓ {profile.name}
            </p>
            <ul className="space-y-0.5 text-wf-700">
              {previewCountries.map(([code, cfg]) => (
                <li key={code}>
                  {code}{" "}
                  {cfg.free_shipping
                    ? "Gratis verzending"
                    : formatEuro(cfg.shipping_cost)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-2 text-xs text-amber-800">
            Je hebt nog geen verzendprofiel gekoppeld.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[11px] font-semibold text-wf-700">
              Verzendprofiel
            </label>
            <select
              className="h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">— kies profiel —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            disabled={busy || !selectedId}
            onClick={() => void applyProfile(selectedId)}
          >
            Wijzigen
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push("/seller/settings/shipping/new")}
          >
            Nieuw profiel
          </Button>
          <Link
            href="/seller/settings/shipping"
            className="text-[11px] font-semibold underline"
          >
            Verzendprofiel beheren
          </Link>
        </div>
        {error ? <p className="mt-2 text-[11px] text-red-700">{error}</p> : null}
      </section>

      {offerDraft ? (
        <section className="rounded border border-wf-300 bg-white p-3">
          <h3 className="text-xs font-bold text-wf-900">Voorraad</h3>
          <div className="mt-2 max-w-xs">
            <label className="mb-1 block text-[11px] font-semibold text-wf-700">
              Beschikbare voorraad
            </label>
            <input
              className="h-9 w-full rounded border border-wf-400 px-2 text-xs"
              value={offerDraft.quantity_available}
              readOnly
            />
          </div>
          <p className="mt-2 text-[10px] text-wf-500">
            Voorraad wordt beheerd via je verkoopaanbod (regio{" "}
            {offerDraft.region_code || "NL"}).
          </p>
          <Button
            size="sm"
            className="mt-3"
            disabled={stockSaving}
            onClick={() => void onSaveStock()}
          >
            Opslaan en verder
          </Button>
        </section>
      ) : null}
    </div>
  )
}
