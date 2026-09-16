import * as React from "react"
import { cn } from "@europmade/utils"

export const AD_CAMPAIGN_DESIGNS = [
  {
    key: "design_1",
    label: "EuropMade Classic",
    bgStyle: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    textClass: "text-white",
    ctaBg: "bg-white/20",
    ctaText: "text-white",
    invertLogo: true,
  },
  {
    key: "design_2",
    label: "Fresh Green",
    bgStyle: "linear-gradient(135deg, #0d5c3e 0%, #1a8a5c 60%, #27ae60 100%)",
    textClass: "text-white",
    ctaBg: "bg-white/25",
    ctaText: "text-white",
    invertLogo: true,
  },
  {
    key: "design_3",
    label: "Warm Sunset",
    bgStyle: "linear-gradient(135deg, #c94b22 0%, #e67e22 50%, #f1c40f 100%)",
    textClass: "text-white",
    ctaBg: "bg-white/25",
    ctaText: "text-white",
    invertLogo: true,
  },
  {
    key: "design_4",
    label: "Clean White",
    bgStyle: "linear-gradient(135deg, #ffffff 0%, #f5f6fa 50%, #ecf0f1 100%)",
    textClass: "text-neutral-900",
    ctaBg: "bg-neutral-800",
    ctaText: "text-white",
    invertLogo: false,
  },
  {
    key: "design_5",
    label: "Royal Blue",
    bgStyle: "linear-gradient(135deg, #1e3a5f 0%, #2980b9 60%, #3498db 100%)",
    textClass: "text-white",
    ctaBg: "bg-white/20",
    ctaText: "text-white",
    invertLogo: true,
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
  headlineFallback?: string
  sublineFallback?: string
  className?: string
  minHeight?: number
}

/**
 * Shared campaign banner — Seller preview, Admin Review, public landing.
 */
export function AdCampaignBanner({
  designKey,
  headline,
  subline,
  ctaLabel,
  imageUrl,
  logoUrl,
  headlineFallback = "Headline",
  sublineFallback = "Subline",
  className,
  minHeight = 180,
}: AdCampaignBannerProps) {
  const design = resolveAdCampaignDesign(designKey)
  const title = (headline || "").trim() || headlineFallback
  const subtitle = (subline || "").trim() || sublineFallback

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        design.textClass,
        className
      )}
      style={{
        background: design.bgStyle,
        aspectRatio: "4 / 1",
        minHeight,
      }}
    >
      <div className="absolute inset-0 flex items-center">
        {imageUrl ? (
          <div className="absolute right-4 top-1/2 flex h-[85%] w-[30%] -translate-y-1/2 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="max-h-full max-w-full object-contain drop-shadow-lg"
            />
          </div>
        ) : null}

        <div
          className="relative z-10 flex flex-col justify-center px-8 py-6"
          style={{ maxWidth: imageUrl ? "62%" : "80%" }}
        >
          {logoUrl ? (
            <div className="mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt=""
                className="h-8 w-auto max-w-[120px] object-contain"
                style={{
                  filter: design.invertLogo ? "brightness(0) invert(1)" : "none",
                }}
              />
            </div>
          ) : null}
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight">
            {title}
          </h2>
          <p className="mt-1.5 text-sm leading-snug opacity-85">{subtitle}</p>
          <div className="mt-4">
            <span
              className={cn(
                "inline-block rounded-lg px-5 py-2 text-sm font-bold shadow-sm backdrop-blur-sm",
                design.ctaBg,
                design.ctaText
              )}
            >
              {ctaLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
