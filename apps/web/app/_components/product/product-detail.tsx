"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge, Button, Notice } from "@europmade/ui"
import {
  CMS_PRODUCT_INTRO_MAX_CHARS,
  truncateAtWordBoundary,
} from "@europmade/utils"
import {
  formatEuroFromCents,
  lowestOfferPriceLabel,
  type PdpDetail,
  type PdpOffer,
} from "../../_lib/pdp-seed"
import {
  discountPercent,
  starsForRating,
  type ListingProduct,
} from "../../_lib/listing-products"
import { slugifyForBrand } from "../../_lib/brand-slug"
import {
  OrderServiceApiError,
} from "../../_lib/order-service-api"
import { useCart } from "../cart/cart-provider"
import { PublicStorefrontChrome } from "../marketplace/public-storefront-chrome"
import { rememberRecentlyViewed } from "../../_lib/recently-viewed"
import {
  recommendFrequentlyBoughtTogether,
  recommendOthersAlsoViewed,
  recommendRecentlyViewed,
  recommendSimilar,
} from "../../_lib/product-recommendations"
import { fetchStorefrontListings } from "../../_lib/client-catalog"
import { ProductGallery } from "./product-gallery"
import { TrustStrip } from "./trust-strip"
import { ProductCarousel } from "./product-carousel"
import { MadeInEuropeScoreCard } from "./made-in-europe-score-card"
import { partnerHref } from "../../_lib/partner-profiles"
import {
  DEFAULT_STOREFRONT_LOCALE,
  pickLocalized,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"
import {
  defaultDeliveryLabel,
  formatOfferShipping,
  isFreeShippingValue,
  localizeDeliveryLabelIfKnown,
} from "../../_lib/offer-delivery"
import type { ResolvedProductPresentation } from "../../_lib/cms/resolve-product-page"
import type { StoreCmsBanner } from "../../_lib/cms/fetch-store-cms"
import { AdSlot } from "../homepage/ad-slot"
import type { StorefrontAdCreative } from "../../_lib/storefront-ads"
import { ProductLinkSelector } from "./product-link-selector"
import { currentLinkMember } from "../../_lib/product-link-pdp"

type TabId =
  | "description"
  | "suitable"
  | "specs"
  | "downloads"
  | "product-reviews"
  | "seller-reviews"

function bannerToCreative(
  banner: StoreCmsBanner,
  locale: StorefrontLocale
): StorefrontAdCreative {
  return {
    id: banner.id,
    position: 1,
    location: "product",
    title: pickLocalized(banner.title, locale),
    headline: pickLocalized(banner.title, locale),
    description: pickLocalized(banner.subtitle, locale),
    ctaLabel: pickLocalized(banner.cta_label, locale) || t("viewProductCta", locale),
    href: banner.destination_url || "/",
    linkType:
      banner.link_type === "product" ||
      banner.link_type === "category" ||
      banner.link_type === "partner" ||
      banner.link_type === "collection" ||
      banner.link_type === "external"
        ? banner.link_type
        : "external",
    imageSrc: banner.image_url || "",
    imageAlt: pickLocalized(banner.image_alt, locale),
    status: "Actief",
    background: banner.background ?? undefined,
    logoSrc: banner.logo_url,
    source: "platform",
  }
}

/**
 * Productpagina + Buy Box — 1-op-1 sectiestructuur uit
 * sprint-1a/01-productpagina-buybox-{desktop,tablet,mobile}.html
 */
export function ProductDetailPage({
  detail,
  presentation,
  banner = null,
  locale = DEFAULT_STOREFRONT_LOCALE,
}: {
  detail: PdpDetail
  presentation?: ResolvedProductPresentation
  banner?: StoreCmsBanner | null
  locale?: StorefrontLocale
}) {
  const { addLine } = useCart()
  const router = useRouter()
  const [offers, setOffers] = useState<PdpOffer[]>(detail.offers)
  const [offersOpen, setOffersOpen] = useState(true)
  const descriptionVisibleInitial = presentation
    ? presentation.descriptionVisible
    : true
  const [tab, setTab] = useState<TabId>(
    descriptionVisibleInitial ? "description" : "suitable"
  )
  const [descExpanded, setDescExpanded] = useState(false)
  const [cartNote, setCartNote] = useState<string | null>(null)
  const [cartBusy, setCartBusy] = useState(false)
  const [wishlistNote, setWishlistNote] = useState<string | null>(null)
  const [recentProducts, setRecentProducts] = useState<ListingProduct[]>([])
  const [catalogPool, setCatalogPool] = useState<ListingProduct[]>([])
  const [railsReady, setRailsReady] = useState(false)

  const selected = useMemo(
    () => offers.find((o) => o.selected) ?? offers[0] ?? null,
    [offers]
  )

  const buybox = presentation?.buybox
  const sections = presentation?.sections
  const showPrice = buybox?.showPrice !== false
  const showReviews = buybox?.showReviews !== false
  const showStock = buybox?.showStock !== false
  const showDelivery = buybox?.showDelivery !== false
  const showBadges = buybox?.showBadges !== false
  const showSellers = buybox?.showSellers !== false
  const sellersVisible = sections?.sellersVisible !== false
  const descriptionVisible = presentation
    ? presentation.descriptionVisible
    : true
  const uspsVisible = sections?.uspsVisible !== false
  const introVisible = presentation != null ? sections?.introVisible !== false : true
  const faqVisible = presentation != null ? sections?.faqVisible !== false : true
  const relatedVisible = sections?.relatedVisible !== false
  const frequentlyBoughtVisible = sections?.frequentlyBoughtVisible !== false
  const introText = presentation != null
    ? introVisible
      ? presentation.intro
      : ""
    : // Without presentation, still never render untruncated PC description as intro.
      truncateAtWordBoundary(detail.intro || "", CMS_PRODUCT_INTRO_MAX_CHARS)
  const highlights =
    presentation != null
      ? presentation.highlights
      : detail.highlights
  const faqs =
    presentation != null
      ? faqVisible
        ? presentation.faqs
        : []
      : detail.faqs
  const whyText = presentation?.why?.trim() ?? ""
  const usageText = presentation?.usage?.trim() ?? ""
  const descriptionHtml = presentation?.descriptionHtml ?? null

  const tabListRef = useRef<HTMLDivElement>(null)
  const tabButtonRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>(
    {}
  )

  useEffect(() => {
    const btn = tabButtonRefs.current[tab]
    if (!btn) return
    btn.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    })
  }, [tab])

  function selectOffer(id: string) {
    if (!id.startsWith("offr_")) return
    setOffers((prev) => prev.map((o) => ({ ...o, selected: o.id === id })))
  }

  function openSellerPage(offer: PdpOffer) {
    selectOffer(offer.id)
    const href = offer.sellerSlug
      ? `/partner/${offer.sellerSlug}`
      : partnerHref(offer.retailer)
    router.push(href)
  }

  const tabs: { id: TabId; label: string }[] = [
    ...(descriptionVisible
      ? [{ id: "description" as const, label: t("tabDescription", locale) }]
      : []),
    { id: "suitable", label: t("tabSuitable", locale) },
    { id: "specs", label: t("tabSpecs", locale) },
    { id: "downloads", label: t("tabDownloads", locale) },
    {
      id: "product-reviews",
      label: `${t("tabProductReviews", locale)} (${detail.reviewCount})`,
    },
    {
      id: "seller-reviews",
      label: selected
        ? `${t("tabSellerReviews", locale)} (${selected.retailer})`
        : t("tabSellerReviews", locale),
    },
  ]

  useEffect(() => {
    if (!descriptionVisible && tab === "description") {
      setTab("suitable")
    }
  }, [descriptionVisible, tab])

  const sellerReviewsForOffer = detail.sellerReviews.filter(
    (r) =>
      !selected || !r.retailer || r.retailer === selected.retailer
  )
  const brandSlug = slugifyForBrand(detail.listing.brand)

  useEffect(() => {
    rememberRecentlyViewed(detail.listing)
    setRecentProducts(recommendRecentlyViewed(detail.slug, 20))
    let cancelled = false
    void (async () => {
      const listings = await fetchStorefrontListings(40)
      if (cancelled) return
      setCatalogPool(listings)
      setRailsReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [detail.listing, detail.slug])

  const pct = discountPercent(detail.listing)

  const relatedFromDetail = useMemo(
    () =>
      detail.relatedSlugs
        .map((slug) => catalogPool.find((p) => p.slug === slug))
        .filter((p): p is ListingProduct => p != null),
    [catalogPool, detail.relatedSlugs]
  )

  const similar = useMemo(() => {
    if (!railsReady) return []
    const fromAlgo = recommendSimilar(detail.listing, 12, [], catalogPool)
    if (fromAlgo.length) return fromAlgo
    return relatedFromDetail.slice(0, 12)
  }, [catalogPool, detail.listing, railsReady, relatedFromDetail])

  const frequentlyTogether = useMemo(() => {
    if (!railsReady) return []
    const fromSeed = recommendFrequentlyBoughtTogether(
      detail.listing,
      10,
      [],
      catalogPool
    )
    const fromPairs = detail.pairsWellWith
      .map(
        (item) =>
          catalogPool.find((p) => p.slug === item.slug)
      )
      .filter((p): p is ListingProduct => p != null)
    const seen = new Set<string>()
    const merged: ListingProduct[] = []
    for (const p of [...fromPairs, ...fromSeed]) {
      if (seen.has(p.slug) || p.slug === detail.slug) continue
      seen.add(p.slug)
      merged.push(p)
      if (merged.length >= 12) break
    }
    return merged
  }, [
    catalogPool,
    detail.listing,
    detail.pairsWellWith,
    detail.slug,
    railsReady,
  ])

  const othersViewed = useMemo(() => {
    if (!railsReady) return []
    return recommendOthersAlsoViewed(
      detail.listing,
      12,
      similar.map((p) => p.slug),
      catalogPool
    )
  }, [catalogPool, detail.listing, railsReady, similar])

  async function addToCart() {
    if (!selected || !selected.id.startsWith("offr_")) {
      setCartNote(t("noActiveCommerceOffer", locale))
      return
    }
    setCartBusy(true)
    setCartNote(null)
    try {
      const linkValues = detail.productLinkGroup
        ? currentLinkMember(detail.productLinkGroup, detail.slug)?.values
        : undefined
      const variant = linkValues
        ? Object.values(linkValues).filter(Boolean).join(" / ") || undefined
        : undefined
      await addLine(selected.id, 1, {
        offer_id: selected.id,
        product_id: detail.slug,
        slug: detail.slug,
        title: detail.fullTitle || detail.listing.title,
        seller_id: "",
        seller_name: selected.retailer,
        verified: detail.listing.verified || detail.euOwnershipPercent >= 50,
        delivery: selected.delivery || defaultDeliveryLabel(locale),
        stock: selected.stock || t("inStock", locale),
        returns: selected.returns || t("trust30DayReturn", locale),
        variant,
      })
      setCartNote(null)
    } catch (err) {
      setCartNote(
        err instanceof OrderServiceApiError
          ? err.message
          : t("addFailed", locale)
      )
    } finally {
      setCartBusy(false)
    }
  }

  return (
    <PublicStorefrontChrome locale={locale}>
      <nav
        className="px-4 pt-3.5 text-xs text-wf-500 tablet:px-8"
        aria-label="Breadcrumb"
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {detail.breadcrumb.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? <span aria-hidden>&gt;</span> : null}
              {crumb.href && i < detail.breadcrumb.length - 1 ? (
                <Link href={crumb.href} className="hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={
                    i === detail.breadcrumb.length - 1
                      ? "font-semibold text-wf-800"
                      : undefined
                  }
                  aria-current={
                    i === detail.breadcrumb.length - 1 ? "page" : undefined
                  }
                >
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Hero grid: gallery | info | buybox */}
      <div className="grid items-start gap-4 px-4 pt-4 pb-3 tablet:grid-cols-2 tablet:gap-4 tablet:px-8 tablet:pt-5 tablet:pb-3 desktop:grid-cols-[1fr_1fr_300px] desktop:gap-5">
        <div className="min-w-0 self-start" data-cms-section="gallery">
          <ProductGallery
            title={detail.fullTitle}
            seed={detail.slug}
            count={detail.galleryCount}
            images={detail.galleryImages}
            slides={detail.gallerySlides}
            visible={presentation?.galleryVisible !== false}
            thumbnailPosition={presentation?.thumbnailPosition ?? "left"}
            thumbnailCount={presentation?.thumbnailCount}
          />
        </div>

        <div className="min-w-0 self-start" data-cms-section="intro">
          <div className="flex items-start gap-2">
            <h1 className="m-0 min-w-0 flex-1 text-[22px] font-bold leading-tight tracking-tight text-wf-900 tablet:text-[24px]">
              {detail.fullTitle}
            </h1>
            <button
              type="button"
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-wf-600 transition hover:bg-wf-100 hover:text-wf-900"
              aria-label={t("favoritesLater", locale)}
              title={t("favoritesLater", locale)}
              onClick={() => setWishlistNote(t("favoritesLater", locale))}
            >
              ♡
            </button>
          </div>
          {wishlistNote ? (
            <p className="mt-1 text-[11px] text-wf-600">{wishlistNote}</p>
          ) : null}

          {showReviews ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-base tracking-wide text-wf-900" aria-hidden>
                {starsForRating(detail.listing.rating)}
              </span>
              <span className="text-sm font-bold text-wf-900">
                {detail.listing.rating.toFixed(1).replace(".", ",")}
              </span>
              <button
                type="button"
                className="text-sm font-semibold text-wf-700 underline underline-offset-2"
                onClick={() => {
                  setTab("product-reviews")
                  document
                    .getElementById("product-tabs")
                    ?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                {tFormat("reviewsCount", locale, { count: detail.reviewCount })}
              </button>
            </div>
          ) : null}

          {showPrice ? (
            <>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <p className="text-[26px] font-bold leading-none text-wf-900">
                  {selected
                    ? formatEuroFromCents(selected.priceCents)
                    : lowestOfferPriceLabel(detail)}
                </p>
                {detail.listing.originalPriceCents && pct != null ? (
                  <>
                    <span className="text-sm text-wf-500 line-through">
                      {formatEuroFromCents(detail.listing.originalPriceCents)}
                    </span>
                    <span className="rounded bg-wf-900 px-1.5 py-0.5 text-[11px] font-bold text-white">
                      −{pct}%
                    </span>
                  </>
                ) : null}
              </div>
              {showSellers ? (
                <a
                  href="#aanbieders"
                  className="mt-1.5 inline-block text-[13px] font-semibold text-wf-700 underline-offset-2 hover:underline"
                >
                  {tFormat("lowestPriceCompare", locale, {
                    price: lowestOfferPriceLabel(detail),
                    count: offers.length,
                  })}
                </a>
              ) : null}
            </>
          ) : null}

          {detail.madeInEurope ? (
            <div className="mt-2 max-w-md">
              <MadeInEuropeScoreCard
                data={detail.madeInEurope}
                locale={locale}
                countryLabel={detail.listing.countryLabel}
                manufacturer={detail.manufacturer}
                brandSlug={brandSlug}
              />
            </div>
          ) : showBadges ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Link
                href="/verified"
                className="inline-flex h-7 items-center rounded-full border border-wf-900 bg-wf-900 px-2.5 text-[11px] font-bold leading-none text-white"
              >
                ✓ {t("euVerified", locale)}™
              </Link>
              <span className="inline-flex h-7 items-center text-[12px] font-semibold leading-none text-wf-800">
                {t("madeInLabel", locale)} {detail.listing.countryLabel}
              </span>
              <Link
                href={`/merk/${brandSlug}#productie`}
                className="inline-flex h-7 items-center text-[12px] font-semibold leading-none text-wf-800 underline-offset-2 hover:underline"
              >
                {t("producerLabel", locale)} {detail.manufacturer} ›
              </Link>
            </div>
          ) : null}
          {showBadges ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link href={`/merk/${brandSlug}`}>
                <Badge variant="outline">
                  {t("brandLabel", locale)} {detail.listing.brand}
                </Badge>
              </Link>
            </div>
          ) : null}

          {detail.productLinkGroup ? (
            <ProductLinkSelector
              group={detail.productLinkGroup}
              currentProductId={detail.slug}
            />
          ) : null}

          {introText ? (
            <p
              className="mt-2 text-[13px] leading-snug text-wf-700"
              data-cms-section="intro"
            >
              {introText}
            </p>
          ) : null}

          {uspsVisible && highlights.length > 0 ? (
            <div className="mt-2 border-t border-wf-200 pt-2" data-cms-section="usps">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                {t("keyFeatures", locale)}
              </p>
              <ul className="space-y-0.5">
                {highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-center gap-2 text-[13px] text-wf-700"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-wf-500" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Buy Box — desktop/tablet kolom; mobiel onder info */}
        <div
          className="desktop:sticky desktop:top-5 desktop:self-start"
          data-cms-section="buybox"
        >
          <BuyBox
            selected={selected}
            offerCount={offers.length}
            notice={detail.buyBoxNotice}
            cartBusy={cartBusy}
            cartNote={cartNote}
            locale={locale}
            showPrice={showPrice}
            showReviews={showReviews}
            showStock={showStock}
            showDelivery={showDelivery}
            showBadges={showBadges}
            showSellers={showSellers}
            onAddToCart={() => void addToCart()}
            onToggleOffers={() => {
              setOffersOpen(true)
              document
                .getElementById("aanbieders")
                ?.scrollIntoView({ behavior: "smooth" })
            }}
          />
        </div>
      </div>

      {/* Trustbalk — horizontale rij (scroll/carousel), geen 2×2 grid */}
      {(() => {
        const trust = presentation?.trust
        const showTrust =
          trust == null ||
          trust.showSafePayment ||
          trust.show30DayReturn ||
          trust.showMadeInEurope ||
          trust.showVerifiedInfo
        if (!showTrust) return null
        return (
          <section className="min-w-0 max-w-full overflow-x-hidden border-y border-wf-200 bg-wf-50/60 px-4 py-3 tablet:px-8">
            <TrustStrip locale={locale} trust={trust} />
          </section>
        )
      })()}

      {/* Why/Usage: alleen titel+sectie als visibility én seller-content aanwezig */}
      {whyText ? (
        <section
          className="px-4 pt-4 tablet:px-8"
          data-cms-section="why"
        >
          <h2 className="mb-2 border-b border-wf-200 pb-2 text-[17px] font-bold text-wf-900">
            {t("whyHeading", locale)}
          </h2>
          <p className="max-w-[760px] text-[13.5px] leading-relaxed text-wf-700 whitespace-pre-line">
            {whyText}
          </p>
        </section>
      ) : null}

      {usageText ? (
        <section
          className="px-4 pt-4 tablet:px-8"
          data-cms-section="usage"
        >
          <h2 className="mb-2 border-b border-wf-200 pb-2 text-[17px] font-bold text-wf-900">
            {t("usageHeading", locale)}
          </h2>
          <p className="max-w-[760px] text-[13.5px] leading-relaxed text-wf-700 whitespace-pre-line">
            {usageText}
          </p>
        </section>
      ) : null}

      {/* Alle aanbieders — direct onder trustbalk */}
      {sellersVisible ? (
      <section
        id="aanbieders"
        className="px-4 pt-4 pb-5 tablet:px-8 tablet:pt-4 tablet:pb-6"
        data-cms-section="sellers"
      >
        <h2 className="mb-2.5 border-b border-wf-200 pb-2 text-[17px] font-bold text-wf-900">
          {tFormat("allSellersCount", locale, { count: offers.length })}
        </h2>

        {showSellers ? (
          <>
        {/* Desktop/tablet table */}
        <div className="hidden overflow-x-auto tablet:block">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {[
                  t("offerer", locale),
                  t("price", locale),
                  t("deliveryTime", locale),
                  t("shipping", locale),
                  t("returns", locale),
                  t("rating", locale),
                  t("stock", locale),
                  "",
                ].map((h) => (
                  <th
                    key={h || "actie"}
                    className="border-b border-wf-400 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr
                  key={o.id}
                  className={o.selected ? "bg-wf-100 font-semibold" : undefined}
                >
                  <td className="border-b border-wf-200 px-3 py-3 align-middle">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-[18px] w-[18px] rounded-full bg-wf-300" />
                      <Link
                        href={o.sellerSlug ? `/partner/${o.sellerSlug}` : partnerHref(o.retailer)}
                        className="font-semibold underline-offset-2 hover:underline"
                      >
                        {o.retailer}
                      </Link>
                      {o.selected ? (
                        <Badge variant="solid" className="ml-1 text-[10px]">
                          {t("selected", locale)}
                        </Badge>
                      ) : null}
                    </span>
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    {formatEuroFromCents(o.priceCents)}
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    {localizeDeliveryLabelIfKnown(o.delivery, locale)}
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    {formatOfferShipping(o.shipping, locale)}
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    {o.returns}
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    ★ {o.rating.toFixed(1).replace(".", ",")}
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">{o.stock}</td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openSellerPage(o)}
                    >
                      {t("showThisSeller", locale)}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile offer cards */}
        <ul className="space-y-2.5 tablet:hidden">
          {offers.map((o) => (
            <li
              key={o.id}
              className={`rounded-lg border p-3 ${
                o.selected ? "border-wf-800 bg-wf-100" : "border-wf-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className="inline-block h-[18px] w-[18px] rounded-full bg-wf-300" />
                  {o.retailer}
                </span>
                {o.selected ? (
                  <Badge variant="solid" className="text-[10px]">
                    {t("selected", locale)}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 text-lg font-bold text-wf-900">
                {formatEuroFromCents(o.priceCents)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">
                  {localizeDeliveryLabelIfKnown(o.delivery, locale)}
                </Badge>
                <Badge variant="outline">
                  {formatOfferShipping(o.shipping, locale)}
                </Badge>
                <Badge variant="outline">{o.returns}</Badge>
                <Badge variant="outline">
                  ★ {o.rating.toFixed(1).replace(".", ",")}
                </Badge>
              </div>
              {!o.selected ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => openSellerPage(o)}
                >
                  {t("showThisSeller", locale)}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
          </>
        ) : null}
        {offersOpen ? null : null}
      </section>
      ) : null}

      {/* Tabs */}
      <section
        id="product-tabs"
        className="min-w-0 max-w-full overflow-x-hidden px-4 pb-8 tablet:px-8 tablet:pb-10"
        data-cms-section="description"
      >
        <div
          ref={tabListRef}
          className="mb-5 flex max-w-full min-w-0 snap-x snap-mandatory gap-0 overflow-x-auto overscroll-x-contain border-b border-wf-300 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={t("productInfoAria", locale)}
        >
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              role="tab"
              aria-selected={tab === tabItem.id}
              ref={(el) => {
                tabButtonRefs.current[tabItem.id] = el
              }}
              className={`shrink-0 snap-start whitespace-nowrap px-[18px] py-2.5 text-[13px] ${
                tab === tabItem.id
                  ? "border-b-2 border-wf-900 font-bold text-wf-900"
                  : "border-b-2 border-transparent text-wf-500"
              }`}
              onClick={() => setTab(tabItem.id)}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {tab === "description" && descriptionVisible ? (
          <div>
            <div
              className={`max-w-[760px] space-y-3.5 text-[13.5px] leading-relaxed text-wf-700 ${
                descExpanded ? "" : "relative max-h-[15.5em] overflow-hidden"
              }`}
            >
              {descriptionHtml ? (
                <div
                  className="cms-html prose-sm max-w-none [&_a]:underline [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : (
                detail.descriptionParagraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))
              )}
            </div>
            <button
              type="button"
              className="mt-3.5 rounded border border-wf-700 bg-white px-[18px] py-2 text-[12.5px] font-semibold text-wf-800"
              onClick={() => setDescExpanded((v) => !v)}
            >
              {descExpanded ? t("showLess", locale) : t("showMore", locale)}
            </button>
          </div>
        ) : null}

        {tab === "suitable" ? (
          detail.suitableFor.length > 0 ? (
            <ul className="space-y-2">
              {detail.suitableFor.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-[13px] text-wf-700"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-wf-500" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-wf-600">
              {t("suitableComingSoon", locale)}
            </p>
          )
        ) : null}

        {tab === "specs" ? (
          <div>
            <table className="w-full max-w-[640px] border-collapse text-[13px]">
              <tbody>
                {detail.specs.map((row) => (
                  <tr key={row.label}>
                    <td className="w-[220px] border-b border-wf-200 py-2.5 text-wf-500">
                      {row.label}
                    </td>
                    <td className="border-b border-wf-200 py-2.5 text-wf-800">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link
              href="/klantenservice"
              className="mt-4 inline-block text-xs text-wf-700 underline decoration-dotted"
            >
              {t("reportProductInfo", locale)}
            </Link>
          </div>
        ) : null}

        {tab === "downloads" ? (
          <ul className="max-w-[480px] space-y-2">
            {detail.downloads.map((d) => (
              <li key={d.filename}>
                <a
                  href={`#${d.filename}`}
                  className="flex items-center justify-between rounded border border-wf-300 px-3 py-2.5 text-[13px] text-wf-800 hover:border-wf-500"
                >
                  <span>{d.label}</span>
                  <span className="text-[11px] text-wf-500">{d.filename}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "product-reviews" ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h3 className="m-0 text-sm font-bold">
                {t("tabProductReviews", locale)}
              </h3>
              <Link
                href="/account/reviews/new"
                className="rounded border border-wf-700 bg-white px-3.5 py-1.5 text-xs font-semibold text-wf-800"
              >
                {t("addReview", locale)}
              </Link>
            </div>
            <p className="mb-3 text-xs text-wf-600">
              {tFormat("productReviewsAvg", locale, {
                stars: starsForRating(detail.listing.rating),
                rating: detail.listing.rating.toFixed(1).replace(".", ","),
                count: detail.reviewCount,
              })}
            </p>
            <ul>
              {detail.productReviews.map((r, i) => (
                <li
                  key={i}
                  className="border-t border-wf-200 py-2.5 text-xs text-wf-700"
                >
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => setTab("product-reviews")}
                  >
                    {starsForRating(r.stars)} &ldquo;{r.excerpt}&rdquo;
                  </button>{" "}
                  {r.verified ? (
                    <span className="ml-1.5 inline-block rounded-lg border border-wf-400 bg-wf-100 px-1.5 py-0.5 text-[10px] font-semibold text-wf-700">
                      {t("verifiedPurchase", locale)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "seller-reviews" ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h3 className="m-0 text-sm font-bold">
                {t("tabSellerReviews", locale)}
                {selected ? ` — ${selected.retailer}` : ""}
              </h3>
              <Link
                href="/account/reviews/new"
                className="rounded border border-wf-700 bg-white px-3.5 py-1.5 text-xs font-semibold text-wf-800"
              >
                {t("addReview", locale)}
              </Link>
            </div>
            <p className="mb-3 text-xs text-wf-600">
              {selected
                ? tFormat("sellerReviewsFor", locale, {
                    retailer: selected.retailer,
                  })
                : t("noSellerSelected", locale)}
            </p>
            <ul>
              {sellerReviewsForOffer.length === 0 ? (
                <li className="border-t border-wf-200 py-2.5 text-xs text-wf-600">
                  {t("noSellerReviews", locale)}
                </li>
              ) : (
                sellerReviewsForOffer.map((r, i) => (
                  <li
                    key={i}
                    className="border-t border-wf-200 py-2.5 text-xs text-wf-700"
                  >
                    {starsForRating(r.stars)} &ldquo;{r.excerpt}&rdquo;{" "}
                    {r.verified ? (
                      <span className="ml-1.5 inline-block rounded-lg border border-wf-400 bg-wf-100 px-1.5 py-0.5 text-[10px] font-semibold text-wf-700">
                        {t("verifiedPurchase", locale)}
                      </span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </section>

      {/* Commerciële carrousels — direct onder productomschrijving */}
      <section className="px-4 pb-2 tablet:px-8">
        {relatedVisible ? (
          <div data-cms-section="related">
            <ProductCarousel
              title={t("similarProducts", locale)}
              subtitle={t("similarSubtitle", locale)}
              products={similar}
              loading={!railsReady}
              lazy={false}
              locale={locale}
            />
          </div>
        ) : null}
        {frequentlyBoughtVisible ? (
          <div data-cms-section="frequently_bought">
            <ProductCarousel
              title={t("frequentlyBought", locale)}
              subtitle={t("frequentlySubtitle", locale)}
              products={frequentlyTogether}
              loading={!railsReady}
              lazy={false}
              locale={locale}
            />
          </div>
        ) : null}
        <ProductCarousel
          title={t("othersAlsoViewed", locale)}
          subtitle={t("othersSubtitle", locale)}
          products={othersViewed}
          loading={!railsReady}
          lazy={false}
          locale={locale}
        />
        <ProductCarousel
          title={t("recentlyViewed", locale)}
          products={recentProducts}
          loading={!railsReady}
          hideWhenEmpty
          lazy={false}
          locale={locale}
        />
      </section>

      {/* FAQ */}
      {faqVisible && faqs.length > 0 ? (
        <section
          className="px-4 pb-8 tablet:px-8 tablet:pb-10"
          data-cms-section="faq"
        >
          <h2 className="mb-3.5 border-b border-wf-200 pb-2.5 text-[17px] font-bold text-wf-900">
            {t("faqHeading", locale)}
          </h2>
          <div className="max-w-[760px]">
            {faqs.map((f) => (
              <div
                key={f.q}
                className="border-b border-wf-200 py-3 last:border-b-0"
              >
                <p className="mb-1 text-[13.5px] font-bold text-wf-800">{f.q}</p>
                <p className="text-[13px] leading-relaxed text-wf-700">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {banner ? (
        <div className="px-0 pb-8 tablet:pb-10" data-cms-section="banner">
          <AdSlot
            position={1}
            location="product"
            creative={bannerToCreative(banner, locale)}
            locale={locale}
            adLabel={t("advertisement", locale)}
            compact
          />
        </div>
      ) : null}

      {/* Sticky bottom bar — mobiel (CMP-028) */}
      <div className="sticky bottom-0 z-30 flex items-center gap-2.5 border-t border-wf-400 bg-white px-3.5 py-2.5 shadow-[0_-2px_6px_rgba(0,0,0,0.06)] tablet:hidden">
        <div className="shrink-0">
          {selected ? (
            <>
              <p className="text-base font-bold text-wf-900">
                {showPrice
                  ? formatEuroFromCents(selected.priceCents)
                  : selected.retailer}
              </p>
              <p className="text-[9.5px] text-wf-600">
                {selected.retailer}
                {showDelivery
                  ? ` · ${shortDeliveryLabel(selected.delivery, locale)}`
                  : ""}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-wf-600">{t("noOffer", locale)}</p>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          className="min-w-0 flex-1 py-2.5 text-[12.5px]"
          disabled={cartBusy || !selected}
          onClick={() => void addToCart()}
        >
          {cartBusy ? t("adding", locale) : t("addToCart", locale)}
        </Button>
      </div>
    </PublicStorefrontChrome>
  )
}

function shortDeliveryLabel(value: string, locale: StorefrontLocale) {
  return localizeDeliveryLabelIfKnown(value, locale)
}

function shortStockLabel(value: string, locale: StorefrontLocale) {
  const v = value.trim()
  if (!v) return t("inStock", locale)
  if (/beperkt|lage|low stock|stock faible|geringer|nog \d+|niet op voorraad|out of stock/i.test(v)) {
    return v
  }
  return t("inStock", locale)
}

function shortReturnsLabel(value: string, locale: StorefrontLocale) {
  const v = value.trim().toLowerCase()
  if (!v || /retourbeleid|via aanbieder/.test(v)) return t("trust30DayReturn", locale)
  if (/30/.test(v)) return t("trust30DayReturn", locale)
  if (/retour|return/.test(v) && v.length <= 28) return value.trim()
  return t("trust30DayReturn", locale)
}

function resolveBuyBoxNotice(notice: string, locale: StorefrontLocale): string {
  const localized = t("buyBoxNotice", locale)
  const trimmed = notice?.trim() ?? ""
  if (!trimmed) return localized
  if (locale !== "en") {
    const en = t("buyBoxNotice", "en")
    if (trimmed === en || /^Best overall offer/i.test(trimmed)) {
      return localized
    }
  }
  return trimmed
}

function BuyBox({
  selected,
  offerCount,
  notice,
  cartBusy,
  cartNote,
  locale,
  showPrice = true,
  showReviews = true,
  showStock = true,
  showDelivery = true,
  showBadges = true,
  showSellers = true,
  onAddToCart,
  onToggleOffers,
}: {
  selected: PdpOffer | null
  offerCount: number
  notice: string
  cartBusy: boolean
  cartNote: string | null
  locale: StorefrontLocale
  showPrice?: boolean
  showReviews?: boolean
  showStock?: boolean
  showDelivery?: boolean
  showBadges?: boolean
  showSellers?: boolean
  onAddToCart: () => void
  onToggleOffers: () => void
}) {
  const noticeText = resolveBuyBoxNotice(notice, locale)

  if (!selected) {
    return (
      <aside
        className="rounded-lg border-2 border-wf-400 bg-white px-[22px] py-5"
        aria-label="Buy Box"
      >
        <p className="text-sm font-semibold text-wf-900">
          {t("noActiveOffer", locale)}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-wf-700">
          {t("noCommerceOfferBody", locale)}
        </p>
        <Notice variant="info" className="mt-3 text-[11px]">
          ⓘ {noticeText}{" "}
          <Link href="/buy-box" className="text-wf-800 underline">
            {t("moreExplanation", locale)}
          </Link>
        </Notice>
      </aside>
    )
  }

  return (
    <aside
      className="rounded-xl border-2 border-wf-800 bg-white px-4 py-3.5 shadow-sm"
      aria-label="Buy Box"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-wf-600">
          {t("autoSelectedOffer", locale)}
        </span>
        <span
          className="inline-flex h-[15px] w-[15px] items-center justify-center rounded-full border border-wf-500 text-[9.5px] text-wf-600"
          title={t("whyThisSeller", locale)}
        >
          ⓘ
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-wf-700">
        <span className="inline-block h-[18px] w-[18px] rounded-full bg-wf-300" />
        <Link
          href={
            selected.sellerSlug
              ? `/partner/${selected.sellerSlug}`
              : partnerHref(selected.retailer)
          }
          className="font-semibold text-wf-800 underline-offset-2 hover:underline"
        >
          {selected.retailer}
        </Link>
        {showReviews ? (
          <span className="text-wf-500">
            ★ {selected.rating.toFixed(1).replace(".", ",")}
          </span>
        ) : null}
      </div>
      {showPrice ? (
        <p className="mt-1.5 text-[28px] font-bold leading-none text-wf-900">
          {formatEuroFromCents(selected.priceCents)}
        </p>
      ) : null}
      {(showDelivery || showStock || showBadges) ? (
        <div className="my-2 grid grid-cols-2 gap-1.5">
          {showDelivery ? (
            <Badge
              variant="solid"
              className="justify-center truncate px-2 py-1 text-[10.5px]"
            >
              {shortDeliveryLabel(selected.delivery, locale)}
            </Badge>
          ) : null}
          {showBadges ? (
            <Badge
              variant="outline"
              className="justify-center truncate px-2 py-1 text-[10.5px]"
            >
              {isFreeShippingValue(selected.shipping)
                ? t("freeShipping", locale)
                : `${t("shipping", locale)} ${selected.shipping}`}
            </Badge>
          ) : null}
          {showStock ? (
            <Badge
              variant="outline"
              className="justify-center truncate px-2 py-1 text-[10.5px]"
            >
              {shortStockLabel(selected.stock, locale)}
            </Badge>
          ) : null}
          {showBadges ? (
            <Badge
              variant="outline"
              className="justify-center truncate px-2 py-1 text-[10.5px]"
            >
              {shortReturnsLabel(selected.returns, locale)}
            </Badge>
          ) : null}
        </div>
      ) : null}
      <Button
        type="button"
        variant="primary"
        className="w-full py-3 text-sm"
        disabled={cartBusy}
        onClick={onAddToCart}
      >
        {cartBusy ? t("adding", locale) : t("addToCart", locale)}
      </Button>
      {cartNote ? (
        <Notice variant="info" className="mt-2 text-[11px]">
          {cartNote}{" "}
          {/toegevoegd|added|hinzugefügt|ajout/i.test(cartNote) ? (
            <Link href="/cart" className="underline">
              {t("goToCart", locale)}
            </Link>
          ) : null}
        </Notice>
      ) : null}
      <Notice variant="info" className="mt-2.5 text-[11px]">
        ⓘ {noticeText}{" "}
        <Link href="/buy-box" className="text-wf-800 underline">
          {t("moreExplanation", locale)}
        </Link>
      </Notice>
      {showSellers ? (
        <button
          type="button"
          className="mt-3 w-full border-t border-dashed border-wf-300 pt-2.5 text-center text-xs text-wf-700"
          onClick={onToggleOffers}
        >
          {tFormat("viewAllSellers", locale, { count: offerCount })}
        </button>
      ) : null}
    </aside>
  )
}
