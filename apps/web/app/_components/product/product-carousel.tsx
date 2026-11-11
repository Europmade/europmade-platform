"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { discountLabelKind } from "@europmade/utils"
import { Badge } from "@europmade/ui"
import {
  formatEuroFromCents,
  starsForRating,
  type ListingProduct,
} from "../../_lib/listing-products"
import { hashHue } from "../../_lib/cart-line-meta"
import { isFavorite, toggleFavorite } from "../../_lib/favorites"
import { productMockupSrc } from "../../_lib/product-mockup"
import { useCartOptional } from "../cart/cart-provider"
import { OrderServiceApiError } from "../../_lib/order-service-api"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"

export type ProductCarouselVariant = "default" | "compact"

export type ProductCarouselProps = {
  title: string
  subtitle?: string
  products: ListingProduct[]
  emptyHint?: string
  /** Force skeleton state (e.g. while parent still resolving). */
  loading?: boolean
  /** Compact cards for drawer / dense UI. */
  variant?: ProductCarouselVariant
  /** Optional “In winkelwagen” on hover — deprecated, niet meer getoond. */
  showAddToCart?: boolean
  onAddToCart?: (product: ListingProduct) => void
  onNavigate?: () => void
  /** Hide entire section when empty (e.g. Laatst bekeken). */
  hideWhenEmpty?: boolean
  className?: string
  /** IntersectionObserver lazy mount — default true. */
  lazy?: boolean
  locale?: StorefrontLocale
  titleColor?: string
  titleFontSize?: number | null
}

/**
 * Productstudio-achtergrond voor transparante PNG/WebP-hoofdfoto's.
 * Neutrale studio zodat fotorealistische placeholders én seller-uploads uitkomen.
 */
function productStudioBackground(_hue: number): string {
  return "linear-gradient(165deg, #f7f8fa 0%, #f2f3f5 48%, #eceef1 100%)"
}

function ProductThumb({
  slug,
  title,
  imageSrc,
}: {
  slug: string
  title: string
  /** Transparante PNG/WebP (standaard EuropMade). */
  imageSrc?: string | null
}) {
  const hue = hashHue(slug || title)
  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-lg"
      style={{ background: productStudioBackground(hue) }}
      role="img"
      aria-label={`Productafbeelding ${title}`}
    >
      {/* Subtiele studio-vloer */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] opacity-50"
        style={{
          background: "linear-gradient(to top, #e8eaee, transparent)",
        }}
        aria-hidden
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          className="relative z-[1] h-full w-full object-contain p-2.5 drop-shadow-[0_10px_20px_rgba(15,23,42,0.1)]"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="relative z-[1] flex h-full items-center justify-center px-2 text-center text-[11px] text-wf-500">
          Geen productafbeelding
        </div>
      )}
    </div>
  )
}

function CarouselArrow({
  direction,
  onClick,
  visible,
  locale,
}: {
  direction: "left" | "right"
  onClick: () => void
  visible: boolean
  locale: StorefrontLocale
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!visible}
      aria-label={
        direction === "left"
          ? t("prevProducts", locale)
          : t("nextProducts", locale)
      }
      className={`absolute top-[42%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-wf-200/90 bg-white/90 text-wf-900 shadow-[0_4px_14px_rgba(15,23,42,0.12)] backdrop-blur-sm transition duration-200 hover:bg-white hover:shadow-[0_6px_18px_rgba(15,23,42,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wf-900 disabled:pointer-events-none disabled:opacity-0 ${
        direction === "left" ? "left-1.5 tablet:left-0" : "right-1.5 tablet:right-0"
      } ${
        visible
          ? "opacity-90 tablet:opacity-0 tablet:group-hover/carousel:opacity-100"
          : ""
      }`}
    >
      <span aria-hidden className="text-xl leading-none">
        {direction === "left" ? "‹" : "›"}
      </span>
    </button>
  )
}

