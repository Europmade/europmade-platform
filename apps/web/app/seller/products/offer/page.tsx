"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import {
  CommerceCloudApiError,
  getOffer,
  listOffers,
  upsertOffer,
  type OfferBuyBoxPosition,
  type OfferListItem,
} from "../../_lib/commerce-cloud-api"
import {
  listOwnProducts,
  ProductCloudApiError,
  type CatalogProduct,
} from "../../_lib/product-cloud-api"

function parseMoney(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".")
  const cleaned = normalized.replace(/[€$]/g, "")
  if (!cleaned) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function formatEuro(n: number): string {
  return `€ ${n.toFixed(2).replace(".", ",")}`
}

function formatWeightPct(n: number): string {
  return `${Math.round(n * 100)}%`
}

const WEIGHT_LABELS: Array<{ key: keyof NonNullable<OfferBuyBoxPosition["weights"]>; label: string }> = [
  { key: "price", label: "Prijs" },
  { key: "delivery", label: "Levertijd" },
  { key: "seller_review", label: "Verkopersreview" },
  { key: "stock", label: "Voorraad" },
  { key: "performance", label: "Performance" },
  { key: "returns", label: "Retourprestaties" },
]

function BuyBoxPositionPanel({
  position,
  offerId,
}: {
  position: OfferBuyBoxPosition | null
  offerId: string | null
}) {
  const [weightsOpen, setWeightsOpen] = useState(false)

  if (!offerId) {
    return (
      <div className="rounded-lg border border-wf-200 p-5">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
          Buy Box-positie
        </h3>
        <p className="text-[11px] text-wf-600">
          Nog geen aanbod voor deze identifier/regio. Na opslaan toont de server
          je Buy Box-positie.
        </p>
      </div>
    )
  }

  if (!position || position.status !== "computed") {
    return (
      <div className="rounded-lg border border-wf-200 p-5">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
          Buy Box-positie
        </h3>
        <Notice>Buy Box-positie wordt geladen…</Notice>
      </div>
    )
  }

  const statusLabel = position.is_winner
    ? "Buy Box-winnaar"
    : position.rank != null
      ? `Positie #${position.rank}`
      : "Niet in ranking"

  const competing =
    position.competing_offer_count ??
    Math.max(0, (position.ranked_count ?? 0) - (position.rank != null ? 1 : 0))

  return (
    <div className="rounded-lg border border-wf-200 p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
        Buy Box-positie
      </h3>
      <div className="mb-2.5 flex items-center justify-between gap-3 text-xs">
        <span className="text-wf-600">Huidige status</span>
        <Badge variant={position.is_winner ? "solid" : "outline"}>
          {statusLabel}
        </Badge>
      </div>
      <div className="mb-2.5 flex items-center justify-between gap-3 text-xs">
        <span className="text-wf-600">Concurrerende aanbieders</span>
        <span className="font-semibold text-wf-900">{competing}</span>
      </div>
      <button
        type="button"
        className="text-xs font-semibold text-wf-800 underline decoration-dotted"
        onClick={() => setWeightsOpen((open) => !open)}
      >
        {weightsOpen ? "Verberg wegingsfactoren" : "Bekijk wegingsfactoren"}
      </button>
      {weightsOpen && position.weights ? (
        <ul className="mt-3 space-y-1.5 border-t border-wf-200 pt-3 text-[11px] text-wf-700">
          {WEIGHT_LABELS.map(({ key, label }) => (
            <li key={key} className="flex justify-between gap-2">
              <span>{label}</span>
              <span className="font-semibold">
                {formatWeightPct(position.weights![key])}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-[10.5px] text-wf-500">Offer: {offerId}</p>
    </div>
  )
}

function SellerProductOfferInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const identifierId = searchParams.get("identifier_id")?.trim() ?? ""
  const regionCode = (
    searchParams.get("region_code")?.trim() || "NL"
  ).toUpperCase()

  const [catalog, setCatalog] = useState<CatalogProduct[] | "loading" | "error">(
    "loading"
  )
  const [previewTitle, setPreviewTitle] = useState<string | null>(null)
  const [existing, setExisting] = useState<OfferListItem | null | "loading">(
    "loading"
  )
  const [buyBox, setBuyBox] = useState<OfferBuyBoxPosition | null>(null)
  const [basePrice, setBasePrice] = useState("")
  const [shipping, setShipping] = useState("")
  const [quantity, setQuantity] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!identifierId) {
      setCatalog("error")
      setExisting(null)
      setError(
        "Geen identifier_id — open dit scherm via match of nieuw product."
      )
      return
    }

    let cancelled = false
    Promise.all([
      listOwnProducts(),
      listOffers({ identifier_id: identifierId, region_code: regionCode }),
    ])
      .then(async ([productsRes, offersRes]) => {
        if (cancelled) return
        setCatalog(productsRes.products)
        setPreviewTitle(offersRes.product_preview?.title ?? null)
        const hit = offersRes.offers[0] ?? null
        setExisting(hit)
        if (hit?.price) {
          setBasePrice(String(Number(hit.price.base_price)))
          setShipping(String(Number(hit.price.shipping_cost)))
        }
        if (hit?.inventory) {
          setQuantity(String(hit.inventory.quantity_available))
        }
        if (hit?.offer.id) {
          const detail = await getOffer(hit.offer.id)
          if (!cancelled) setBuyBox(detail.buy_box)
        } else {
          setBuyBox(null)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof CommerceCloudApiError ||
          err instanceof ProductCloudApiError
            ? err.message
            : "Laden mislukt."
        setError(message)
        setCatalog("error")
        setExisting(null)
      })

    return () => {
      cancelled = true
    }
  }, [identifierId, regionCode])

  const product = useMemo(() => {
    if (catalog === "loading" || catalog === "error") return null
    return catalog.find((p) => p.identifier_id === identifierId) ?? null
  }, [catalog, identifierId])

  const totalHint = useMemo(() => {
    const base = parseMoney(basePrice)
    const ship = parseMoney(shipping)
    if (base == null || ship == null) return null
    return base + ship
  }, [basePrice, shipping])

  async function onSave() {
    if (!identifierId) return
    const base = parseMoney(basePrice)
    const ship = parseMoney(shipping)
    const qty = Number.parseInt(quantity.trim(), 10)
    if (base == null) {
      setError("Vul een geldige basisprijs in.")
      return
    }
    if (ship == null) {
      setError("Vul geldige verzendkosten in.")
      return
    }
    if (!Number.isInteger(qty) || qty < 0) {
      setError("Voorraad moet een geheel getal ≥ 0 zijn.")
      return
    }

    setBusy(true)
    setError(null)
    setSavedMessage(null)
    try {
      const result = await upsertOffer({
        identifier_id: identifierId,
        region_code: regionCode,
        base_price: base,
        shipping_cost: ship,
        quantity_available: qty,
        vat_rate: 0.21,
      })
      setSavedMessage(
        result.created ? "Aanbod aangemaakt." : "Aanbod bijgewerkt."
      )
      const refreshed = await listOffers({
        identifier_id: identifierId,
        region_code: regionCode,
      })
      const hit = refreshed.offers[0] ?? null
      setExisting(hit)
      if (hit?.offer.id) {
        const detail = await getOffer(hit.offer.id)
        setBuyBox(detail.buy_box)
      }
    } catch (err: unknown) {
      setError(
        err instanceof CommerceCloudApiError
          ? err.message
          : "Opslaan mislukt. Probeer opnieuw."
      )
    } finally {
      setBusy(false)
    }
  }

  const offerId =
    existing && existing !== "loading" ? existing.offer.id : null

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Producten", href: "/seller/products" },
        { label: "Productdetail — commerciële gegevens" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        Productdetail — commerciële gegevens
      </h1>
      <p className="mb-5 mt-1.5 text-xs text-wf-600">
        {product?.title ?? previewTitle ?? "Product"} — jouw aanbod (Offer)
        {regionCode ? ` · regio ${regionCode}` : ""}
      </p>

      {catalog === "loading" || existing === "loading" ? (
        <p className="text-sm text-wf-600">Laden…</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-wf-500">
            <span className="rounded-wf border border-wf-400 bg-wf-100 px-2.5 py-1 font-semibold text-wf-800">
              Commercieel
            </span>
            <span className="rounded-wf border border-transparent px-2.5 py-1">
              Voorraad
            </span>
            <span className="rounded-wf border border-transparent px-2.5 py-1">
              Verzending
            </span>
          </div>

          <div className="grid gap-5 desktop:grid-cols-[1.7fr_1fr]">
            <div>
              <div className="mb-4 rounded-lg border border-wf-200 p-5">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                  Prijs
                </h3>
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                    Basisprijs
                  </label>
                  <Input
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="79,00"
                  />
                </div>
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                    Verzendkosten
                  </label>
                  <Input
                    value={shipping}
                    onChange={(e) => setShipping(e.target.value)}
                    placeholder="4,95"
                  />
                </div>
                <p className="text-[10.5px] text-wf-500">
                  Totaalprijs (Buy Box-vergelijking):{" "}
                  {totalHint != null ? formatEuro(totalHint) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-wf-200 p-5">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                  Voorraad
                </h3>
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                    Aantal op voorraad
                  </label>
                  <Input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="42"
                  />
                </div>
              </div>
            </div>

            <BuyBoxPositionPanel position={buyBox} offerId={offerId} />
          </div>

          {error ? (
            <Notice variant="warning" className="mt-4 max-w-xl">
              {error}
            </Notice>
          ) : null}
          {savedMessage ? (
            <Notice className="mt-4 max-w-xl">{savedMessage}</Notice>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 border-t border-wf-300 py-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => router.push("/seller/products")}
            >
              Annuleren
            </Button>
            <Button
              type="button"
              disabled={busy || !identifierId}
              onClick={() => void onSave()}
            >
              {busy ? "Opslaan…" : "Opslaan"}
            </Button>
          </div>
        </>
      )}
    </SellerGate>
  )
}

/** product-05 — commerciële gegevens / Buy Box-positie (S3-04-03/04). */
export default function SellerProductOfferPage() {
  return (
    <Suspense
      fallback={
        <SellerGate
          breadcrumb={[
            { label: "Seller Dashboard", href: "/seller" },
            { label: "Producten", href: "/seller/products" },
            { label: "Productdetail — commerciële gegevens" },
          ]}
        >
          <p className="text-sm text-wf-600">Laden…</p>
        </SellerGate>
      }
    >
      <SellerProductOfferInner />
    </Suspense>
  )
}
