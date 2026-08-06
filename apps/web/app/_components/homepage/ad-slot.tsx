import Link from "next/link"
import {
  resolveBannerHref,
  resolveStorefrontAd,
  type AdPosition,
  type StorefrontAdCreative,
} from "../../_lib/storefront-ads"

type AdSlotProps = {
  position: AdPosition
  /** Wireframe-hoogte: positie 1 hoger dan positie 2. */
  compact?: boolean
  location?: StorefrontAdCreative["location"]
}

/**
 * CMP-033 Advertisement Banner Slot.
 * Links: product | categorie | partner | collectie | externe URL.
 */
export function AdSlot({
  position,
  compact = false,
  location = "homepage",
}: AdSlotProps) {
  const ad = resolveStorefrontAd({ position, location })
  const height =
    position === 1
      ? compact
        ? "h-[72px] tablet:h-[100px]"
        : "h-[100px] tablet:h-[120px]"
      : compact
        ? "h-14 tablet:h-[72px]"
        : "h-14 tablet:h-[90px]"

  if (ad) {
    const href = resolveBannerHref(ad)
    const isExternal = ad.linkType === "external" || /^https?:\/\//i.test(href)
    return (
      <aside
        className={`relative mx-4 overflow-hidden rounded-xl border border-wf-300 shadow-sm tablet:mx-8 ${height}`}
        aria-label={`Advertentie: ${ad.title}`}
        data-ad-position={position}
        data-ad-id={ad.id}
        data-ad-link-type={ad.linkType}
      >
        <span className="absolute left-3 top-2 z-10 rounded border border-wf-400 bg-white/95 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-wf-600">
          Advertentie
        </span>
        {isExternal ? (
          <a
            href={href}
            className="block h-full w-full"
            rel="sponsored noopener noreferrer"
            target="_blank"
            aria-label={ad.imageAlt}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.imageSrc}
              alt={ad.imageAlt}
              className="h-full w-full object-cover"
            />
          </a>
        ) : (
          <Link
            href={href}
            className="block h-full w-full"
            rel="sponsored"
            aria-label={ad.imageAlt}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.imageSrc}
              alt={ad.imageAlt}
              className="h-full w-full object-cover"
            />
          </Link>
        )}
      </aside>
    )
  }

  const content =
    position === 1
      ? "Advertentiebanner — positie 1, beschikbaar voor partners"
      : "Advertentiebanner — positie 2, beschikbaar voor partners"

  return (
    <aside
      className={`relative mx-4 flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-wf-500 bg-[repeating-linear-gradient(45deg,var(--wf-100),var(--wf-100)_8px,#fff_8px,#fff_16px)] tablet:mx-8 ${height}`}
      aria-label={`Advertentieruimte positie ${position}`}
      data-ad-position={position}
    >
      <span className="absolute left-3 top-2 rounded border border-wf-400 bg-white px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-wf-600">
        Advertentie
      </span>
      <p className="max-w-[90%] px-4 text-center text-xs text-wf-500">{content}</p>
    </aside>
  )
}