function cardShellClass(compact?: boolean): string {
  const base =
    "shrink-0 basis-[calc((100%-0.75rem)/2)] max-w-[calc((100%-0.75rem)/2)]"
  if (compact) {
    return `${base} tablet:basis-[calc((100%-1rem)/3)] tablet:max-w-[calc((100%-1rem)/3)]`
  }
  return `${base} tablet:basis-[calc((100%-1.5rem)/3)] tablet:max-w-[calc((100%-1.5rem)/3)] desktop:basis-[calc((100%-2rem)/5)] desktop:max-w-[calc((100%-2rem)/5)]`
}

function SkeletonCard({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`${cardShellClass(compact)} animate-pulse rounded-xl border border-wf-200 bg-white p-1.5`}
      aria-hidden
    >
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-wf-100" />
      <div className="mt-1.5 h-3 w-[90%] rounded bg-wf-100" />
      <div className="mt-1.5 h-3 w-full rounded bg-wf-100" />
      <div className="mt-2 ml-auto h-4 w-[45%] rounded bg-wf-100" />
    </div>
  )
}

function FavoriteButton({
  slug,
  title,
  locale,
}: {
  slug: string
  title: string
  locale: StorefrontLocale
}) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const sync = () => setActive(isFavorite(slug))
    sync()
    window.addEventListener("em-favorites", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("em-favorites", sync)
      window.removeEventListener("storage", sync)
    }
  }, [slug])

  function onToggle(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    setActive(toggleFavorite(slug))
    window.dispatchEvent(new Event("em-favorites"))
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={tFormat(active ? "removeFavorite" : "addFavorite", locale, { title })}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm text-wf-700 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-wf-900"
    >
      <span aria-hidden>{active ? "♥" : "♡"}</span>
    </button>
  )
}

