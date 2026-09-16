"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { PdpGallerySlide } from "../../_lib/pdp-seed"
import { hashHue } from "../../_lib/cart-line-meta"

type ProductGalleryProps = {
  title: string
  seed: string
  count: number
  images?: string[]
  slides?: PdpGallerySlide[]
  thumbnailPosition?: "left" | "under"
  thumbnailCount?: number
  visible?: boolean
}

/** Min horizontal movement (px) before treating a gesture as an image swipe. */
export const GALLERY_SWIPE_MIN_DISTANCE = 48

/**
 * Resolve a touch/pointer gesture into a gallery step.
 * - swipe left (dx < 0) → next
 * - swipe right (dx > 0) → prev
 * - too small / mostly vertical → null (keep page scroll)
 */
export function resolveGallerySwipe(
  dx: number,
  dy: number,
  minDistance: number = GALLERY_SWIPE_MIN_DISTANCE
): "next" | "prev" | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null
  if (Math.abs(dx) < minDistance) return null
  if (Math.abs(dx) < Math.abs(dy) * 1.25) return null
  return dx < 0 ? "next" : "prev"
}

function slideGradient(seed: string, index: number) {
  const hue = (hashHue(seed) + index * 28) % 360
  return `linear-gradient(145deg, hsl(${hue} 32% 90%), hsl(${(hue + 48) % 360} 26% 72%))`
}

function normalizeSlides(
  slides: PdpGallerySlide[] | undefined,
  images: string[] | undefined,
  count: number
): PdpGallerySlide[] {
  if (slides && slides.length > 0) return slides
  const urls = (images ?? []).filter(Boolean)
  if (urls.length > 0) {
    return urls.map((url, i) => ({
      kind: "image" as const,
      url,
      isPrimary: i === 0,
      loading: i === 0 ? ("eager" as const) : ("lazy" as const),
    }))
  }
  return Array.from({ length: Math.min(Math.max(count, 1), 6) }).map(() => ({
    kind: "image" as const,
    url: "",
    loading: "lazy" as const,
  }))
}

/** Keep primary image when CMS thumbnailCount would otherwise slice it away. */
function applyThumbnailLimit(
  all: PdpGallerySlide[],
  thumbnailCount?: number
): PdpGallerySlide[] {
  if (
    thumbnailCount == null ||
    !Number.isFinite(thumbnailCount) ||
    thumbnailCount <= 0
  ) {
    return all
  }
  const limit = Math.floor(thumbnailCount)
  if (all.length <= limit) return all

  const primaryIdx = all.findIndex(
    (slide) => slide.kind === "image" && slide.isPrimary
  )
  if (primaryIdx < 0) return all.slice(0, limit)
  if (primaryIdx < limit) return all.slice(0, limit)

  const primary = all[primaryIdx]!
  const withoutPrimary = all.filter((_, i) => i !== primaryIdx)
  return [primary, ...withoutPrimary].slice(0, limit)
}

function GalleryImage({
  slide,
  title,
  className,
}: {
  slide: Extract<PdpGallerySlide, { kind: "image" }>
  title: string
  className?: string
}) {
  const avifSrcSet = slide.avifSrcSet
  const webpSrcSet = slide.srcSet

  if (avifSrcSet || webpSrcSet) {
    return (
      <picture className={className}>
        {avifSrcSet ? <source srcSet={avifSrcSet} type="image/avif" /> : null}
        {webpSrcSet ? <source srcSet={webpSrcSet} type="image/webp" /> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.url}
          alt={title}
          loading={slide.loading ?? "lazy"}
          decoding="async"
          className="h-full w-full object-contain"
        />
      </picture>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.url}
      srcSet={slide.srcSet ?? undefined}
      sizes="(min-width: 1024px) 50vw, 100vw"
      alt={title}
      loading={slide.loading ?? "lazy"}
      decoding="async"
      className={className ?? "h-full w-full object-contain"}
    />
  )
}

