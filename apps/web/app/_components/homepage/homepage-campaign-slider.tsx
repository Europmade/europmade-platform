"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  CAMPAIGN_CARD_FRAME_CLASS,
  CAMPAIGN_CARD_MEDIA_CLASS,
  defaultCampaignCardStyle,
  singleCardHref,
} from "@europmade/utils"
import { PromoCardOverlay } from "./promo-card-overlay"
import {
  DEFAULT_HOMEPAGE_CAMPAIGNS,
  type HomepageCampaign,
} from "../../_lib/homepage-campaigns"
import { productMockupSrc, CAMPAIGN_PRODUCT_KIND } from "../../_lib/product-mockup"
import { HomepageSectionTitle } from "./homepage-section-title"

function CampaignVisual({ campaign }: { campaign: HomepageCampaign }) {
  if (campaign.imageSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={campaign.imageSrc}
        alt={campaign.imageAlt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    )
  }
  const kind = CAMPAIGN_PRODUCT_KIND[campaign.slug]
  const mock = productMockupSrc(campaign.slug, kind)
  return (
    <div
      className="relative flex h-full w-full items-center justify-center bg-[#f5f6f8]"
      role="img"
      aria-label={campaign.imageAlt}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mock}
        alt=""
        className="h-[94%] w-auto max-w-[58%] object-contain drop-shadow-[0_12px_22px_rgba(15,23,42,0.12)]"
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

/**
 * Horizontale campagne-slider — CMS-payload via `campaigns` prop.
 */
export function HomepageCampaignSlider({
  campaigns = DEFAULT_HOMEPAGE_CAMPAIGNS,
  title = "Acties & thema’s",
  prevLabel = "Previous campaigns",
  nextLabel = "Next campaigns",
  titleColor,
  titleSize,
}: {
  campaigns?: HomepageCampaign[]
  title?: string
  prevLabel?: string
  nextLabel?: string
  titleColor?: string
  titleSize?: number | null
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setCanLeft(el.scrollLeft > 4)
    setCanRight(max > 4 && el.scrollLeft < max - 4)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateArrows()
    el.addEventListener("scroll", updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateArrows)
      ro.disconnect()
    }
  }, [campaigns, updateArrows])

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.75, 220), behavior: "smooth" })
  }

  if (!campaigns.length) return null

  return (
    <section>
      <HomepageSectionTitle
        color={titleColor}
        fontSize={titleSize}
        className="mb-2"
      >
        {title}
      </HomepageSectionTitle>
      <div className="group/campaigns relative">
        <button
          type="button"
          onClick={() => scrollByDir(-1)}
          disabled={!canLeft}
          aria-label={prevLabel}
          className="absolute left-0 top-[40%] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-wf-200 bg-white/95 text-wf-900 shadow-md transition disabled:pointer-events-none disabled:opacity-0 tablet:opacity-0 tablet:group-hover/campaigns:opacity-100"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => scrollByDir(1)}
          disabled={!canRight}
          aria-label={nextLabel}
          className="absolute right-0 top-[40%] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-wf-200 bg-white/95 text-wf-900 shadow-md transition disabled:pointer-events-none disabled:opacity-0 tablet:opacity-0 tablet:group-hover/campaigns:opacity-100"
        >
          ›
        </button>

        <div
          ref={scrollerRef}
          role="region"
          aria-label={title}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-1 touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {campaigns.map((c) => {
            const href = singleCardHref(c.href)
            const media = (
              <div className={CAMPAIGN_CARD_MEDIA_CLASS}>
                <CampaignVisual campaign={c} />
                <PromoCardOverlay
                  card={c.card ?? defaultCampaignCardStyle()}
                  title={c.title}
                  description={c.description}
                  ctaLabel={c.ctaLabel}
                />
              </div>
            )
            return (
              <article key={c.id} className={CAMPAIGN_CARD_FRAME_CLASS}>
                {href ? (
                  <Link href={href} className="block">
                    {media}
                  </Link>
                ) : (
                  media
                )}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

