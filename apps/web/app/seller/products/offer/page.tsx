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
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t, tFormat } from "../../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../../_lib/i18n/locales"

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

function weightLabels(
  locale: StorefrontLocale
): Array<{ key: keyof NonNullable<OfferBuyBoxPosition["weights"]>; label: string }> {
  return [
    { key: "price", label: t("commonPrice", locale) },
    { key: "delivery", label: t("sellerOfferWeightDelivery", locale) },
    { key: "seller_review", label: t("sellerOfferWeightSellerReview", locale) },
    { key: "stock", label: t("commonStock", locale) },
    { key: "performance", label: t("sellerOfferWeightPerformance", locale) },
    { key: "returns", label: t("sellerOfferWeightReturns", locale) },
  ]
}

function BuyBoxPositionPanel({
  position,
  offerId,
  locale,
}: {
  position: OfferBuyBoxPosition | null
  offerId: string | null
  locale: StorefrontLocale
}) {
  const [weightsOpen, setWeightsOpen] = useState(false)

  if (!offerId) {
    return (
      <div className="rounded-lg border border-wf-200 p-5">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
          {t("sellerOfferBuyBox", locale)}
        </h3>
        <p className="text-[11px] text-wf-600">
          {t("sellerOfferBuyBoxEmpty", locale)}
        </p>
      </div>
    )
  }

  if (!position || position.status !== "computed") {
    return (
      <div className="rounded-lg border border-wf-200 p-5">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
          {t("sellerOfferBuyBox", locale)}
        </h3>
        <Notice>{t("sellerOfferBuyBoxLoading", locale)}</Notice>
      </div>
    )
  }

  const buyBoxStatus = position.is_winner
    ? t("sellerOfferBuyBoxWinner", locale)
    : position.rank != null
      ? tFormat("sellerOfferBuyBoxRank", locale, { rank: position.rank })
      : t("sellerOfferBuyBoxUnranked", locale)

  const competing =
    position.competing_offer_count ??
    Math.max(0, (position.ranked_count ?? 0) - (position.rank != null ? 1 : 0))

  return (
    <div className="rounded-lg border border-wf-200 p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
        {t("sellerOfferBuyBox", locale)}
      </h3>
      <div className="mb-2.5 flex items-center justify-between gap-3 text-xs">
        <span className="text-wf-600">{t("sellerOfferCurrentStatus", locale)}</span>
        <Badge variant={position.is_winner ? "solid" : "outline"}>
          {buyBoxStatus}
        </Badge>
      </div>
      <div className="mb-2.5 flex items-center justify-between gap-3 text-xs">
        <span className="text-wf-600">{t("sellerOfferCompetitors", locale)}</span>
        <span className="font-semibold text-wf-900">{competing}</span>
      </div>
      <button
        type="button"
        className="text-xs font-semibold text-wf-800 underline decoration-dotted"
        onClick={() => setWeightsOpen((open) => !open)}
      >
        {weightsOpen
          ? t("sellerOfferHideWeights", locale)
          : t("sellerOfferShowWeights", locale)}
      </button>
      {weightsOpen && position.weights ? (
        <ul className="mt-3 space-y-1.5 border-t border-wf-200 pt-3 text-[11px] text-wf-700">
          {weightLabels(locale).map(({ key, label }) => (
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
  const locale = useStorefrontLocale()
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
      setError(t("sellerOfferNoIdentifier", locale))
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
            : t("commonLoadFailed", locale)
        setError(message)
        setCatalog("error")
        setExisting(null)
      })

    return () => {
      cancelled = true
    }
  }, [identifierId, regionCode, locale])

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
      setError(t("sellerOfferInvalidBase", locale))
      return
    }
    if (ship == null) {
      setError(t("sellerOfferInvalidShipping", locale))
      return
    }
    if (!Number.isInteger(qty) || qty < 0) {
      setError(t("sellerOfferInvalidStock", locale))
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
        result.created
          ? t("sellerOfferCreated", locale)
          : t("sellerOfferUpdated", locale)
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
          : t("sellerOfferSaveFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  const offerId =
    existing && existing !== "loading" ? existing.offer.id : null

  const crumbTitle = t("sellerOfferTitle", locale)

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavProducts", locale), href: "/seller/products" },
        { label: crumbTitle },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">{crumbTitle}</h1>
      <p className="mb-5 mt-1.5 text-xs text-wf-600">
        {tFormat("sellerOfferIntro", locale, {
          title: product?.title ?? previewTitle ?? t("commonProduct", locale),
        })}
        {regionCode
          ? tFormat("sellerOfferRegion", locale, { region: regionCode })
          : ""}
      </p>

      {catalog === "loading" || existing === "loading" ? (
        <p className="text-sm text-wf-600">{t("commonLoading", locale)}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-wf-500">
            <span className="rounded-wf border border-wf-400 bg-wf-100 px-2.5 py-1 font-semibold text-wf-800">
              {t("sellerOfferCommercial", locale)}
            </span>
            <span className="rounded-wf border border-transparent px-2.5 py-1">
              {t("commonStock", locale)}
            </span>
            <span className="rounded-wf border border-transparent px-2.5 py-1">
              {t("sellerOrderShipping", locale)}
            </span>
          </div>

          <div className="grid gap-5 desktop:grid-cols-[1.7fr_1fr]">
            <div>
              <div className="mb-4 rounded-lg border border-wf-200 p-5">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                  {t("commonPrice", locale)}
                </h3>
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                    {t("sellerOfferBasePrice", locale)}
                  </label>
                  <Input
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="79,00"
                  />
                </div>
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                    {t("sellerOrderShippingCost", locale)}
                  </label>
                  <Input
                    value={shipping}
                    onChange={(e) => setShipping(e.target.value)}
                    placeholder="4,95"
                  />
                </div>
                <p className="text-[10.5px] text-wf-500">
                  {tFormat("sellerOfferTotalHint", locale, {
                    total: totalHint != null ? formatEuro(totalHint) : "—",
                  })}
                </p>
              </div>
              <div className="rounded-lg border border-wf-200 p-5">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                  {t("commonStock", locale)}
                </h3>
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                    {t("sellerOfferQtyInStock", locale)}
                  </label>
                  <Input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="42"
                  />
                </div>
              </div>
            </div>

            <BuyBoxPositionPanel
              position={buyBox}
              offerId={offerId}
              locale={locale}
            />
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
              {t("commonCancel", locale)}
            </Button>
            <Button
              type="button"
              disabled={busy || !identifierId}
              onClick={() => void onSave()}
            >
              {busy ? t("commonSaving", locale) : t("commonSave", locale)}
            </Button>
          </div>
        </>
      )}
    </SellerGate>
  )
}

function OfferSuspenseFallback() {
  const locale = useStorefrontLocale()
  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavProducts", locale), href: "/seller/products" },
        { label: t("sellerOfferTitle", locale) },
      ]}
    >
      <p className="text-sm text-wf-600">{t("commonLoading", locale)}</p>
    </SellerGate>
  )
}

/** product-05 — commerciële gegevens / Buy Box-positie (S3-04-03/04). */
export default function SellerProductOfferPage() {
  return (
    <Suspense fallback={<OfferSuspenseFallback />}>
      <SellerProductOfferInner />
    </Suspense>
  )
}
