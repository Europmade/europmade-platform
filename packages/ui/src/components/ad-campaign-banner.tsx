import * as React from "react"
import {
  cn,
  sellerBannerImageStyle,
  sellerLogoFrame,
  type SellerBannerPresentation,
} from "@europmade/utils"

export const AD_CAMPAIGN_DESIGNS = [
  {
    key: "design_1",
    label: "EuropMade Classic",
    bgStyle: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    textClass: "text-white",
    ctaBg: "bg-white/20",
    ctaText: "text-white",
  },
  {
    key: "design_2",
    label: "Fresh Green",
    bgStyle: "linear-gradient(135deg, #0d5c3e 0%, #1a8a5c 60%, #27ae60 100%)",
    textClass: "text-white",
    ctaBg: "bg-white/25",
    ctaText: "text-white",
  },
  {
    key: "design_3",
    label: "Warm Sunset",
    bgStyle: "linear-gradient(135deg, #c94b22 0%, #e67e22 50%, #f1c40f 100%)",
    textClass: "text-white",
    ctaBg: "bg-white/25",
    ctaText: "text-white",
  },
  {
    key: "design_4",
    label: "Clean White",
    bgStyle: "linear-gradient(135deg, #ffffff 0%, #f5f6fa 50%, #ecf0f1 100%)",
    textClass: "text-neutral-900",
    ctaBg: "bg-neutral-800",
    ctaText: "text-white",
  },
  {
    key: "design_5",
    label: "Royal Blue",
    bgStyle: "linear-gradient(135deg, #1e3a5f 0%, #2980b9 60%, #3498db 100%)",
    textClass: "text-white",
    ctaBg: "bg-white/20",
    ctaText: "text-white",
  },
] as const

export type AdCampaignDesignKey = (typeof AD_CAMPAIGN_DESIGNS)[number]["key"]

export function resolveAdCampaignDesign(designKey?: string | null) {
  return (
    AD_CAMPAIGN_DESIGNS.find((d) => d.key === designKey) ?? AD_CAMPAIGN_DESIGNS[0]
  )
}

export type AdCampaignBannerProps = {
  designKey?: string | null
  headline?: string | null
  subline?: string | null
  ctaLabel: string
  imageUrl?: string | null
  logoUrl?: string | null
  presentation?: SellerBannerPresentation | null
  headlineFallback?: string
  sublineFallback?: string
  className?: string
  minHeight?: number
  /** Fill a parent frame instead of forcing the 4:1 box. */
  fill?: boolean
  previewLabel?: string | null
}

/**
 * Shared campaign banner — Seller preview, Admin review, public landing, storefront.
 * An uploaded image is the full-bleed background. The logo stays a separate overlay.
 */
export function AdCampaignBanner({
  designKey,
  headline,
  subline,
  ctaLabel,
  imageUrl,
  logoUrl,
  presentation,
  headlineFallback = "Headline",
  sublineFallback = "Subline",
  className,
  minHeight = 148,
  fill = false,
  previewLabel,
}: AdCampaignBannerProps) {
  const design = resolveAdCampaignDesign(designKey)
  const title = (headline || "").trim() || headlineFallback
  const subtitle = (subline || "").trim() || sublineFallback
  const align = presentation?.overlayAlign === "right" ? "right" : "left"
  const textColor =
    presentation?.textColor ?? (design.textClass === "text-white" ? "white" : "black")
  const lightText = textColor === "white"
  const imageStyle = presentation
    ? sellerBannerImageStyle(presentation)
    : sellerBannerImageStyle({
        imagePositionX: 50,
        imagePositionY: 50,
        overlayAlign: "left",
        textColor: "white",
        logoScale: 1,
      })
  const logo = sellerLogoFrame(presentation?.logoScale ?? 1)
  const scrim = lightText
    ? align === "left"
      ? "linear-gradient(90deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.18) 72%, rgba(15,23,42,0) 100%)"
      : "linear-gradient(270deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.18) 72%, rgba(15,23,42,0) 100%)"
    : align === "left"
      ? "linear-gradient(90deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.28) 72%, rgba(255,255,255,0) 100%)"
      : "linear-gradient(270deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.28) 72%, rgba(255,255,255,0) 100%)"

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl", className)}
      style={{
        background: imageUrl ? "#0f172a" : design.bgStyle,
        aspectRatio: fill ? undefined : "4 / 1",
        minHeight: fill ? undefined : minHeight,
        height: fill ? "100%" : undefined,
      }}
      data-banner-layout="cover"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full"
          style={imageStyle}
        />
      ) : null}
      <div
        className={cn(
          "absolute inset-y-0 z-[1] w-[68%] tablet:w-1/4",
          align === "right" ? "right-0" : "left-0"
        )}
        style={{ background: scrim }}
        aria-hidden
      />
      <div
        className={cn(
          "absolute inset-y-0 z-[2] flex w-[68%] flex-col justify-center py-2 tablet:w-1/4 tablet:py-3",
          align === "right"
            ? "right-0 items-end pl-3 pr-5 text-right tablet:pr-10 desktop:pr-12"
            : "left-0 items-start pl-5 pr-3 text-left tablet:pl-10 desktop:pl-12",
          lightText ? "text-white" : "text-neutral-900"
        )}
        data-banner-align={align}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="mb-1.5 w-auto bg-transparent object-contain"
            style={{
              height: logo.height,
              maxWidth: logo.maxWidth,
              objectFit: logo.objectFit,
            }}
          />
        ) : null}
        <h2 className="text-sm font-extrabold leading-tight tracking-tight tablet:text-xl">
          {title}
        </h2>
        <p className={cn("mt-0.5 line-clamp-2 text-[11px] leading-snug tablet:text-xs", lightText ? "text-white/90" : "text-neutral-700")}>
          {subtitle}
        </p>
        <span
          className={cn(
            "mt-2 inline-block rounded-md px-2.5 py-1 text-[11px] font-bold tablet:text-xs",
            lightText ? "bg-white text-neutral-900" : "bg-neutral-900 text-white"
          )}
        >
          {ctaLabel}
        </span>
      </div>
      {previewLabel ? (
        <span className="absolute right-2 top-2 z-[3] rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-900">
          {previewLabel}
        </span>
      ) : null}
    </div>
  )
}