export function ProductGallery({
  title,
  seed,
  count,
  images,
  slides: slidesProp,
  thumbnailPosition = "left",
  thumbnailCount,
  visible = true,
}: ProductGalleryProps) {
  const slides = useMemo(() => {
    const all = normalizeSlides(slidesProp, images, count)
    return applyThumbnailLimit(all, thumbnailCount)
  }, [slidesProp, images, count, thumbnailCount])

  const primaryIndex = useMemo(() => {
    const idx = slides.findIndex(
      (slide) => slide.kind === "image" && slide.isPrimary
    )
    return idx >= 0 ? idx : 0
  }, [slides])

  const slots = slides.length
  const [active, setActive] = useState(primaryIndex)
  const [zooming, setZooming] = useState(false)
  const [origin, setOrigin] = useState("50% 50%")
  const [lightbox, setLightbox] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const didSwipeRef = useRef(false)

  useEffect(() => {
    setActive(primaryIndex)
  }, [primaryIndex])

  const activeSlide = slides[active] ?? slides[0]
  const under = thumbnailPosition === "under"

  function stepFromSwipe(direction: "next" | "prev") {
    setActive((a) => {
      if (direction === "next") return Math.min(slots - 1, a + 1)
      return Math.max(0, a - 1)
    })
  }

  function onMainTouchStart(e: React.TouchEvent) {
    const t = e.changedTouches[0]
    if (!t) return
    touchStartRef.current = { x: t.clientX, y: t.clientY }
    didSwipeRef.current = false
  }

  function onMainTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current
    const t = e.changedTouches[0]
    touchStartRef.current = null
    if (!start || !t || slots <= 1) return
    const direction = resolveGallerySwipe(
      t.clientX - start.x,
      t.clientY - start.y
    )
    if (!direction) return
    didSwipeRef.current = true
    stepFromSwipe(direction)
  }

  useEffect(() => {
    if (!lightbox) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false)
      if (e.key === "ArrowRight") setActive((a) => (a + 1) % slots)
      if (e.key === "ArrowLeft") setActive((a) => (a - 1 + slots) % slots)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox, slots])

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setOrigin(`${x}% ${y}%`)
  }

  function renderThumb(i: number) {
    const slide = slides[i]
    const isActive = active === i
    if (!slide) return null

    if (slide.kind === "video") {
      return (
        <button
          key={i}
          type="button"
          onClick={() => setActive(i)}
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 text-[10px] font-bold transition ${
            isActive
              ? "border-wf-900 bg-wf-900 text-white shadow-sm"
              : "border-wf-200 bg-wf-100 text-wf-700 hover:border-wf-400"
          }`}
          aria-label={`Video ${i + 1}`}
          aria-pressed={isActive}
        >
          ▶
        </button>
      )
    }

    if (slide.url) {
      return (
        <button
          key={i}
          type="button"
          onClick={() => setActive(i)}
          className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-wf-50 transition ${
            isActive
              ? "border-wf-900 shadow-sm"
              : "border-wf-200 hover:border-wf-400"
          }`}
          aria-label={`Miniatuur ${i + 1}`}
          aria-pressed={isActive}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </button>
      )
    }

    return (
      <button
        key={i}
        type="button"
        onClick={() => setActive(i)}
        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
          isActive
            ? "border-wf-900 shadow-sm"
            : "border-wf-200 hover:border-wf-400"
        }`}
        style={{ background: slideGradient(seed, i) }}
        aria-label={`Miniatuur ${i + 1}`}
        aria-pressed={isActive}
      />
    )
  }

  function renderMain() {
    if (!activeSlide) return null

    if (activeSlide.kind === "video") {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black p-2">
          <iframe
            src={activeSlide.embedUrl}
            title={`${title} video`}
            className="aspect-video h-full max-h-full w-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    }

    if (activeSlide.url) {
      return (
        <div className="absolute inset-0 p-4">
          <GalleryImage
            slide={activeSlide}
            title={title}
            className="h-full w-full object-contain"
          />
        </div>
      )
    }

    return (
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          background: slideGradient(seed, active),
          transform: zooming ? "scale(1.35)" : "scale(1)",
          transformOrigin: origin,
        }}
        aria-hidden
      />
    )
  }

  const canLightbox =
    activeSlide?.kind === "image" && Boolean(activeSlide.url)

  if (visible === false) return null

  const thumbsRow = (
    <div
      className={`flex flex-wrap gap-2 ${
        under ? "justify-center" : "justify-start"
      }`}
      role="list"
      aria-label="Productminiaturen"
    >
      {Array.from({ length: slots }).map((_, i) => renderThumb(i))}
    </div>
  )

  const mainButton = (
    <button
      type="button"
      className="group relative aspect-square w-full max-h-[460px] touch-pan-y overflow-hidden rounded-2xl border border-wf-200 bg-wf-50 shadow-sm desktop:max-h-[400px] desktop:flex-1"
      style={{
        cursor: canLightbox ? (zooming ? "zoom-out" : "zoom-in") : "default",
      }}
      aria-label={`Hoofdafbeelding ${title} — swipe voor meer, klik voor fullscreen`}
      onClick={() => {
        if (didSwipeRef.current) {
          didSwipeRef.current = false
          return
        }
        if (canLightbox) setLightbox(true)
      }}
      onTouchStart={onMainTouchStart}
      onTouchEnd={onMainTouchEnd}
      onTouchCancel={() => {
        touchStartRef.current = null
      }}
      onMouseEnter={() => setZooming(true)}
      onMouseLeave={() => setZooming(false)}
      onMouseMove={onMove}
    >
      {renderMain()}
      {canLightbox ? (
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
          Vergroten
        </span>
      ) : null}
    </button>
  )

  return (
    <>
      {under ? (
        <div className="flex flex-col gap-2.5">
          {mainButton}
          {thumbsRow}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 desktop:flex-row desktop:items-start desktop:gap-3">
          {/* Mobile dots */}
          <div
            className="order-2 flex justify-center gap-1.5 tablet:hidden"
            aria-hidden
          >
            {Array.from({ length: slots }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition ${
                  i === active ? "w-4 bg-wf-800" : "w-1.5 bg-wf-300"
                }`}
                aria-label={`Afbeelding ${i + 1}`}
              />
            ))}
          </div>

          {/* Desktop: thumbs left of main */}
          <div className="hidden shrink-0 flex-col gap-2 desktop:flex">
            {Array.from({ length: slots }).map((_, i) => renderThumb(i))}
          </div>

          <div className="order-1 min-w-0 flex-1 desktop:order-none">
            {mainButton}
          </div>

          {/* Tablet: thumbs under main */}
          <div className="order-3 hidden tablet:block desktop:hidden">
            {thumbsRow}
          </div>
        </div>
      )}

      {lightbox && activeSlide?.kind === "image" && activeSlide.url ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-out"
            aria-label="Sluit fullscreen"
            onClick={() => setLightbox(false)}
          />
          <div className="relative z-10 w-full max-w-3xl">
            <div className="aspect-square w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
              <GalleryImage
                slide={activeSlide}
                title={title}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-wf-900"
                onClick={() => setActive((a) => (a - 1 + slots) % slots)}
              >
                ‹ Vorige
              </button>
              <p className="text-sm text-white">
                {active + 1} / {slots}
              </p>
              <button
                type="button"
                className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-wf-900"
                onClick={() => setActive((a) => (a + 1) % slots)}
              >
                Volgende ›
              </button>
            </div>
            <button
              type="button"
              className="absolute -right-1 -top-10 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-wf-900"
              onClick={() => setLightbox(false)}
            >
              Sluiten
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
