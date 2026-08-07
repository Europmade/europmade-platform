import Link from "next/link"
import {
  resolveBannerHref,
  resolveStorefrontAd,
  type AdPosition,
  type StorefrontAdCreative,
} from "../../_lib/storefront-ads"
import {
  bannerProductMockupDataUri,
  manufacturerLogoSrc,
  type ProductMockKind,
} from "../../_lib/product-mockup"
import { hashHue } from "../../_lib/cart-line-meta"
import { t } from "../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { DEFAULT_STOREFRONT_LOCALE } from "../../_lib/i18n/locales"

type AdSlotProps = {
  position: AdPosition
  compact?: boolean
  location?: StorefrontAdCreative["location"]
  creative?: StorefrontAdCreative | null
  locale?: StorefrontLocale
  adLabel?: string
  /** Explicit mock kind when CMS image is empty. */
  productKind?: ProductMockKind
  /** Remove outer horizontal margin (e.g. category hero column). */
  flush?: boolean
}

const BANNER_H = "min-h-[200px] h-[220px]"
const BANNER_H_COMPACT = "min-h-[150px] h-[160px]"

/**
 * CMP-033 Advertisement Banner — premium ad position (~220px; compact ~160px).
 */
export function AdSlot({
  position,
  compact = false,
  location = "homepage",
  creative,
  locale = DEFAULT_STOREFRONT_LOCALE,
  adLabel,
  productKind,
  flush = false,
}: AdSlotProps) {
  const ad = creative ?? resolveStorefrontAd({ position, location })
  const label = adLabel ?? t("advertisement", locale)
  const edge = flush ? "mx-0" : "mx-4 tablet:mx-8"
  const heightClass = compact ? BANNER_H_COMPACT : BANNER_H

  if (ad) {
    const href = resolveBannerHref(ad)
    const isExternal = ad.linkType === "external" || /^https?:\/\//i.test(href)
    const hue = hashHue(ad.id)
    const kind: ProductMockKind =
      productKind ?? (position === 1 ? "garden" : "coffee")
    const productSrc =
      ad.imageSrc && ad.imageSrc.length > 0
        ? ad.imageSrc
        : bannerProductMockupDataUri(hue, kind)
    const logoSrc =
      ad.logoSrc && ad.logoSrc.length > 0
        ? ad.logoSrc
        : manufacturerLogoSrc(position === 1 ? "verdetech" : "atelier")
    const bg =
      ad.background ??
      `linear-gradient(135deg, hsl(${hue} 16% 97%) 0%, hsl(${(hue + 18) % 360} 14% 91%) 55%, hsl(${(hue + 36) % 360} 12% 88%) 100%)`
    const showCategoryMeta =
      location === "category" ||
      Boolean(ad.productionCountryLabel) ||
      ad.showVerifiedBadge === true

    const inner = (
      <div className="relative flex h-full w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: bg }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.07) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div
          className="pointer-events-none absolute -right-8 top-[-20%] h-[140%] w-[48%] opacity-50"
          aria-hidden
          style={{
            background: `radial-gradient(ellipse at center, hsl(${hue} 30% 70% / 0.18), transparent 68%)`,
          }}
        />

        {/* LEFT */}
        <div
          className={`relative z-[1] flex h-full w-[54%] max-w-[620px] flex-col justify-center px-4 py-3 tablet:w-[50%] tablet:px-7 ${
            compact ? "py-2.5" : "py-4 tablet:px-8"
          }`}
        >
          <span className="mb-1.5 inline-flex w-fit rounded border border-wf-300/90 bg-white/95 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-wf-600">
            {label}
          </span>
          <p
            className={`font-bold leading-[1.15] tracking-tight text-wf-900 ${
              compact
                ? "text-[15px] tablet:text-[17px]"
                : "text-[18px] tablet:text-[22px]"
            }`}
          >
            {ad.headline}
          </p>
          <p
            className={`mt-1 line-clamp-2 max-w-md leading-snug text-wf-600 ${
              compact ? "text-[11.5px]" : "text-[12.5px] tablet:text-[13.5px]"
            }`}
          >
            {ad.description}
          </p>
          <span
            className={`mt-2.5 inline-flex w-fit items-center justify-center rounded-xl bg-wf-900 px-3.5 text-[12px] font-semibold text-white shadow-sm ${
              compact ? "h-8" : "mt-3.5 h-9 px-4 text-[12.5px]"
            }`}
          >
            {ad.ctaLabel}
          </span>
        </div>

        {/* RIGHT — product + partner meta (CMS) */}
        <div className="relative z-[1] flex h-full flex-1 items-center gap-2 pr-2.5 tablet:gap-3 tablet:pr-5">
          <div className="flex h-full flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productSrc}
              alt={ad.imageAlt}
              className={`object-contain drop-shadow-[0_14px_28px_rgba(15,23,42,0.14)] ${
                compact ? "max-h-[88%] max-w-[78%]" : "max-h-[90%] max-w-[82%]"
              }`}
              loading="lazy"
              decoding="async"
            />
          </div>

          {showCategoryMeta ? (
            <div className="flex w-[72px] shrink-0 flex-col items-center justify-center gap-1.5 tablet:w-[84px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt=""
                className="h-6 w-auto max-w-full object-contain drop-shadow-sm tablet:h-7"
                loading="lazy"
                decoding="async"
              />
              {ad.productionCountryLabel ? (
                <p className="text-center text-[9.5px] font-semibold leading-tight text-wf-700 tablet:text-[10px]">
                  {ad.productionCountryLabel}
                </p>
              ) : null}
              {ad.showVerifiedBadge !== false ? (
                <span className="rounded border border-wf-300/90 bg-white/95 px-1 py-0.5 text-[8.5px] font-bold tracking-wide text-wf-800">
                  {t("verifiedBadge", locale)}
                </span>
              ) : null}
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoSrc}
              alt=""
              className="absolute right-4 top-3.5 h-7 w-auto object-contain drop-shadow-sm tablet:right-7"
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
      </div>
    )

    return (
      <aside
        className={`relative overflow-hidden rounded-2xl border border-wf-200 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] ${edge} ${heightClass}`}
        aria-label={`${label}: ${ad.title}`}
        data-ad-position={position}
        data-ad-id={ad.id}
        data-ad-link-type={ad.linkType}
      >
        {isExternal ? (
          <a
            href={href}
            className="absolute inset-0 block"
            rel="sponsored noopener noreferrer"
            target="_blank"
          >
            {inner}
          </a>
        ) : (
          <Link href={href} className="absolute inset-0 block" rel="sponsored">
            {inner}
          </Link>
        )}
      </aside>
    )
  }

  return (
    <aside
      className={`relative flex items-center overflow-hidden rounded-2xl border border-dashed border-wf-400 bg-wf-100 ${edge} ${heightClass}`}
      aria-label={`${label} ${t("position", locale)} ${position}`}
      data-ad-position={position}
    >
      <div className="px-5 tablet:px-8">
        <span className="mb-2 inline-flex rounded border border-wf-300 bg-white px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-wf-600">
          {label}
        </span>
        <p className="text-[18px] font-bold text-wf-800">
          {t("adSlotAvailable", locale)}
        </p>
        <p className="mt-1 max-w-md text-[13px] text-wf-600">
          {t("position", locale)} {position} — {t("adSlotHint", locale)}
        </p>
      </div>
    </aside>
  )
}
