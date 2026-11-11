"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import {
  chooseCategoryPlacementAd,
  selectCategoryBrandBanner,
  type CategoryBannerScene,
  type CategoryBrandBanner,
} from "@europmade/utils"
import { CTA_LABELS_NL } from "../../_lib/advertising-public"
import type { LiveAdSlot } from "../../_lib/advertising-live-slots"
import type { ListingProduct } from "../../_lib/listing-products"

type Props = {
  campaign: LiveAdSlot | null
  products: ListingProduct[]
  categoryName?: string
  slug: string
  preview?: boolean
}

const SCENES: Record<CategoryBannerScene, { src: string; position: string; alt: string }> = {
  kitchen: {
    src: "/category/atmosphere/kitchen-builtin.jpg",
    position: "72% 62%",
    alt: "",
  },
  laundry: {
    src: "/category/atmosphere/laundry-room.jpg",
    position: "78% 42%",
    alt: "",
  },
}

/**
 * One banner under the USP bar.
 * Below the tablet breakpoint the ratio matches a stacked homepage header banner.
 * From 834px the height matches one homepage header banner, so this full-width
 * strip does not grow taller than that banner.
 */
export function CategoryPlacementBanner({
  campaign,
  products,
  slug,
  preview = false,
}: Props) {
  const brand = selectCategoryBrandBanner(products, slug, new Date())
  const choice = chooseCategoryPlacementAd(Boolean(campaign), Boolean(brand))
  if (choice.kind === "none") return null
  if (choice.kind === "sponsored" && campaign) {
    return (
      <Frame kind="sponsored" reason={choice.reason} preview={preview}>
        <BannerFace
          badge="Gesponsord"
          logoUrl={campaign.logo_url}
          logoAlt=""
          headline={campaign.headline?.trim() || campaign.name}
          subline={campaign.subline?.trim() || ""}
          href={campaign.destination_url || "/"}
          cta={CTA_LABELS_NL[campaign.cta_key] || "Meer informatie"}
          imageUrl={campaign.image_url}
          imagePosition="center"
        />
      </Frame>
    )
  }
  if (!brand) return null
  const scene = SCENES[brand.scene]
  const href = brand.brandSlug
    ? `/merk/${brand.brandSlug}`
    : brand.productSlug
      ? `/product/${brand.productSlug}`
      : null
  if (!href) return null
  return (
    <Frame kind="brand" reason={`${choice.reason} ${brand.reason}`} preview={preview}>
      <BannerFace
        badge="Advertentie"
        logoUrl={brand.logoUrl}
        logoAlt={brand.brandName}
        headline={brand.headline}
        subline={brand.subline}
        href={href}
        cta="Ontdek nu"
        imageUrl={scene.src}
        imagePosition={scene.position}
      />
    </Frame>
  )
}

function Frame({
  kind,
  reason,
  preview,
  children,
}: {
  kind: "sponsored" | "brand"
  reason: string
  preview: boolean
  children: ReactNode
}) {
  return (
    <section className="px-4 py-4 sm:px-6" data-ad-kind={kind} data-ad-reason={reason}>
      <div className="[container-type:inline-size]">
        <div className="aspect-[2.85/1] overflow-hidden rounded-2xl border border-slate-200 bg-white min-[834px]:aspect-auto min-[834px]:h-[calc((100cqw-22px)/5.7)]">
          {children}
        </div>
      </div>
      {preview ? <p className="mt-1 text-[11px] leading-4 text-slate-500">{reason}</p> : null}
    </section>
  )
}

function BannerFace({
  badge,
  logoUrl,
  logoAlt,
  headline,
  subline,
  href,
  cta,
  imageUrl,
  imagePosition,
}: {
  badge: string
  logoUrl?: string | null
  logoAlt: string
  headline: string
  subline: string
  href: string
  cta: string
  imageUrl?: string | null
  imagePosition: string
}) {
  return (
    <div className="relative h-full">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: imagePosition }}
          decoding="async"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-white from-[18%] via-white/88 via-[46%] to-transparent" />
      <p className="absolute left-3 top-2 z-[2] rounded bg-[#16315c] px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-white">{badge}</p>
      <div className="relative flex h-full items-center gap-3 px-4 pt-5 sm:gap-4 sm:px-6">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={logoAlt} className="h-9 w-auto max-w-[7.5rem] shrink-0 object-contain object-left sm:h-11" decoding="async" />
        ) : null}
        <div className="min-w-0">
          <p className="line-clamp-1 text-[15px] font-bold leading-5 text-[#16315c] sm:text-lg">{headline}</p>
          {subline ? <p className="line-clamp-1 text-xs leading-4 text-slate-700 sm:text-sm">{subline}</p> : null}
          <Link
            href={href}
            prefetch={false}
            className="mt-1.5 inline-flex items-center rounded-full bg-[#2c9a14] px-3.5 py-1 text-xs font-semibold text-white sm:text-sm"
          >
            {cta} <span aria-hidden className="ml-1">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
