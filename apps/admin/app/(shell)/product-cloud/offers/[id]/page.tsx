"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ProductSectionNav } from "../../../../../components/product-cloud/product-section-nav"
import { displayMediaUrl } from "../../../../../lib/media-url"
import {
  getAdminOffer,
  updateAdminOffer,
  type AdminOfferDetail,
} from "../../../../../lib/brand-import-admin-api"
import { ProductApprovalAdminApiError } from "../../../../../lib/product-approval-admin-api"

function moneyText(value: unknown): string {
  if (value == null || value === "") return ""
  if (typeof value === "object") {
    const raw = value as { numeric?: unknown; value?: unknown }
    if (raw.numeric != null) return String(raw.numeric)
    if (raw.value != null) return String(raw.value)
  }
  return String(value)
}

function optionalNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed.replace(",", "."))
  return Number.isFinite(n) ? n : null
}

function rateRows(rates: unknown): Array<{ code: string; line: string }> {
  if (!rates || typeof rates !== "object") return []
  return Object.entries(rates as Record<string, Record<string, unknown>>).map(([code, cfg]) => {
    const active = cfg.active === false ? "inactief" : "actief"
    const cost = cfg.free_shipping ? "gratis verzending" : `verzendkosten ${cfg.shipping_cost ?? "—"}`
    const threshold =
      cfg.free_shipping_threshold != null ? `, gratis vanaf ${cfg.free_shipping_threshold}` : ""
    const time = cfg.delivery_time_code ? `, levertijd ${cfg.delivery_time_code}` : ""
    return { code, line: `${active}, ${cost}${threshold}${time}` }
  })
}

function processingLine(settings: unknown): string {
  if (!settings || typeof settings !== "object") return "—"
  const row = settings as {
    default_handover?: { cutoff_time?: string; processing_time_code?: string }
  }
  const handover = row.default_handover
  if (!handover) return "—"
  return [handover.cutoff_time ? `cutoff ${handover.cutoff_time}` : null, handover.processing_time_code]
    .filter(Boolean)
    .join(", ") || "—"
}

