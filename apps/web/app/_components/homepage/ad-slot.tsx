type AdSlotProps = {
  position: 1 | 2
  /** Wireframe-hoogte: positie 1 hoger dan positie 2. */
  compact?: boolean
}

/**
 * CMP-033 Advertisement Banner Slot — leeg gelabeld slot (wireframe).
 * Advertentieplatform-API bestaat nog niet; slot is verkoopbare ruimte-placeholder
 * zoals in het bevroren wireframe (gestreept + label "Advertentie").
 */
export function AdSlot({ position, compact = false }: AdSlotProps) {
  const height =
    position === 1
      ? compact
        ? "h-[72px] tablet:h-[100px]"
        : "h-[100px] tablet:h-[120px]"
      : compact
        ? "h-14 tablet:h-[72px]"
        : "h-14 tablet:h-[90px]"

  const content =
    position === 1
      ? "Advertentiebanner — positie 1 (Homepage Slider), verkoopbare ruimte per land/week"
      : "Advertentiebanner — positie 2 (lagere waarde/prijs)"

  return (
    <aside
      className={`relative mx-4 flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-wf-500 bg-[repeating-linear-gradient(45deg,var(--wf-100),var(--wf-100)_8px,#fff_8px,#fff_16px)] tablet:mx-8 ${height}`}
      aria-label={`Advertentieruimte positie ${position}`}
      data-ad-position={position}
    >
      <span className="absolute left-3 top-2 rounded border border-wf-400 bg-white px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-wf-600">
        Advertentie
      </span>
      {/* Geen live advertentielink → geen rel="sponsored" tot Ad-API bestaat */}
      <p className="max-w-[90%] px-4 text-center text-xs text-wf-500">{content}</p>
    </aside>
  )
}