export function ProductCarouselCard({
  product,
  variant = "default",
  layout = "carousel",
  onNavigate,
  locale = DEFAULT_STOREFRONT_LOCALE,
}: {
  product: ListingProduct
  variant?: ProductCarouselVariant
  layout?: "carousel" | "grid"
  /** @deprecated Niet meer gebruikt — hover ATC verwijderd. */
  showAddToCart?: boolean
  onAddToCart?: (product: ListingProduct) => void
  onNavigate?: () => void
  locale?: StorefrontLocale
}) {
  const compact = variant === "compact"
  const href = `/product/${product.slug}`
  const cart = useCartOptional()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const offerId = product.buyBoxOfferId?.trim() || ""
  const canAdd = Boolean(cart && offerId.startsWith("offr_") && product.priceCents > 0)
  const regularCents =
    product.regularPriceCents != null && product.regularPriceCents > product.priceCents
      ? product.regularPriceCents
      : null
  const discountKind = discountLabelKind(regularCents, product.priceCents)
  const hasReview = (product.reviewCount ?? 0) > 0 && product.rating > 0
  const showFrom = product.offerCount > 1
  const shellClass =
    layout === "grid"
      ? "relative h-full w-full"
      : `${cardShellClass(compact)} group/card relative`

  async function addToCart(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (!cart || !canAdd) return
    setBusy(true)
    setNote(null)
    try {
      await cart.addLine(offerId, 1, {
        offer_id: offerId,
        product_id: product.slug,
        slug: product.slug,
        title: product.title,
        seller_id: product.buyBoxSellerId || "",
        seller_name: product.buyBoxSellerName || product.seller,
        verified: product.verified,
        delivery: "",
        stock: t("inStock", locale),
        returns: t("trust30DayReturn", locale),
      })
    } catch (err) {
      setNote(err instanceof OrderServiceApiError ? err.message : t("addFailed", locale))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`${shellClass} group/card`}>
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-wf-200 bg-white p-1.5 shadow-sm transition duration-200 group-hover/card:-translate-y-0.5 group-hover/card:border-wf-300 group-hover/card:shadow-md">
        <div className="relative">
          <ProductThumb
            slug={product.slug}
            title={product.title}
            imageSrc={product.imageUrl}
          />
          <span
            className="pointer-events-none absolute left-1.5 top-1.5 z-[1] rounded bg-white/90 px-1 py-0.5 text-[9.5px] leading-none tracking-tighter text-wf-800 shadow-sm backdrop-blur-sm"
            aria-hidden={hasReview ? undefined : true}
            aria-label={
              hasReview
                ? tFormat("productRating", locale, {
                    rating: product.rating.toFixed(1).replace(".", ","),
                  })
                : undefined
            }
          >
            {hasReview ? starsForRating(product.rating) : "☆☆☆☆☆"}
          </span>
          {product.verified ? (
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 z-[1]">
              <Badge
                variant="solid"
                className="px-1 py-0.5 text-[8.5px] shadow-sm"
              >
                EU Verified™
              </Badge>
            </span>
          ) : null}
          {discountKind ? (
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-[1] rounded bg-wf-900 px-1 py-0.5 text-[9px] font-bold text-white shadow-sm">
              {t(discountKind === "high_discount" ? "highDiscount" : "discount", locale)}
            </span>
          ) : null}
        </div>

        <h3 className="mt-1.5 line-clamp-2 min-h-[2.2em] text-[12.5px] font-semibold leading-snug text-wf-900">
          {product.title}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-1.5 pt-1">
          <p className="min-w-0 truncate text-[11px] text-wf-600">
            {product.brand}
          </p>
          <div className="flex shrink-0 items-end gap-1.5">
            {product.priceCents > 0 ? (
              <div className="flex flex-col items-end leading-none">
                {regularCents != null ? (
                  <span className="mb-0.5 text-[10px] text-wf-500 line-through">
                    {formatEuroFromCents(regularCents)}
                  </span>
                ) : null}
                <p
                  className={`font-bold tracking-tight text-wf-900 ${
                    regularCents != null ? "text-[17px]" : "text-[16px]"
                  }`}
                >
                  {showFrom ? (
                    <span className="mr-0.5 align-baseline text-[10px] font-semibold text-wf-600">
                      {t("fromPrice", locale)}
                    </span>
                  ) : null}
                  {formatEuroFromCents(product.priceCents)}
                </p>
              </div>
            ) : null}
            {canAdd ? (
              <button
                type="button"
                className="relative z-[2] inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1f8a4c] text-white disabled:opacity-60"
                aria-label={t("addToCart", locale)}
                disabled={busy}
                onClick={(event) => void addToCart(event)}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6 6h15l-1.5 9h-12L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="20" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
        {note ? <p className="relative z-[2] mt-1 text-[11px] leading-4 text-red-700">{note}</p> : null}

        <Link
          href={href}
          onClick={onNavigate}
          className="absolute inset-0 z-[1] rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wf-900"
          aria-label={tFormat("viewProduct", locale, { title: product.title })}
        />

        <div className="absolute right-2 top-2 z-[2]">
          <FavoriteButton slug={product.slug} title={product.title} locale={locale} />
        </div>
      </div>
    </article>
  )
}

/**
 * Herbruikbare productcarrousel (PDP, homepage, categorie, zoek, partner, cart, checkout).
 * Geen horizontale scrollbar — swipe + zwevende pijlen.
 */
export function ProductCarousel({
  title,
  subtitle,
  products,
  emptyHint,
  loading = false,
  variant = "default",
  showAddToCart = false,
  onAddToCart,
  onNavigate,
  hideWhenEmpty = false,
  className = "",
  lazy = true,
  locale = DEFAULT_STOREFRONT_LOCALE,
  titleColor,
  titleFontSize,
}: ProductCarouselProps) {
  const rootRef = useRef<HTMLElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [inView, setInView] = useState(!lazy)
  const [drag, setDrag] = useState<{
    active: boolean
    startX: number
    scrollLeft: number
  } | null>(null)

  const compact = variant === "compact"
  const showSkeletons = loading || (lazy && !inView)
  const titleStyle: CSSProperties = {}
  if (titleColor) titleStyle.color = titleColor
  if (titleFontSize) titleStyle.fontSize = titleFontSize
  const titleClass = `font-bold text-wf-900 ${
    titleFontSize ? "" : compact ? "text-sm" : "text-lg"
  }`
  const skeletonCount = compact ? 4 : 5

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setCanLeft(el.scrollLeft > 4)
    setCanRight(max > 4 && el.scrollLeft < max - 4)
  }, [])

  useEffect(() => {
    if (!lazy || !rootRef.current) return
    const node = rootRef.current
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [lazy])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || showSkeletons) return
    updateArrows()
    el.addEventListener("scroll", updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateArrows)
      ro.disconnect()
    }
  }, [products, showSkeletons, updateArrows])

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current
    if (!el) return
    const step = Math.max(el.clientWidth * 0.85, 160)
    el.scrollBy({ left: dir * step, behavior: "smooth" })
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      scrollByDir(-1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      scrollByDir(1)
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return
    const el = scrollerRef.current
    if (!el) return
    setDrag({ active: true, startX: e.clientX, scrollLeft: el.scrollLeft })
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag?.active || !scrollerRef.current) return
    const dx = e.clientX - drag.startX
    if (Math.abs(dx) > 4) {
      scrollerRef.current.scrollLeft = drag.scrollLeft - dx
    }
  }

  function endDrag() {
    setDrag(null)
  }

  if (hideWhenEmpty && !products.length) {
    return null
  }

  if (!loading && !products.length) {
    if (!emptyHint) return null
    return (
      <section
        ref={rootRef}
        className={`${compact ? "mt-5" : "mt-10"} ${className}`}
      >
        <h2 className={titleClass} style={titleStyle}>
          {title}
        </h2>
        {subtitle ? (
          <p className={`mt-0.5 text-wf-600 ${compact ? "text-xs" : "text-sm"}`}>
            {subtitle}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-wf-500">{emptyHint}</p>
      </section>
    )
  }

  return (
    <section
      ref={rootRef}
      className={`${compact ? "mt-3" : "mt-6"} ${className}`}
      aria-busy={showSkeletons || undefined}
    >
      <div className="mb-2">
        <h2 className={titleClass} style={titleStyle}>
          {title}
        </h2>
        {subtitle ? (
          <p className={`mt-0.5 text-wf-600 ${compact ? "text-xs" : "text-sm"}`}>
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="group/carousel relative">
        <CarouselArrow
          direction="left"
          visible={canLeft && !showSkeletons}
          onClick={() => scrollByDir(-1)}
          locale={locale}
        />
        <CarouselArrow
          direction="right"
          visible={canRight && !showSkeletons}
          onClick={() => scrollByDir(1)}
          locale={locale}
        />

        {canLeft && !showSkeletons ? (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent tablet:w-12"
            aria-hidden
          />
        ) : null}
        {canRight && !showSkeletons ? (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent tablet:w-12"
            aria-hidden
          />
        ) : null}

        <div
          ref={scrollerRef}
          role="region"
          aria-label={title}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          className={`flex touch-pan-x overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            compact ? "gap-2" : "gap-3"
          } ${drag?.active ? "cursor-grabbing select-none" : ""}`}
        >
          {showSkeletons
            ? Array.from({ length: skeletonCount }, (_, i) => (
                <SkeletonCard key={`sk-${i}`} compact={compact} />
              ))
            : products.map((product) => (
                <ProductCarouselCard
                  key={product.slug}
                  product={product}
                  variant={variant}
                  showAddToCart={showAddToCart}
                  onAddToCart={onAddToCart}
                  onNavigate={onNavigate}
                  locale={locale}
                />
              ))}
        </div>
      </div>
    </section>
  )
}

/** Studio-thumb voor cartregels e.d. — transparante PNG-stijl mockup. */
export function ProductThumbBlock({
  seed,
  title,
  className = "h-24 w-24",
}: {
  seed: string
  title: string
  className?: string
}) {
  const hue = hashHue(seed)
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg ${className}`}
      style={{ background: productStudioBackground(hue) }}
      role="img"
      aria-label={`Productafbeelding ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={productMockupSrc(seed || title)}
        alt=""
        className="h-full w-full object-contain p-1.5 drop-shadow-[0_8px_16px_rgba(15,23,42,0.1)]"
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}
