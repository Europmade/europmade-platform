import type { HTMLAttributes, ReactNode } from "react"
import { AdCampaignBanner } from "@europmade/ui"
import {
  HOMEPAGE_BANNER_FRAME_CLASS,
  HOMEPAGE_BANNER_SLOT_CLASS,
  HOMEPAGE_CONTENT_GUTTER,
  parseSellerBannerPresentation,
} from "@europmade/utils"
import Link from "next/link"
import {
  resolveBannerHref,
  resolveStorefrontAd,
  type AdPosition,
  type StorefrontAdCreative,
} from "../../_lib/storefront-ads"
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
  productKind?: string
  /** Remove outer horizontal margin (e.g. category hero column). */
  flush?: boolean
}

const BANNER_RATIO = { aspectRatio: "4 / 1" } as const

function AdFrame({
  flush,
  matchCampaignCard,
  className,
  children,
  ...rest
}: {
  flush: boolean
  matchCampaignCard: boolean
  className: string
  children: ReactNode
} & HTMLAttributes<HTMLElement>) {
  return (
    <div
      className={
        flush
          ? "w-full min-w-0 self-stretch"
          : `${matchCampaignCard ? `${HOMEPAGE_BANNER_SLOT_CLASS} ` : ""}w-full min-w-0 self-stretch ${HOMEPAGE_CONTENT_GUTTER}`
      }
    >
      <aside
        className={`relative block w-full max-w-none overflow-hidden ${
          matchCampaignCard ? `${HOMEPAGE_BANNER_FRAME_CLASS} ` : ""
        }${className}`}
        style={matchCampaignCard ? undefined : BANNER_RATIO}
        {...rest}
      >
        {children}
      </aside>
    </div>
  )
}

/**
 * Advertisement banner. A 2400×600 creative is 4:1 and fills the content width.
 * object-fit is cover or contain, never stretched.
 */
