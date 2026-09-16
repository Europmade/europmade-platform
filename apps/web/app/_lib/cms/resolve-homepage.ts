/**
 * Resolve Homepage CMS mock → localized view models for UI components.
 */

import { isEuMarketCode, isVisibleInMarket, type EuMarketCode } from "@europmade/types"
import { rewriteCollectionHrefToAction } from "@europmade/utils"
import { resolveStorefrontLocale } from "../i18n/detect-locale"
import {
  DEFAULT_STOREFRONT_LOCALE,
  isStorefrontLocale,
  pickLocalized,
  type LocalizedString,
  type StorefrontLocale,
} from "../i18n/locales"
import type { HomepageCampaign } from "../homepage-campaigns"
import type { HomepageCategory } from "../homepage-content"
import type { HomepageHeroContent } from "../homepage-hero-content"
import type { StorefrontAdCreative } from "../storefront-ads"
import {
  HOMEPAGE_CMS_UNPUBLISHED,
  type HomepageBannerCms,
  type HomepageCmsDocument,
  type HomepageNewsletterCms,
  type HomepagePartnerSpotlightCms,
  type HomepageSectionCms,
  type HomepageWhyItemCms,
} from "./homepage-cms"
import { isCmsEntryLive, sortByCmsOrder } from "./publish"

function isHomepageProductSort(
  value: unknown
): value is NonNullable<ResolvedHomepageSection["sortMode"]> {
  return (
    value === "offers" ||
    value === "newest" ||
    value === "rating" ||
    value === "price_asc" ||
    value === "price_desc" ||
    value === "random"
  )
}

export type ResolvedHomepageSection = {
  id: string
  key: HomepageSectionCms["key"]
  title: string
  subtitle: string
  image?: string | null
  body?: string
  href?: string
  productIds?: string[]
  limit?: number
  sortMode?:
    | "offers"
    | "newest"
    | "rating"
    | "price_asc"
    | "price_desc"
    | "random"
  sortSeed?: number
  showImage?: boolean
}

export type ResolvedHomepageWhyItem = {
  id: string
  title: string
  body: string
  image?: string | null
}

export type ResolvedNewsletter = {
  title: string
  subtitle: string
  placeholder: string
  submitLabel: string
  invalidEmail: string
  successMessage: string
  image?: string | null
}

export type PartnerCardBackgroundKey =
  | "light"
  | "dark"
  | "green"
  | "beige"
  | "earth"

export type ResolvedPartnerSpotlight = {
  slug: string
  name: string
  country: string
  rating: number
  productCount: number
  description: string
  image?: string | null
  logo?: string | null
  backgroundKey: PartnerCardBackgroundKey
}

export type ResolvedHomepage = {
  locale: StorefrontLocale
  market: EuMarketCode | null
  hero: HomepageHeroContent & { backgroundGradient: string }
  campaigns: HomepageCampaign[]
  banners: StorefrontAdCreative[]
  sections: Record<HomepageSectionCms["key"], ResolvedHomepageSection | null>
  orderedSections: ResolvedHomepageSection[]
  faqItems: ResolvedHomepageWhyItem[]
  categories: HomepageCategory[]
  why: {
    title: string
    subtitle: string
    image?: string | null
    items: ResolvedHomepageWhyItem[]
  }
  newsletter: ResolvedNewsletter
  partners: {
    title: string
    subtitle: string
    items: ResolvedPartnerSpotlight[]
  }
  seo?: {
    title?: string
    description?: string
    canonical?: string | null
    ogTitle?: string
    ogDescription?: string
  }
}

function liveSorted<T extends { visible: boolean; sortOrder: number }>(
  items: T[],
  now: Date
): T[] {
  return sortByCmsOrder(items.filter((item) => isCmsEntryLive(item, now)))
}

function resolveSectionMap(
  sections: HomepageSectionCms[],
  locale: StorefrontLocale,
  now: Date
): ResolvedHomepage["sections"] {
  const map = {} as ResolvedHomepage["sections"]
  const keys: HomepageSectionCms["key"][] = [
    "featured",
    "newest",
    "best_sellers",
    "categories",
    "campaigns",
    "partners",
    "why",
    "newsletter",
    "intro",
    "editorial",
    "faq",
    "seller_cta",
    "banner",
  ]
  for (const key of keys) map[key] = null
  for (const section of liveSorted(sections, now)) {
    const productIds = Array.isArray(section.productIds)
      ? section.productIds.map(String).filter(Boolean)
      : []
    const sortMode = isHomepageProductSort(section.sortMode)
      ? section.sortMode
      : undefined
    map[section.key] = {
      id: section.id,
      key: section.key,
      title: pickLocalized(section.title, locale),
      subtitle: pickLocalized(section.subtitle, locale),
      image: section.image,
      body: section.body ? pickLocalized(section.body, locale) : "",
      href: section.href,
      productIds,
      limit: Number.isFinite(Number(section.limit))
        ? Math.min(48, Math.max(1, Number(section.limit)))
        : undefined,
      sortMode,
      sortSeed: Number.isFinite(Number(section.sortSeed))
        ? Number(section.sortSeed)
        : undefined,
      showImage: section.showImage !== false,
    }
  }
  return map
}