export default function AdminOfferDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [offer, setOffer] = useState<AdminOfferDetail | "loading">("loading")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [basePrice, setBasePrice] = useState("")
  const [promoPrice, setPromoPrice] = useState("")
  const [shippingCost, setShippingCost] = useState("")
  const [stock, setStock] = useState("")
  const [sku, setSku] = useState("")
  const [delivery, setDelivery] = useState("")
  const [status, setStatus] = useState<"active" | "paused">("active")
  const [profileId, setProfileId] = useState("")

  const apply = useCallback((row: AdminOfferDetail) => {
    setOffer(row)
    setBasePrice(moneyText(row.base_price))
    setPromoPrice(moneyText(row.promo_price))
    setShippingCost(moneyText(row.shipping_cost))
    setStock(row.quantity_available == null ? "" : String(row.quantity_available))
    setSku(row.seller_sku || "")
    setDelivery(row.delivery_days_max == null ? "" : String(row.delivery_days_max))
    setStatus(row.sales_status === "paused" ? "paused" : "active")
    setProfileId(row.shipping_profile_id || "")
  }, [])

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await getAdminOffer(id)
      apply(res.offer)
    } catch (err) {
      setOffer("loading")
      setError(err instanceof ProductApprovalAdminApiError ? err.message : "Offer laden mislukt.")
    }
  }, [id, apply])

  useEffect(() => {
    void load()
  }, [load])

  const image =
    offer !== "loading" ? displayMediaUrl(offer.primary_image_url) : null
  const rates = offer !== "loading" ? rateRows(offer.shipping_profile?.country_rates) : []

  return (
    <div>
      <p className="text-xs">
        <Link href="/product-cloud/offers" className="underline">
          Terug naar de offerlijst
        </Link>
      </p>
      <h1 className="mt-2 text-lg font-bold text-wf-900">Offer</h1>
      <p className="mt-1 text-xs text-wf-600">
        Dit scherm wijzigt alleen dit seller-offer. Centrale productgegevens en
        fabrikantgegevens blijven ongewijzigd. Er is geen bulkofergoedkeuring.
      </p>
      <p className="mt-1 text-xs text-wf-600">
        Deze pagina wijzigt alleen dit offer. De centrale productgegevens blijven ongewijzigd.
      </p>
      <div className="mt-4">
        <ProductSectionNav active="offers" />
      </div>
      {error ? <p className="mb-3 text-xs text-amber-800">{error}</p> : null}
      {notice ? <p className="mb-3 text-xs text-emerald-800">{notice}</p> : null}
      {offer === "loading" ? (
        error ? null : <p className="text-xs text-wf-600">Laden…</p>
      ) : (
        <div className="grid gap-4 desktop:grid-cols-[minmax(0,1fr)_320px]">
          <form
            className="space-y-3 rounded border border-wf-300 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault()
              setBusy(true)
              setError(null)
              setNotice(null)
              void updateAdminOffer(id, {
                base_price: optionalNumber(basePrice) ?? 0,
                promo_price: optionalNumber(promoPrice),
                shipping_cost: optionalNumber(shippingCost) ?? 0,
                quantity_available: Math.max(0, Math.floor(optionalNumber(stock) ?? 0)),
                seller_sku: sku.trim() || null,
                delivery_days_max: delivery.trim() ? Math.max(0, Math.floor(optionalNumber(delivery) ?? 0)) : null,
                sales_status: status,
                shipping_profile_id: profileId || null,
              })
                .then((res) => {
                  apply(res.offer)
                  setNotice("Offer opgeslagen.")
                })
                .catch((err: unknown) => {
                  setError(err instanceof ProductApprovalAdminApiError ? err.message : "Offer opslaan mislukt.")
                })
                .finally(() => setBusy(false))
            }}
          >
            <div className="flex items-center gap-3">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-14 w-14 rounded bg-wf-50 object-contain" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded bg-wf-100 text-[10px] text-wf-400">
                  —
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-wf-900">{offer.title || "Product"}</p>
                {offer.product_id ? (
                  <Link href={`/product-cloud/products/${offer.product_id}`} className="text-xs underline">
                    Open centrale productreview
                  </Link>
                ) : null}
              </div>
            </div>
            <dl className="grid gap-2 text-xs tablet:grid-cols-2">
              <div>
                <dt className="font-semibold text-wf-500">Seller</dt>
                <dd>{offer.seller_name}</dd>
              </div>
              <div>
                <dt className="font-semibold text-wf-500">Markt / land</dt>
                <dd>{offer.region_code}</dd>
              </div>
              <div>
                <dt className="font-semibold text-wf-500">EAN / GTIN</dt>
                <dd className="font-mono">{offer.identifier_value || "—"}</dd>
              </div>
            </dl>
            <div className="grid gap-2 tablet:grid-cols-2">
              <label className="text-[11px] font-semibold text-wf-700">
                Prijs
                <input value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="mt-1 h-8 w-full rounded border border-wf-400 px-2 font-normal" />
              </label>
              <label className="text-[11px] font-semibold text-wf-700">
                Actieprijs
                <input value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} className="mt-1 h-8 w-full rounded border border-wf-400 px-2 font-normal" />
              </label>
              <label className="text-[11px] font-semibold text-wf-700">
                Voorraad
                <input value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1 h-8 w-full rounded border border-wf-400 px-2 font-normal" />
              </label>
              <label className="text-[11px] font-semibold text-wf-700">
                Seller-SKU
                <input value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1 h-8 w-full rounded border border-wf-400 px-2 font-normal" />
              </label>
              <label className="text-[11px] font-semibold text-wf-700">
                Levertijd (dagen)
                <input value={delivery} onChange={(e) => setDelivery(e.target.value)} className="mt-1 h-8 w-full rounded border border-wf-400 px-2 font-normal" />
              </label>
              <label className="text-[11px] font-semibold text-wf-700">
                Verkoopstatus
                <select value={status} onChange={(e) => setStatus(e.target.value === "paused" ? "paused" : "active")} className="mt-1 h-8 w-full rounded border border-wf-400 px-2 font-normal">
                  <option value="active">Actief</option>
                  <option value="paused">Gepauzeerd</option>
                </select>
              </label>
              <label className="text-[11px] font-semibold text-wf-700 tablet:col-span-2">
                Verzendprofiel
                <select value={profileId} onChange={(e) => setProfileId(e.target.value)} className="mt-1 h-8 w-full rounded border border-wf-400 px-2 font-normal">
                  <option value="">Geen verzendprofiel</option>
                  {profileId && !offer.shipping_profiles.some((profile) => profile.id === profileId) ? (
                    <option value={profileId}>{offer.shipping_profile?.name || profileId}</option>
                  ) : null}
                  {offer.shipping_profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} ({profile.status})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-semibold text-wf-700">
                Verzendkosten op dit offer
                <input value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className="mt-1 h-8 w-full rounded border border-wf-400 px-2 font-normal" />
              </label>
              {moneyText(offer.extra_delivery_cost) ? (
                <p className="text-[11px] text-wf-700">
                  Extra leveringskosten: {moneyText(offer.extra_delivery_cost)}
                </p>
              ) : null}
            </div>
            <button type="submit" disabled={busy} className="rounded bg-wf-800 px-3 py-1.5 text-xs font-semibold text-white">
              {busy ? "Opslaan…" : "Offer opslaan"}
            </button>
          </form>
          <aside className="rounded border border-wf-300 bg-white p-4 text-xs">
            <h2 className="text-sm font-bold text-wf-900">Verzendprofiel</h2>
            {offer.shipping_profile ? (
              <dl className="mt-2 space-y-2">
                <div>
                  <dt className="font-semibold text-wf-500">Naam</dt>
                  <dd>{offer.shipping_profile.name}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-wf-500">Status</dt>
                  <dd>{offer.shipping_profile.status}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-wf-500">Vervoerder</dt>
                  <dd>{offer.shipping_profile.carrier_mode === "carrier" ? "Vervoerder" : "Eigen verzending"}</dd>
                </div>
                {offer.shipping_profile.description ? (
                  <div>
                    <dt className="font-semibold text-wf-500">Omschrijving</dt>
                    <dd>{offer.shipping_profile.description}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-semibold text-wf-500">Verwerking</dt>
                  <dd>{processingLine(offer.shipping_profile.processing_settings)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-wf-500">Bestemmingstarieven</dt>
                  <dd>
                    {rates.length ? (
                      <ul className="mt-1 space-y-1">
                        {rates.map((rate) => (
                          <li key={rate.code}>
                            <span className="font-semibold">{rate.code}</span> — {rate.line}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "Geen tarieven"
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-wf-600">Dit offer heeft nog geen verzendprofiel.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
