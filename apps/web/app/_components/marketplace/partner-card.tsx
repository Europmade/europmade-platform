import Link from "next/link"
import {
  BRAND_SPOTLIGHT_FRAME_CLASS,
  BRAND_SPOTLIGHT_GRID_CLASS,
  brandSpotlightHref,
  type CampaignCardStyle,
} from "@europmade/utils"
import {
  findPartnerProfile,
  partnerCoverStyle,
  partnerLogoStyle,
} from "../../_lib/partner-profiles"
import { starsForRating } from "../../_lib/listing-products"
import type { PartnerCardBackgroundKey } from "../../_lib/cms/resolve-homepage"
import { PromoCardOverlay } from "../homepage/promo-card-overlay"

const BACKGROUNDS: Record<PartnerCardBackgroundKey, string> = {
  light: "linear-gradient(155deg, #f8f9fb 0%, #eef1f5 48%, #e4e9ef 100%)",
  dark: "linear-gradient(155deg, #3d434b 0%, #2a2f35 45%, #1c2025 100%)",
  green: "linear-gradient(155deg, #e4efe7 0%, #c5d9cb 50%, #9fbfab 100%)",
  beige: "linear-gradient(155deg, #f7f1e6 0%, #eadfcb 48%, #dcc9a8 100%)",
  earth: "linear-gradient(155deg, #ebe0d4 0%, #cbb59a 52%, #a8896c 100%)",
}

function media(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null
  return url.trim()
}

export function PartnerCard({
  slug,
  name,
  country,
  rating,
  productCount,
  description,
  image,
  logo,
  backgroundKey = "light",
  viewLabel = "Bekijk merk",
  productsSuffix = "producten",
  href,
}: {
  slug: string
  name: string
  country: string
  rating: number
  productCount: number
  description?: string
  image?: string | null
  logo?: string | null
  backgroundKey?: PartnerCardBackgroundKey
  viewLabel?: string
  productsSuffix?: string
  href?: string | null
}) {
  const profile = findPartnerProfile(slug)
  const resolvedCountry = country || profile?.productionCountry || "Europa"
  const resolvedRating = rating || profile?.rating || 4.5
  const count = productCount || profile?.productCountHint || 0
  const coverUrl = media(image)
  const logoUrl = media(logo)
  const isDark = backgroundKey === "dark"

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-wf-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-wf-300 hover:shadow-md">
      <div
        className="relative h-28 w-full overflow-hidden tablet:h-32"
        style={
          coverUrl
            ? undefined
            : {
                ...partnerCoverStyle(slug),
                backgroundImage: BACKGROUNDS[backgroundKey],
                backgroundBlendMode: "multiply",
              }
        }
        role="img"
        aria-label={`Cover ${name}`}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: BACKGROUNDS[backgroundKey] }}
            aria-hidden
          />
        )}
        <div
          className="absolute -bottom-4 left-2.5 flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border-2 border-white bg-white shadow-md"
          role="img"
          aria-label={`Logo ${name}`}
          style={logoUrl ? undefined : partnerLogoStyle(slug)}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-full w-full object-contain p-1"
              loading="lazy"
            />
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-6">
        <h3
          className={`text-[13px] font-bold leading-tight ${
            isDark ? "text-wf-900" : "text-wf-900"
          }`}
        >
          {name}
        </h3>
        <p className="mt-0.5 text-[10.5px] text-wf-600">{resolvedCountry}</p>
        {description ? (
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-wf-600">
            {description}
          </p>
        ) : null}
        <p className="mt-1 text-[10.5px] text-wf-700">
          <span className="tracking-tighter text-wf-800" aria-hidden>
            {starsForRating(resolvedRating)}
          </span>{" "}
          <span className="font-semibold">
            {resolvedRating.toFixed(1).replace(".", ",")}
          </span>
          {count > 0 ? (
            <span className="text-wf-500">
              {" "}
              · {count} {productsSuffix}
            </span>
          ) : null}
        </p>
        {href ? (
          <Link
            href={href}
            className="mt-2 inline-flex h-7 items-center justify-center rounded-lg border border-wf-300 bg-white px-2 text-[11.5px] font-semibold text-wf-800 transition group-hover:border-wf-900 group-hover:bg-wf-900 group-hover:text-white"
          >
            {viewLabel}
          </Link>
        ) : (
          <p className="mt-2 text-[11px] text-wf-500">{name}</p>
        )}
      </div>
    </article>
  )
}

