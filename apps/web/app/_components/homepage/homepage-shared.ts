import type { HomepageBannerCms } from "../../_lib/cms/homepage-cms"
import type { ResolvedHomepageSection } from "../../_lib/cms/resolve-homepage"
import type { StoreCmsHomepageResponse } from "../../_lib/cms/fetch-store-cms"

export const HOMEPAGE_SECTION_CLASS = "px-4 py-3.5 tablet:px-8 tablet:py-4"
export const HOMEPAGE_AD_WRAP = "py-1 tablet:py-1.5"

export function withLegacyBanners(
  sections: ResolvedHomepageSection[]
): ResolvedHomepageSection[] {
  if (sections.some((s) => s.key === "banner")) return sections
  const out = [...sections]
  const featured = out.findIndex((s) => s.key === "featured")
  const insertAt = featured >= 0 ? featured + 1 : Math.max(out.length, 0)
  out.splice(insertAt, 0, {
    id: "legacy_banner_1",
    key: "banner",
    title: "",
    subtitle: "",
  })
  const newsIdx = out.findIndex((s) => s.key === "newsletter")
  out.splice(newsIdx >= 0 ? newsIdx : out.length, 0, {
    id: "legacy_banner_2",
    key: "banner",
    title: "",
    subtitle: "",
  })
  return out
}

export function mapApiBanners(
  banners: StoreCmsHomepageResponse["banners"] | undefined
): HomepageBannerCms[] {
  if (!Array.isArray(banners)) return []
  return banners.map((b) => ({
    id: b.id,
    visible: b.visible,
    sortOrder: b.sort_order,
    publishAt: null,
    expiresAt: null,
    position: b.position === 2 ? 2 : 1,
    location: (b.location as HomepageBannerCms["location"]) || "homepage",
    title: b.title,
    subtitle: b.subtitle,
    ctaLabel: b.cta_label,
    destinationUrl: b.destination_url,
    linkType: (b.link_type as HomepageBannerCms["linkType"]) || "category",
    image: b.image_url,
    imageAlt: b.image_alt,
    background: b.background ?? "",
    logo: b.logo_url,
    marketScope: b.market_scope,
    markets: b.markets,
  }))
}

/**
 * Prefer homepage-document banner selection when present; otherwise use library.
 * Selected entries may be snapshots (from CMS picker) or id-only refs resolved via library.
 */
export function resolveHomepageBannerOverrides(opts: {
  documentBanners: unknown
  libraryBanners: HomepageBannerCms[]
}): HomepageBannerCms[] {
  const selected = Array.isArray(opts.documentBanners)
    ? (opts.documentBanners as Array<Record<string, unknown>>)
    : []
  if (selected.length === 0) return opts.libraryBanners

  const byId = new Map(opts.libraryBanners.map((b) => [b.id, b]))
  const emptyLoc = { nl: "", en: "", de: "", fr: "" }

  return selected.map((raw, index) => {
    const id = typeof raw.id === "string" ? raw.id : `banner_${index}`
    const fromLib = byId.get(id)
    const position =
      Number(raw.position) === 2 || Number(raw.position) === 1
        ? (Number(raw.position) as 1 | 2)
        : index === 0
          ? 1
          : 2
    if (fromLib) {
      return { ...fromLib, position, visible: true }
    }
    const title =
      raw.title && typeof raw.title === "object"
        ? (raw.title as HomepageBannerCms["title"])
        : emptyLoc
    return {
      id,
      visible: raw.visible !== false,
      sortOrder: Number(raw.sortOrder ?? index * 10) || 0,
      publishAt: null,
      expiresAt: null,
      position,
      location: "homepage" as const,
      title,
      subtitle:
        raw.subtitle && typeof raw.subtitle === "object"
          ? (raw.subtitle as HomepageBannerCms["subtitle"])
          : emptyLoc,
      ctaLabel:
        raw.cta_label && typeof raw.cta_label === "object"
          ? (raw.cta_label as HomepageBannerCms["ctaLabel"])
          : raw.ctaLabel && typeof raw.ctaLabel === "object"
            ? (raw.ctaLabel as HomepageBannerCms["ctaLabel"])
            : emptyLoc,
      destinationUrl:
        typeof raw.destination_url === "string"
          ? raw.destination_url
          : typeof raw.destinationUrl === "string"
            ? raw.destinationUrl
            : "#",
      linkType: "category" as const,
      image:
        typeof raw.image_url === "string"
          ? raw.image_url
          : typeof raw.image === "string"
            ? raw.image
            : null,
      imageAlt: emptyLoc,
      background: typeof raw.background === "string" ? raw.background : "",
      logo:
        typeof raw.logo_url === "string"
          ? raw.logo_url
          : typeof raw.logo === "string"
            ? raw.logo
            : null,
      marketScope: "all" as const,
      markets: [] as string[],
    }
  })
}
