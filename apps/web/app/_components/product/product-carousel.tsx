"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { Badge, Button } from "@europmade/ui"
import {
  formatEuroFromCents,
  starsForRating,
  type ListingProduct,
} from "../../_lib/listing-products"
import { hashHue } from "../../_lib/cart-line-meta"
import { isFavorite, toggleFavorite } from "../../_lib/favorites"
import { estimateReviewCount } from "../../_lib/product-recommendations"

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
  /** Optional “In winkelwagen” on hover (desktop). */
  showAddToCart?: boolean
  onAddToCart?: (product: ListingProduct) => void
  onNavigate?: () => void
  /** Hide entire section when empty (e.g. Laatst bekeken). */
  hideWhenEmpty?: boolean
  className?: string
  /** IntersectionObserver lazy mount — default true. */
  lazy?: boolean
}

function ProductThumb({ slug, title }: { slug: string; title: string }) {
  const hue = hashHue(slug || title)
  return (
    <div
      className="aspect-square w-full overflow-hidden rounded-lg bg-wf-100"
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 28% 88%), hsl(${(hue + 40) % 360} 22% 78%))`,
      }}
      role="img"
      aria-label={`Productafbeelding ${title}`}
    />
  )
}

function CarouselArrow({
  direction,
  onClick,
  visible,
}: {
  direction: "left" | "right"
  onClick: () => void
  visible: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!visible}
      aria-label={direction === "left" ? "Vorige producten" : "Volgende producten"}
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
      className={`${cardShellClass(compact)} animate-pulse rounded-xl border border-wf-200 bg-white ${
        compact ? "p-2" : "p-2.5"
      }`}
      aria-hidden
    >
      <div className="aspect-square w-full rounded-lg bg-wf-100" />
      <div className="mt-2.5 h-3.5 w-[88%] rounded bg-wf-100" />
      <div className="mt-1.5 h-3 w-[55%] rounded bg-wf-100" />
      <div className="mt-3 h-4 w-[40%] rounded bg-wf-100" />
      <div className="mt-2 h-3 w-[70%] rounded bg-wf-100" />
    </div>
  )
}

function FavoriteButton({ slug, title }: { slug: string; title: string }) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(isFavorite(slug))
  }, [slug])

  function onToggle(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    setActive(toggleFavorite(slug))
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={
        active
          ? `${title} uit favorieten verwijderen`
          : `${title} aan favorieten toevoegen`
      }
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-base text-wf-700 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-wf-900"
    >
      <span aria-hidden>{active ? "♥" : "♡"}</span>
    </button>
  )
}

export function ProductCarouselCard({
  product,
  variant = "default",
  showAddToCart = false,
  onAddToCart,
  onNavigate,
}: {
  product: ListingProduct
  variant?: ProductCarouselVariant
  showAddToCart?: boolean
  onAddToCart?: (product: ListingProduct) => void
  onNavigate?: () => void
}) {
  const compact = variant === "compact"
  const href = `/product/${product.slug}`
  const reviews = estimateReviewCount(product)
  const fromPrice = product.offerCount > 1

  function handleAdd(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (onAddToCart) {
      onAddToCart(product)
      return
    }
    onNavigate?.()
    window.location.assign(href)
  }

  return (
    <article className={`${cardShellClass(compact)} group/card relative`}>
      <div
        className={`relative flex h-full flex-col overflow-hidden rounded-xl border border-wf-200 bg-white shadow-sm transition duration-200 group-hover/card:-translate-y-0.5 group-hover/card:border-wf-300 group-hover/card:shadow-md ${
          compact ? "p-2" : "p-2.5"
        }`}
      >
        <div className="relative">
          <ProductThumb slug={product.slug} title={product.title} />
          {product.verified ? (
            <span className="pointer-events-none absolute left-1.5 top-1.5">
              <Badge
                variant="solid"
                className="px-1.5 py-0.5 text-[9px] shadow-sm"
              >
                EU Verified™
              </Badge>
            </span>
          ) : null}
        </div>

        <h3
          className={`mt-2 line-clamp-2 font-semibold leading-snug text-wf-900 ${
            compact ? "min-h-[2.4em] text-[12px]" : "min-h-[2.5em] text-[13px]"
          }`}
        >
          {product.title}
        </h3>
        <p
          className={`mt-0.5 truncate text-wf-600 ${
            compact ? "text-[10px]" : "text-[11px]"
          }`}
        >
          {product.brand}
        </p>

        <div className="mt-auto pt-2">
          <p
            className={`font-bold text-wf-900 ${
              compact ? "text-[14px]" : "text-[15px]"
            }`}
          >
            {fromPrice ? (
              <>
                <span className="mr-1 text-[11px] font-semibold text-wf-600">
                  vanaf
                </span>
                {formatEuroFromCents(product.priceCents)}
              </>
            ) : (
              formatEuroFromCents(product.priceCents)
            )}
          </p>
          <p
            className={`mt-1 flex items-center gap-1 text-wf-600 ${
              compact ? "text-[10px]" : "text-[11px]"
            }`}
          >
            <span className="tracking-tighter text-wf-800" aria-hidden>
              {starsForRating(product.rating)}
            </span>
            <span className="font-semibold text-wf-800">
              {product.rating.toFixed(1).replace(".", ",")}
            </span>
            <span className="truncate">({reviews})</span>
          </p>
        </div>

        {/* Full-card hit target under interactive controls */}
        <Link
          href={href}
          onClick={onNavigate}
          className="absolute inset-0 z-[1] rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wf-900"
          aria-label={`${product.title} bekijken`}
        />

        <div className="absolute right-3 top-3 z-[2]">
          <FavoriteButton slug={product.slug} title={product.title} />
        </div>

        {showAddToCart && !compact ? (
          <div className="absolute inset-x-2.5 bottom-2.5 z-[2] hidden translate-y-1 opacity-0 transition duration-200 group-hover/card:translate-y-0 group-hover/card:opacity-100 desktop:block">
            <Button
              type="button"
              variant="primary"
              className="h-9 w-full text-xs shadow-md"
              onClick={handleAdd}
            >
              In winkelwagen
            </Button>
          </div>
        ) : null}
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
        <h2
          className={`font-bold text-wf-900 ${compact ? "text-sm" : "text-lg"}`}
        >
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
      className={`${compact ? "mt-5" : "mt-10"} ${className}`}
      aria-busy={showSkeletons || undefined}
    >
      <div className="mb-2.5">
        <h2
          className={`font-bold text-wf-900 ${compact ? "text-sm" : "text-lg"}`}
        >
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
        />
        <CarouselArrow
          direction="right"
          visible={canRight && !showSkeletons}
          onClick={() => scrollByDir(1)}
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
                />
              ))}
        </div>
      </div>
    </section>
  )
}

/** Gradient-thumb voor cartregels e.d. (gedeeld met drawer). */
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
      className={`shrink-0 overflow-hidden rounded-lg ${className}`}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 28% 88%), hsl(${(hue + 40) % 360} 22% 78%))`,
      }}
      role="img"
      aria-label={`Productafbeelding ${title}`}
    />
  )
}
