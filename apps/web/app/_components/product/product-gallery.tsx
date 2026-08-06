"use client"

import { useEffect, useState } from "react"
import { hashHue } from "../../_lib/cart-line-meta"

type ProductGalleryProps = {
  title: string
  seed: string
  count: number
}

function slideGradient(seed: string, index: number) {
  const hue = (hashHue(seed) + index * 28) % 360
  return `linear-gradient(145deg, hsl(${hue} 32% 90%), hsl(${(hue + 48) % 360} 26% 72%))`
}

export function ProductGallery({ title, seed, count }: ProductGalleryProps) {
  const slots = Math.min(Math.max(count, 1), 6)
  const [active, setActive] = useState(0)
  const [zooming, setZooming] = useState(false)
  const [origin, setOrigin] = useState("50% 50%")
  const [lightbox, setLightbox] = useState(false)

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

  return (
    <>
      <div className="flex flex-col gap-2.5 desktop:flex-row desktop:items-start desktop:gap-3">
        <div className="order-2 flex justify-center gap-1.5 tablet:hidden" aria-hidden>
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

        <div className="order-1 hidden shrink-0 flex-col gap-2 desktop:order-none desktop:flex">
          {Array.from({ length: slots }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                active === i
                  ? "border-wf-900 shadow-sm"
                  : "border-wf-200 hover:border-wf-400"
              }`}
              style={{ background: slideGradient(seed, i) }}
              aria-label={`Miniatuur ${i + 1}`}
              aria-pressed={active === i}
            />
          ))}
        </div>

        <button
          type="button"
          className="group relative aspect-square w-full max-h-[460px] overflow-hidden rounded-2xl border border-wf-200 bg-wf-50 shadow-sm desktop:max-h-[400px] desktop:flex-1"
          style={{ cursor: zooming ? "zoom-out" : "zoom-in" }}
          aria-label={`Hoofdafbeelding ${title} — klik voor fullscreen`}
          onClick={() => setLightbox(true)}
          onMouseEnter={() => setZooming(true)}
          onMouseLeave={() => setZooming(false)}
          onMouseMove={onMove}
        >
          <div
            className="absolute inset-0 transition-transform duration-300 ease-out"
            style={{
              background: slideGradient(seed, active),
              transform: zooming ? "scale(1.35)" : "scale(1)",
              transformOrigin: origin,
            }}
            aria-hidden
          />
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
            Vergroten
          </span>
        </button>

        <div className="order-3 hidden gap-2 tablet:flex desktop:hidden">
          {Array.from({ length: slots }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                active === i
                  ? "border-wf-900 shadow-sm"
                  : "border-wf-200 hover:border-wf-400"
              }`}
              style={{ background: slideGradient(seed, i) }}
              aria-label={`Miniatuur ${i + 1}`}
              aria-pressed={active === i}
            />
          ))}
        </div>
      </div>

      {lightbox ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-out"
            aria-label="Sluit fullscreen"
            onClick={() => setLightbox(false)}
          />
          <div className="relative z-10 w-full max-w-3xl">
            <div
              className="aspect-square w-full rounded-2xl shadow-2xl transition"
              style={{ background: slideGradient(seed, active) }}
              role="img"
              aria-label={`${title} fullscreen`}
            />
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