export function AdSlot({
  position,
  compact = false,
  location = "homepage",
  creative,
  locale = DEFAULT_STOREFRONT_LOCALE,
  adLabel,
  productKind: _productKind,
  flush = false,
}: AdSlotProps) {
  const matchCampaignCard = location === "homepage" && !compact && !flush
  // `undefined` = legacy callers without CMS. Explicit `null` = no live banner (no mock ads).
  const ad =
    creative === undefined
      ? resolveStorefrontAd({ position, location })
      : creative
  const label = adLabel ?? t("advertisement", locale)

  if (ad) {
    const href = resolveBannerHref(ad)
    const isExternal = ad.linkType === "external" || /^https?:\/\//i.test(href)
    if (ad.source === "seller") {
      const [xRaw, yRaw] = (ad.imagePosition || "50% 50%").split("%")
      const presentation = parseSellerBannerPresentation({
        imagePositionX: Number(xRaw),
        imagePositionY: Number(yRaw),
        overlayAlign: ad.overlayAlign,
        textColor: ad.textColor,
        logoScale: ad.logoScale,
      })
      const sellerInner = (
        <AdCampaignBanner
          fill
          designKey={ad.designKey}
          headline={ad.headline}
          subline={ad.description}
          ctaLabel={ad.ctaLabel}
          imageUrl={ad.imageSrc}
          logoUrl={ad.logoSrc}
          presentation={presentation}
          className="h-full rounded-none"
          previewLabel={ad.previewOnly ? "Preview" : null}
        />
      )
      return (
        <AdFrame
          flush={flush}
          matchCampaignCard={matchCampaignCard}
          className="rounded-2xl border border-wf-200 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
          aria-label={`${label}: ${ad.title}`}
          data-ad-position={position}
          data-ad-id={ad.id}
          data-ad-source="seller"
          data-ad-preview={ad.previewOnly ? "true" : "false"}
        >
          {isExternal ? (
            <a
              href={href}
              className="absolute inset-0 block"
              rel="sponsored noopener noreferrer"
              target="_blank"
            >
              {sellerInner}
            </a>
          ) : (
            <Link href={href} className="absolute inset-0 block" rel="sponsored">
              {sellerInner}
            </Link>
          )}
        </AdFrame>
      )
    }
    const hue = hashHue(ad.id)
    const productSrc =
      ad.imageSrc && ad.imageSrc.length > 0 ? ad.imageSrc : null
    const logoSrc =
      ad.logoSrc && ad.logoSrc.length > 0 ? ad.logoSrc : null
    const bg =
      ad.background ??
      `linear-gradient(135deg, hsl(${hue} 16% 97%) 0%, hsl(${(hue + 18) % 360} 14% 91%) 55%, hsl(${(hue + 36) % 360} 12% 88%) 100%)`
    const showCategoryMeta =
      location === "category" ||
      Boolean(ad.productionCountryLabel) ||
      ad.showVerifiedBadge === true

    const textOnImage = ad.textColor
      ? ad.textColor === "white"
      : Boolean(productSrc)
    const buttonOnImage = ad.buttonColor
      ? ad.buttonColor === "white"
      : textOnImage
    const imageFit = ad.imageFit === "contain" ? "contain" : "cover"
    const imagePosition = ad.imagePosition || "50% 50%"
    const imageScale =
      ad.imageScale && ad.imageScale > 1 ? Math.min(2, ad.imageScale) : 1

    const content = (
      <>
        <span
          className={`mb-1.5 inline-flex w-fit rounded border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide ${
            textOnImage
              ? "border-white/40 bg-black/35 text-white"
              : "border-wf-300/90 bg-white/95 text-wf-600"
          }`}
        >
          {label}
        </span>
        <p
          className={`font-bold leading-[1.15] tracking-tight ${
            textOnImage ? "text-white" : "text-wf-900"
          } ${
            compact
              ? "text-[15px] tablet:text-[17px]"
              : "text-[18px] tablet:text-[22px]"
          }`}
        >
          {ad.headline}
        </p>
        <p
          className={`mt-1 line-clamp-2 max-w-md leading-snug ${
            textOnImage ? "text-white/90" : "text-wf-600"
          } ${compact ? "text-[11.5px]" : "text-[12.5px] tablet:text-[13.5px]"}`}
        >
          {ad.description}
        </p>
        <span
          className={`mt-2.5 inline-flex w-fit items-center justify-center rounded-xl px-3.5 text-[12px] font-semibold shadow-sm ${
            buttonOnImage
              ? "bg-white text-wf-900"
              : "bg-wf-900 text-white"
          } ${compact ? "h-8" : "mt-3.5 h-9 px-4 text-[12.5px]"}`}
        >
          {ad.ctaLabel}
        </span>
      </>
    )

    const inner = productSrc ? (
      <div className="relative flex h-full w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productSrc}
          alt={ad.imageAlt || ad.headline}
          className="absolute inset-0 h-full w-full"
          style={{
            objectFit: imageFit,
            objectPosition: imagePosition,
            transform: `scale(${imageScale})`,
            transformOrigin: imagePosition,
          }}
        />
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.45) 48%, rgba(15,23,42,0.2) 100%)",
          }}
        />
        <div
          className={`relative z-[1] flex h-full w-full flex-col justify-center px-4 py-3 tablet:px-7 ${
            compact ? "py-2.5" : "py-4 tablet:px-8"
          }`}
        >
          {content}
        </div>
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            className="absolute right-4 top-3.5 z-[2] h-7 w-auto object-contain drop-shadow-sm tablet:right-7"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        {showCategoryMeta && ad.productionCountryLabel ? (
          <p className="absolute bottom-3 right-4 z-[2] rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {ad.productionCountryLabel}
          </p>
        ) : null}
      </div>
    ) : (
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
          className={`relative z-[1] flex h-full w-full max-w-[720px] flex-col justify-center px-4 py-3 tablet:px-7 ${
            compact ? "py-2.5" : "py-4 tablet:px-8"
          }`}
        >
          {content}
        </div>
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            className="absolute right-4 top-3.5 z-[2] h-7 w-auto object-contain drop-shadow-sm tablet:right-7"
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </div>
    )

    return (
      <AdFrame
        flush={flush}
        matchCampaignCard={matchCampaignCard}
        className="rounded-2xl border border-wf-200 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
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
      </AdFrame>
    )
  }

  return (
    <AdFrame
      flush={flush}
      matchCampaignCard={matchCampaignCard}
      className="rounded-2xl border border-dashed border-wf-400 bg-wf-100"
      aria-label={`${label} ${t("position", locale)} ${position}`}
      data-ad-position={position}
    >
      <div className="absolute inset-0 flex items-center px-5 tablet:px-8">
        <div>
          <span className="mb-2 inline-flex rounded border border-wf-300 bg-white px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-wf-600">
            {label}
          </span>
          <p className="text-[18px] font-bold text-wf-800">
            Geen actieve banner
          </p>
          <p className="mt-1 max-w-md text-[13px] text-wf-600">
            {t("position", locale)} {position} — {t("adSlotHint", locale)}
          </p>
        </div>
      </div>
    </AdFrame>
  )
}