function resolveBanner(
  banner: HomepageBannerCms,
  locale: StorefrontLocale
): StorefrontAdCreative {
  return {
    id: banner.id,
    position: banner.position,
    location: banner.location,
    title: pickLocalized(banner.title, locale),
    headline: pickLocalized(banner.title, locale),
    description: pickLocalized(banner.subtitle, locale),
    ctaLabel: pickLocalized(banner.ctaLabel, locale),
    href: banner.destinationUrl,
    linkType: banner.linkType,
    imageSrc: banner.image ?? "",
    imageAlt: pickLocalized(banner.imageAlt, locale),
    status: "Actief",
    background: banner.background,
    logoSrc: banner.logo ?? null,
    activeFrom: banner.activeFrom ?? banner.publishAt ?? null,
    activeTo: banner.activeTo ?? banner.expiresAt ?? null,
  }
}

function resolveNewsletter(
  n: HomepageNewsletterCms,
  locale: StorefrontLocale
): ResolvedNewsletter {
  return {
    title: pickLocalized(n.title, locale),
    subtitle: pickLocalized(n.subtitle, locale),
    placeholder: pickLocalized(n.placeholder, locale),
    submitLabel: pickLocalized(n.submitLabel, locale),
    invalidEmail: pickLocalized(n.invalidEmail, locale),
    successMessage: pickLocalized(n.successMessage, locale),
    image: typeof n.image === "string" ? n.image : null,
  }
}

function partnerBackgroundKey(
  value: unknown
): PartnerCardBackgroundKey {
  if (
    value === "light" ||
    value === "dark" ||
    value === "green" ||
    value === "beige" ||
    value === "earth"
  ) {
    return value
  }
  return "light"
}

function resolvePartners(
  items: HomepagePartnerSpotlightCms[],
  locale: StorefrontLocale,
  now: Date
): ResolvedPartnerSpotlight[] {
  return liveSorted(items, now)
    .filter((p) => Boolean(p.slug?.trim()))
    .map((p) => ({
    slug: p.slug,
    name: pickLocalized(p.title, locale),
    country: pickLocalized(p.country, locale),
    rating: p.rating,
    productCount: p.productCount,
    description: pickLocalized(p.subtitle, locale),
    image: typeof p.image === "string" ? p.image : null,
    logo: typeof p.logo === "string" ? p.logo : null,
    backgroundKey: partnerBackgroundKey(p.backgroundKey),
  }))
}

function resolveWhyItems(
  items: HomepageWhyItemCms[],
  locale: StorefrontLocale,
  now: Date
): ResolvedHomepageWhyItem[] {
  return liveSorted(items, now).map((item) => ({
    id: item.id,
    title: pickLocalized(item.title, locale),
    body: pickLocalized(item.subtitle, locale),
    image: typeof item.image === "string" ? item.image : null,
  }))
}

/**
 * Resolve homepage CMS document for storefront.
 * Prefer published API document; callers pass HOMEPAGE_CMS_MOCK when unpublished.
 * Market filters banners (locale remains independent).
 */