export function HomepageProducerGrid({
  partners,
  viewLabel,
  productsSuffix,
}: {
  partners?: Array<{
    slug: string
    name: string
    country: string
    rating: number
    productCount: number
    description?: string
    image?: string | null
    logo?: string | null
    logoSize?: number
    logoPosition?: "left" | "center" | "right"
    textColor?: string
    overlayStrength?: number
    backgroundKey?: PartnerCardBackgroundKey
    card?: CampaignCardStyle
    ctaLabel?: string
    href?: string | null
  }>
  viewLabel?: string
  productsSuffix?: string
}) {
  const list = (partners ?? []).filter((row) =>
    Boolean(row.slug?.trim() || row.name?.trim() || row.image || row.logo)
  )
  if (list.length === 0) {
    return (
      <p className="text-[13px] text-wf-500">Geen merken ingesteld</p>
    )
  }

  return (
    <ul className={BRAND_SPOTLIGHT_GRID_CLASS}>
      {list.map((r, index) => {
        const slug = r.slug?.trim() ?? ""
        const href = brandSpotlightHref({ href: r.href, slug })
        const background = BACKGROUNDS[r.backgroundKey ?? "light"]
        const position = r.logoPosition ?? "left"
        const align =
          position === "center"
            ? "items-center text-center"
            : position === "right"
              ? "items-end text-right"
              : "items-start text-left"
        const place =
          position === "center"
            ? "justify-center"
            : position === "right"
              ? "justify-end"
              : "justify-start"
        const overlay = Math.min(100, Math.max(0, r.overlayStrength ?? 62)) / 100
        const logoSize = Math.min(160, Math.max(48, r.logoSize ?? 96))
        const styled = r.card
          ? { ...r.card, logo: r.card.logo || r.logo || null }
          : null
        const card = (
          <article className={BRAND_SPOTLIGHT_FRAME_CLASS}>
            <div
              className="absolute inset-0"
              style={{ background }}
              aria-hidden
            />
            {r.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            {styled ? (
              <PromoCardOverlay
                card={styled}
                title={r.name}
                description={r.description}
                ctaLabel={r.ctaLabel}
              />
            ) : (
              <div className={`pointer-events-none absolute inset-0 z-[1] flex h-full items-center p-3 tablet:p-4 ${place}`}>
                <div className={`relative flex h-full max-w-[78%] flex-col justify-center gap-1 ${align}`}>
                  <div
                    className="absolute -inset-x-6 -inset-y-3 rounded-[2rem] blur-md"
                    style={{ background: `rgba(255,255,255,${overlay})` }}
                    aria-hidden
                  />
                  {r.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.logo}
                      alt=""
                      className="relative h-auto w-auto max-w-full object-contain"
                      style={{ maxHeight: `min(${logoSize}px, 42%)` }}
                    />
                  ) : (
                    <p
                      className="relative text-[18px] font-bold leading-none tracking-tight tablet:text-[22px]"
                      style={{ color: r.textColor || "#111827" }}
                    >
                      {r.name}
                    </p>
                  )}
                  {r.description ? (
                    <p
                      className="relative line-clamp-2 text-[12px] font-medium leading-snug tablet:text-[13px]"
                      style={{ color: r.textColor || "#111827" }}
                    >
                      {r.description}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
            <span className="sr-only">
              {viewLabel} {r.name}
              {r.productCount > 0 ? `, ${r.productCount} ${productsSuffix ?? ""}` : ""}
            </span>
          </article>
        )
        return (
          <li key={`${slug || r.name || "merk"}-${index}`}>
            {href ? (
              <Link href={href} className="block">
                {card}
              </Link>
            ) : (
              card
            )}
          </li>
        )
      })}
    </ul>
  )
}
