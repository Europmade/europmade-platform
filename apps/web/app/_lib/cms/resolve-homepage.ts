/**
 * Resolve Homepage CMS mock → localized view models for UI components.
 */

import { resolveStorefrontLocale } from "../i18n/detect-locale"
import {
  DEFAULT_STOREFRONT_LOCALE,
  isStorefrontLocale,
  pickLocalized,
  type StorefrontLocale,
} from "../i18n/locales"
import type { HomepageCampaign } from "../homepage-campaigns"
import type { HomepageCategory } from "../homepage-content"
import type { HomepageHeroContent } from "../homepage-hero-content"
import type { StorefrontAdCreative } from "../storefront-ads"
import {
  HOMEPAGE_CMS_MOCK,
  type HomepageBannerCms,
  type HomepageCmsDocument,
  type HomepageNewsletterCms,
  type HomepagePartnerSpotlightCms,
  type HomepageSectionCms,
  type HomepageWhyItemCms,
} from "./homepage-cms"
import { isCmsEntryLive, sortByCmsOrder } from "./publish"

export type ResolvedHomepageSection = {
  key: HomepageSectionCms["key"]
  title: string
  subtitle: string
  image?: string | null
}

export type ResolvedHomepageWhyItem = {
  id: string
  title: string
  body: string
}

export type ResolvedNewsletter = {
  title: string
  subtitle: string
  placeholder: string
  submitLabel: string
  invalidEmail: string
  successMessage: string
}

export type ResolvedPartnerSpotlight = {
  slug: string
  name: string
  country: string
  rating: number
  productCount: number
  description: string
}

export type ResolvedHomepage = {
  locale: StorefrontLocale
  hero: HomepageHeroContent & { backgroundGradient: string }
  campaigns: HomepageCampaign[]
  banners: StorefrontAdCreative[]
  sections: Record<HomepageSectionCms["key"], ResolvedHomepageSection | null>
  categories: HomepageCategory[]
  why: { title: string; subtitle: string; items: ResolvedHomepageWhyItem[] }
  newsletter: ResolvedNewsletter
  partners: {
    title: string
    subtitle: string
    items: ResolvedPartnerSpotlight[]
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
  ]
  for (const key of keys) map[key] = null
  for (const section of liveSorted(sections, now)) {
    map[section.key] = {
      key: section.key,
      title: pickLocalized(section.title, locale),
      subtitle: pickLocalized(section.subtitle, locale),
      image: section.image,
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
  }
}

function resolvePartners(
  items: HomepagePartnerSpotlightCms[],
  locale: StorefrontLocale,
  now: Date
): ResolvedPartnerSpotlight[] {
  return liveSorted(items, now).map((p) => ({
    slug: p.slug,
    name: pickLocalized(p.title, locale),
    country: pickLocalized(p.country, locale),
    rating: p.rating,
    productCount: p.productCount,
    description: pickLocalized(p.subtitle, locale),
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
  }))
}

/**
 * Future: fetch Admin CMS document here. Today: mock + locale cookie.
 */
export function resolveHomepageCms(
  localeInput?: string | null,
  document: HomepageCmsDocument = HOMEPAGE_CMS_MOCK,
  now: Date = new Date()
): ResolvedHomepage {
  const locale = isStorefrontLocale(localeInput ?? "")
    ? localeInput!
    : DEFAULT_STOREFRONT_LOCALE

  const heroRaw = document.hero
  const heroLive = isCmsEntryLive(heroRaw, now)

  const sections = resolveSectionMap(document.sections, locale, now)
  const whySection = sections.why
  const partnersSection = sections.partners
  const newsletterSection = sections.newsletter

  return {
    locale,
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
          primaryCta: { label: "", href: "/categorie" },
          secondaryCta: { label: "", href: "/partner-onboarding" },
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
      href: c.href,
      imageSrc: c.image ?? undefined,
      imageAlt: pickLocalized(c.imageAlt, locale),
      accentHue: c.accentHue,
    })),
    banners: liveSorted(document.banners, now).map((b) =>
      resolveBanner(b, locale)
    ),
    sections,
    categories: liveSorted(document.categories, now).map((c) => ({
      slug: c.slug,
      label: pickLocalized(c.title, locale),
      popular: true,
      productCountHint: c.productCountHint,
    })),
    why: {
      title: whySection?.title ?? "",
      subtitle: whySection?.subtitle ?? "",
      items: resolveWhyItems(document.whyItems, locale, now),
    },
    newsletter: {
      ...resolveNewsletter(document.newsletter, locale),
      title: newsletterSection?.title ?? pickLocalized(document.newsletter.title, locale),
      subtitle:
        newsletterSection?.subtitle ??
        pickLocalized(document.newsletter.subtitle, locale),
    },
    partners: {
      title: partnersSection?.title ?? "",
      subtitle: partnersSection?.subtitle ?? "",
      items: resolvePartners(document.partnerSpotlight, locale, now),
    },
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