export function resolveHomepageCms(
  localeInput?: string | null,
  document: HomepageCmsDocument = HOMEPAGE_CMS_UNPUBLISHED,
  now: Date = new Date(),
  options?: {
    visitorMarket?: EuMarketCode | null
    bannerOverrides?: HomepageBannerCms[] | null
    seo?: {
      title?: LocalizedString | null
      description?: LocalizedString | null
      canonical?: string | null
      ogTitle?: LocalizedString | null
      ogDescription?: LocalizedString | null
    }
  }
): ResolvedHomepage {
  const locale = isStorefrontLocale(localeInput ?? "")
    ? localeInput!
    : DEFAULT_STOREFRONT_LOCALE

  const visitorMarket = options?.visitorMarket ?? null
  const heroRaw = document.hero
  const heroLive = isCmsEntryLive(
    { ...heroRaw, visible: heroRaw.visible !== false },
    now
  )

  const sections = resolveSectionMap(document.sections, locale, now)
  const whySection = sections.why
  const partnersSection = sections.partners
  const newsletterSection = sections.newsletter

  const bannerSource =
    options?.bannerOverrides != null
      ? options.bannerOverrides
      : document.banners

  const filteredBanners = liveSorted(bannerSource, now)
    .filter((b) => {
      const scope = b.marketScope === "selected" ? "selected" : "all"
      const markets = (b.markets ?? [])
        .map((code) => String(code).toUpperCase())
        .filter((code): code is EuMarketCode => isEuMarketCode(code))
      return isVisibleInMarket({ marketScope: scope, markets }, visitorMarket)
    })
    .map((b) => resolveBanner(b, locale))

  const seo = options?.seo
  return {
    locale,
    market: visitorMarket,
    hero: heroLive
      ? {
          headline: pickLocalized(heroRaw.title, locale),
          subtitle: pickLocalized(heroRaw.subtitle, locale),
          primaryCta: {
            label: pickLocalized(heroRaw.cta1.label, locale),
            href: heroRaw.cta1.href,
          },
          secondaryCta: {
            label: pickLocalized(heroRaw.cta2.label, locale),
            href: heroRaw.cta2.href,
          },
          image: {
            src: heroRaw.heroImage ?? undefined,
            alt: pickLocalized(heroRaw.heroImageAlt, locale),
            captionTitle: heroRaw.captionTitle
              ? pickLocalized(heroRaw.captionTitle, locale)
              : undefined,
            captionBody: heroRaw.captionBody
              ? pickLocalized(heroRaw.captionBody, locale)
              : undefined,
          },
          trustItems: heroRaw.trustBullets.map((b) => pickLocalized(b, locale)),
          backgroundGradient: heroRaw.backgroundGradient,
        }
      : {
          headline: "",
          subtitle: "",
          primaryCta: { label: "", href: "/waarom-kopen" },
          secondaryCta: { label: "", href: "/waarom-verkopen" },
          image: { alt: "" },
          trustItems: [],
          backgroundGradient: heroRaw.backgroundGradient,
        },
    campaigns: liveSorted(document.campaigns, now).map((c) => ({
      id: c.id,
      slug: c.slug,
      title: pickLocalized(c.title, locale),
      description: pickLocalized(c.subtitle, locale),
      ctaLabel: pickLocalized(c.ctaLabel, locale),
      href: rewriteCollectionHrefToAction(c.href, c.slug),
      imageSrc: c.image ?? undefined,
      imageAlt: pickLocalized(c.imageAlt, locale),
      accentHue: c.accentHue,
    })),
    banners: filteredBanners,
    sections,
    orderedSections: liveSorted(document.sections, now).map((section) => {
      const productIds = Array.isArray(section.productIds)
        ? section.productIds.map(String).filter(Boolean)
        : []
      const sortMode = isHomepageProductSort(section.sortMode)
        ? section.sortMode
        : undefined
      return {
        id: section.id,
        key: section.key,
        title: pickLocalized(section.title, locale),
        subtitle: pickLocalized(section.subtitle, locale),
        image: section.image,
        body: section.body ? pickLocalized(section.body, locale) : "",
        href: section.href,
        productIds,
        limit: Number.isFinite(Number(section.limit))
          ? Math.min(48, Math.max(1, Number(section.limit)))
          : undefined,
        sortMode,
        sortSeed: Number.isFinite(Number(section.sortSeed))
          ? Number(section.sortSeed)
          : undefined,
        showImage: section.showImage !== false,
      }
    }),
    faqItems: resolveWhyItems(document.faqItems ?? [], locale, now),
    categories: liveSorted(document.categories, now).map((c) => ({
      slug: c.slug,
      label: pickLocalized(c.title, locale),
      popular: true,
      image: typeof c.image === "string" ? c.image : null,
      categoryId: c.categoryId ?? null,
    })),
    why: {
      title: whySection?.title ?? "",
      subtitle: whySection?.subtitle ?? "",
      image:
        whySection?.showImage === false
          ? null
          : (whySection?.image ?? null),
      items: resolveWhyItems(document.whyItems, locale, now),
    },
    newsletter: {
      ...resolveNewsletter(document.newsletter, locale),
      title:
        newsletterSection?.title ??
        pickLocalized(document.newsletter.title, locale),
      subtitle:
        newsletterSection?.subtitle ??
        pickLocalized(document.newsletter.subtitle, locale),
      image:
        (typeof document.newsletter.image === "string"
          ? document.newsletter.image
          : null) ||
        newsletterSection?.image ||
        null,
    },
    partners: {
      title: partnersSection?.title ?? "",
      subtitle: partnersSection?.subtitle ?? "",
      items: resolvePartners(document.partnerSpotlight, locale, now),
    },
    seo: seo
      ? {
          title: seo.title ? pickLocalized(seo.title, locale) : undefined,
          description: seo.description
            ? pickLocalized(seo.description, locale)
            : undefined,
          canonical: seo.canonical,
          ogTitle: seo.ogTitle
            ? pickLocalized(seo.ogTitle, locale)
            : undefined,
          ogDescription: seo.ogDescription
            ? pickLocalized(seo.ogDescription, locale)
            : undefined,
        }
      : undefined,
  }
}

/**
 * Resolve storefront locale from cookie, then Accept-Language, then NL.
 * Prefer `getStorefrontLocaleFromCookies` / `resolveStorefrontLocale` for new code.
 * Does not persist auto-detected locales.
 */
export function resolveStorefrontLocaleFromCookie(
  cookieValue: string | undefined,
  acceptLanguage?: string | null
): StorefrontLocale {
  return resolveStorefrontLocale({
    cookieValue,
    acceptLanguage,
  })
}
