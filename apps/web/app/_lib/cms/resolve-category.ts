/**
 * Resolve Category CMS mock → localized view model for category pages.
 * No AI at request time — all content is prebuilt CMS/mock payload.
 */

import type { ListingProduct } from "../listing-products"
import {
  DEFAULT_STOREFRONT_LOCALE,
  isStorefrontLocale,
  pickLocalized,
  type StorefrontLocale,
} from "../i18n/locales"
import type { StorefrontAdCreative } from "../storefront-ads"
import { bannerProductMockupDataUri } from "../product-mockup"
import { hashHue } from "../cart-line-meta"
import {
  type CategoryAiHooks,
  type CategoryBannerCms,
  type CategoryBannerPriority,
  type CategoryCmsDocument,
  type CategoryDynamicBlockKey,
} from "./category-cms"
import { overlayCategoryEditorial } from "./overlay-category-editorial"
import { isCmsEntryLive, sortByCmsOrder } from "./publish"
import { findMarketplaceCategory } from "../marketplace-categories"
import {
  CATEGORY_PRODUCT_KIND,
  type ProductMockKind,
} from "../product-mockup"
import type { AiContentDocument } from "../ai-content/types"
import { AI_CONTENT_PROMPT_VERSION } from "../ai-content/prompts/versions"
import type { ProductCloudStoreCategory } from "../product-cloud-store"
import {
  parseOptionValues,
  productCloudComparableAttributes,
  productCloudFilterableAttributes,
} from "../product-cloud-store"

export type ResolvedCategoryFilterOption = {
  id: string
  label: string
  value: string
}

export type ResolvedCategoryFilterGroup = {
  id: string
  attributeKey: string
  label: string
  type: "checkbox" | "boolean" | "range"
  options: ResolvedCategoryFilterOption[]
}

export type ResolvedCategoryCountry = {
  id: string
  countryCode: string
  label: string
}

export type ResolvedCategoryFaq = {
  id: string
  question: string
  answer: string
}

export type ResolvedCategoryRelated = {
  slug: string
  label: string
  href: string
  /** CMS/editorial product count for card footer. */
  productCount: number
  /** Studio PNG/WebP kind — sellers’ first transparent product photo later. */
  imageKind: string
}

export type ResolvedCategoryDynamicBlock = {
  id: string
  key: CategoryDynamicBlockKey
  title: string
  subtitle: string
  countryCode?: string | null
  products: ListingProduct[]
}

export type ResolvedCategoryBuyGuideCallout = {
  id: string
  kind: "tip" | "warning" | "highlight" | "info"
  title: string
  body: string
}

export type ResolvedCategoryBuyGuideSection = {
  id: string
  icon: string
  heading: string
  intro: string
  paragraphs: string[]
  bullets: string[]
  tips: string[]
  warnings: string[]
  commonMistakes: string[]
  advice: string
  callouts: ResolvedCategoryBuyGuideCallout[]
  checklist: string[]
  comparisonRows: { label: string; optionA: string; optionB: string }[]
  relatedLinks: { id: string; label: string; href: string }[]
  relatedProducers: ResolvedCategoryRelatedRef[]
  relatedBrands: ResolvedCategoryRelatedRef[]
  relatedCategories: ResolvedCategoryRelatedRef[]
  relatedProducts: ResolvedCategoryRelatedRef[]
  body: string
}

export type ResolvedCategoryInternalLink = {
  id: string
  kind: string
  label: string
  href: string
  imageKind?: string | null
  logoKey?: string | null
}

export type ResolvedCategoryRelatedRef = {
  id: string
  slug: string
  label: string
  href: string
  productCount?: number | null
  countryLabel?: string | null
  imageKind?: string | null
  logoKey?: string | null
}

export type ResolvedCategoryDiscoveryCard = {
  id: string
  type:
    | "category"
    | "brand"
    | "producer"
    | "collection"
    | "combination"
    | "product"
    | "next_step"
    | "banner"
  title: string
  subtitle?: string | null
  href: string
  imageKind?: string | null
  logoKey?: string | null
  productCount?: number | null
  countryLabel?: string | null
  badge?: string | null
}

export type ResolvedCategoryDiscoveryRail = {
  id: string
  kind: string
  layout: string
  title: string
  subtitle?: string | null
  cards: ResolvedCategoryDiscoveryCard[]
}

export type ResolvedEditorialBlock = {
  id: string
  kind: string
  icon?: string | null
  heading?: string | null
  intro?: string | null
  paragraphs: string[]
  bullets: string[]
  callouts: ResolvedCategoryBuyGuideCallout[]
  checklist: string[]
  comparisonRows: { label: string; optionA: string; optionB: string }[]
  topicVisuals: {
    id: string
    topic: string
    imageKind: string
    /** Product Cloud / CMS image when available; UI falls back to topic icons. */
    imageSrc?: string | null
    caption?: string | null
    importance: number
  }[]
  importanceRows: {
    id: string
    label: string
    score: number
    barPercent: number
  }[]
  links: { id: string; label: string; href: string }[]
  richParagraphs: string[]
}

export type ResolvedProductCloudInsight = {
  id: string
  key: string
  label: string
  value: string
  unit?: string | null
  source: string
}

export type ResolvedCategoryPage = {
  locale: StorefrontLocale
  slug: string
  title: string
  h1: string
  intro: string
  seoTitle: string
  seoDescription: string
  stats: {
    productCount: number
    producerCount: number
    retailerCount: number
    productionCountryCount: number
  }
  banner: StorefrontAdCreative | null
  bannerPriority: CategoryBannerPriority | null
  filterGroups: ResolvedCategoryFilterGroup[]
  countries: ResolvedCategoryCountry[]
  related: ResolvedCategoryRelated[]
  faq: ResolvedCategoryFaq[]
  dynamicBlocks: ResolvedCategoryDynamicBlock[]
  hideWhenProductCountBelow: number | null
  ai: CategoryAiHooks
  /** AI Content Engine blocks (CMS-stored; empty if not generated yet). */
  buyGuide: string | null
  buyGuideSections: ResolvedCategoryBuyGuideSection[]
  editorialBlocks: ResolvedEditorialBlock[]
  keyFeatures: string[]
  whatToLookFor: string | null
  buyingAdvice: string | null
  benefits: string[]
  drawbacks: string[]
  comparison: string | null
  maintenance: string | null
  sustainability: string | null
  suitableFor: string[]
  lessSuitableFor: string[]
  expertAdvice: string | null
  internalLinks: ResolvedCategoryInternalLink[]
  discoveryCards: ResolvedCategoryDiscoveryCard[]
  discoveryRails: ResolvedCategoryDiscoveryRail[]
  productCloudInsights: ResolvedProductCloudInsight[]
  /** Live Product Cloud category payload when store API returned data (ADR-0038). */
  productCloudCategory: {
    id: string
    slug: string | null
    name: string
    filterableAttributeCodes: string[]
    comparableAttributeCodes: string[]
  } | null
  relatedBrands: ResolvedCategoryRelatedRef[]
  relatedProducers: ResolvedCategoryRelatedRef[]
  frequentlyCombined: ResolvedCategoryRelatedRef[]
  seoSummary: string | null
  keywords: string[]
  longTailKeywords: string[]
  openGraph: { title: string; description: string; type: "website" }
  twitterCard: {
    card: "summary_large_image"
    title: string
    description: string
  }
  canonicalPath: string
  structuredData: Record<string, unknown>
  listingPresentation: {
    title: string
    sort: "relevance" | "newest" | "price_asc" | "price_desc"
    limit: number
  }
}

const BANNER_PRIORITY_ORDER: CategoryBannerPriority[] = [
  "paid",
  "campaign",
  "default",
]

function resolveBanner(
  banner: CategoryBannerCms,
  locale: StorefrontLocale,
  slug: string
): StorefrontAdCreative {
  const hue = hashHue(banner.id)
  const kind: ProductMockKind = CATEGORY_PRODUCT_KIND[slug] ?? "coffee"
  return {
    id: banner.id,
    position: 1,
    location: "category",
    title: pickLocalized(banner.title, locale),
    headline: pickLocalized(banner.title, locale),
    description: pickLocalized(banner.subtitle, locale),
    ctaLabel: pickLocalized(banner.ctaLabel, locale),
    href: banner.destinationUrl,
    linkType: banner.linkType,
    imageSrc:
      banner.image && banner.image.length > 0
        ? banner.image
        : bannerProductMockupDataUri(hue, kind),
    imageAlt: pickLocalized(banner.imageAlt, locale),
    status: "Actief",
    background: banner.background,
    logoSrc: banner.logo ?? null,
    productionCountryLabel: banner.productionCountry
      ? pickLocalized(banner.productionCountry, locale)
      : null,
    showVerifiedBadge: banner.showVerifiedBadge ?? true,
    activeFrom: banner.activeFrom ?? banner.publishAt ?? null,
    activeTo: banner.activeTo ?? banner.expiresAt ?? null,
  }
}

function pickBanner(
  banners: CategoryBannerCms[],
  locale: StorefrontLocale,
  now: Date,
  slug: string
): { creative: StorefrontAdCreative; priority: CategoryBannerPriority } | null {
  const live = sortByCmsOrder(banners.filter((b) => isCmsEntryLive(b, now)))
  for (const priority of BANNER_PRIORITY_ORDER) {
    const match = live.find((b) => b.priority === priority)
    if (match) {
      return {
        creative: resolveBanner(match, locale, slug),
        priority,
      }
    }
  }
  return null
}

function computeStats(products: ListingProduct[]) {
  const producers = new Set(products.map((p) => p.brand).filter(Boolean))
  const retailers = new Set(products.map((p) => p.seller).filter(Boolean))
  const countries = new Set(products.map((p) => p.countryCode).filter(Boolean))
  return {
    productCount: products.length,
    producerCount: producers.size,
    retailerCount: retailers.size,
    productionCountryCount: countries.size,
  }
}

function resolveDynamicBlockProducts(
  key: CategoryDynamicBlockKey,
  products: ListingProduct[],
  countryCode?: string | null
): ListingProduct[] {
  const pool = [...products]
  switch (key) {
    case "best_rated":
      return pool.sort((a, b) => b.rating - a.rating).slice(0, 8)
    case "biggest_discount":
      return pool
        .filter(
          (p) =>
            p.originalPriceCents != null &&
            p.originalPriceCents > p.priceCents
        )
        .sort(
          (a, b) =>
            (b.originalPriceCents! - b.priceCents) -
            (a.originalPriceCents! - a.priceCents)
        )
        .slice(0, 8)
    case "made_in_country":
      return pool
        .filter((p) =>
          countryCode ? p.countryCode === countryCode : true
        )
        .slice(0, 8)
    case "popular_brands":
    case "new_producers":
    case "most_sustainable":
    default:
      return pool
        .sort((a, b) => b.offerCount - a.offerCount || b.rating - a.rating)
        .slice(0, 8)
  }
}

export function resolveCategoryPage(
  slug: string,
  products: ListingProduct[],
  localeInput?: string | null,
  document?: CategoryCmsDocument,
  now: Date = new Date(),
  productCloud?: ProductCloudStoreCategory | null
): ResolvedCategoryPage | null {
  const locale: StorefrontLocale = isStorefrontLocale(localeInput ?? "")
    ? (localeInput as StorefrontLocale)
    : DEFAULT_STOREFRONT_LOCALE

  if (!productCloud || productCloud.slug !== slug) return null

  const doc = document ?? overlayCategoryEditorial(slug, {})
  if (!isCmsEntryLive(doc, now)) return null

  const stats = computeStats(products)
  const bannerPick =
    products.length > 0
      ? pickBanner(
          doc.banners.filter((b) => b.priority === "default"),
          locale,
          now,
          slug
        )
      : null

  const filterGroups: ResolvedCategoryFilterGroup[] = []

  const brands = [
    ...new Set(products.map((p) => p.brand.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "nl"))
  if (brands.length > 0) {
    filterGroups.push({
      id: "live-brand",
      attributeKey: "brand",
      label:
        locale === "en"
          ? "Brand"
          : locale === "de"
            ? "Marke"
            : locale === "fr"
              ? "Marque"
              : "Merk",
      type: "checkbox",
      options: brands.map((brand, i) => ({
        id: `brand-${i}`,
        label: brand,
        value: brand.toLowerCase(),
      })),
    })
  }

  // Product Cloud filterable attributes enrich CMS filters when present (no UI redesign).
  const pcFilters = productCloudFilterableAttributes(productCloud ?? null)
  if (pcFilters.length > 0) {
    const existingKeys = new Set(filterGroups.map((g) => g.attributeKey))
    for (const attr of pcFilters) {
      const key = attr.code ?? attr.id
      if (existingKeys.has(key)) continue
      const options = parseOptionValues(attr.option_values).map((value, i) => ({
        id: `${key}-${i}`,
        label: value,
        value,
      }))
      filterGroups.push({
        id: `pc-${attr.id}`,
        attributeKey: key,
        label: attr.name,
        type: attr.data_type === "Numeriek" ? "range" : "checkbox",
        options,
      })
      existingKeys.add(key)
    }
  }

  const countryMap = new Map<string, string>()
  for (const p of products) {
    if (p.countryCode && !countryMap.has(p.countryCode)) {
      countryMap.set(p.countryCode, p.countryLabel)
    }
  }
  const countries: ResolvedCategoryCountry[] = [...countryMap.entries()].map(
    ([countryCode, label]) => ({
      id: `country-${countryCode}`,
      countryCode,
      label,
    })
  )

  const related: ResolvedCategoryRelated[] = doc.relatedCategorySlugs
    .map((relSlug): ResolvedCategoryRelated | null => {
      const cat = findMarketplaceCategory(relSlug)
      if (!cat) return null
      return {
        slug: relSlug,
        label: cat.label,
        href: `/categorie/${relSlug}`,
        productCount: 0,
        imageKind: String(CATEGORY_PRODUCT_KIND[relSlug] ?? "coffee"),
      }
    })
    .filter((x): x is ResolvedCategoryRelated => x != null)

  const faq = sortByCmsOrder(doc.faq.filter((f) => isCmsEntryLive(f, now))).map(
    (f) => ({
      id: f.id,
      question: pickLocalized(f.question, locale),
      answer: pickLocalized(f.answer, locale),
    })
  )

  const dynamicBlocks = sortByCmsOrder(
    doc.dynamicBlocks.filter((b) => isCmsEntryLive(b, now))
  ).map((b) => ({
    id: b.id,
    key: b.key,
    title: pickLocalized(b.title, locale),
    subtitle: pickLocalized(b.subtitle, locale),
    countryCode: b.countryCode,
    products: resolveDynamicBlockProducts(b.key, products, b.countryCode),
  }))

  const cmsTitle = pickLocalized(doc.title, locale).trim()
  const title = cmsTitle || productCloud?.name?.trim() || slug
  const cmsH1 = pickLocalized(doc.seo.h1, locale).trim()
  const h1 = cmsH1 || title
  const intro = pickLocalized(doc.seo.intro, locale)
  const seoTitleRaw = pickLocalized(doc.seo.title, locale).trim()
  const seoTitle = seoTitleRaw || `${title} | EuropMade`
  const seoDescription =
    pickLocalized(doc.seo.metaDescription, locale).trim() || intro
  const aiDoc: AiContentDocument | null = null
  const ai = null

  const faqFromAi =
    ai?.faq.map((f) => ({
      id: f.id,
      question: pickLocalized(f.question, locale),
      answer: pickLocalized(f.answer, locale),
    })) ?? null
  const faqResolved = faqFromAi && faqFromAi.length >= 8 ? faqFromAi : faq

  const relatedFromAi = ai?.relatedCategories
  const relatedResolved =
    relatedFromAi && relatedFromAi.length > 0
      ? relatedFromAi.map((r) => ({
          slug: r.slug,
          label: pickLocalized(r.label, locale),
          href: r.href,
          productCount: 0,
          imageKind: (CATEGORY_PRODUCT_KIND[r.slug] ?? "coffee") as string,
        }))
      : related

  const structuredData = ai?.structuredData
    ? {
        ...ai.structuredData,
        name: h1,
        description: seoDescription,
        numberOfItems: stats.productCount,
      }
    : {
        "@context": "https://schema.org",
        "@type": doc.seo.structuredDataType,
        name: h1,
        description: seoDescription,
        url: `https://europmade.eu/categorie/${slug}`,
        numberOfItems: stats.productCount,
        mainEntity:
          faqResolved.length > 0
            ? {
                "@type": "FAQPage",
                mainEntity: faqResolved.map((item) => ({
                  "@type": "Question",
                  name: item.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer,
                  },
                })),
              }
            : undefined,
      }

  const aiHooks: CategoryAiHooks = aiDoc
    ? {
        ...doc.ai,
        contentSource: "ai-generated",
        lastGeneratedAt: aiDoc.lastGenerated,
        generationPromptVersion: aiDoc.promptVersion || AI_CONTENT_PROMPT_VERSION,
        generatedBy: aiDoc.generatedBy,
        generationStatus: aiDoc.generationStatus,
        published: aiDoc.published,
      }
    : doc.ai

  return {
    locale,
    slug,
    title,
    h1,
    intro,
    seoTitle,
    seoDescription,
    stats,
    banner: bannerPick?.creative ?? null,
    bannerPriority: bannerPick?.priority ?? null,
    filterGroups,
    countries,
    related: relatedResolved,
    faq: faqResolved,
    dynamicBlocks,
    hideWhenProductCountBelow: doc.hideWhenProductCountBelow ?? null,
    ai: aiHooks,
    buyGuide: ai ? pickLocalized(ai.buyGuide, locale) : null,
    buyGuideSections:
      ai?.buyGuideSections.map((s) => ({
        id: s.id,
        icon: s.icon ?? "list",
        heading: pickLocalized(s.heading, locale),
        intro: pickLocalized(s.intro ?? s.body, locale),
        paragraphs: (s.paragraphs ?? []).map((p) => pickLocalized(p, locale)),
        bullets: (s.bullets ?? []).map((p) => pickLocalized(p, locale)),
        tips: (s.tips ?? []).map((p) => pickLocalized(p, locale)),
        warnings: (s.warnings ?? []).map((p) => pickLocalized(p, locale)),
        commonMistakes: (s.commonMistakes ?? []).map((p) =>
          pickLocalized(p, locale)
        ),
        advice: pickLocalized(s.advice ?? s.body, locale),
        callouts: (s.callouts ?? []).map((c) => ({
          id: c.id,
          kind: c.kind,
          title: pickLocalized(c.title, locale),
          body: pickLocalized(c.body, locale),
        })),
        checklist: (s.checklist ?? []).map((p) => pickLocalized(p, locale)),
        comparisonRows: (s.comparisonRows ?? []).map((r) => ({
          label: pickLocalized(r.label, locale),
          optionA: pickLocalized(r.optionA, locale),
          optionB: pickLocalized(r.optionB, locale),
        })),
        relatedLinks: (s.relatedLinks ?? []).map((l) => ({
          id: l.id,
          label: pickLocalized(l.label, locale),
          href: l.href,
        })),
        relatedProducers: (s.relatedProducers ?? []).map((r) => ({
          id: r.id,
          slug: r.slug,
          label: pickLocalized(r.label, locale),
          href: r.href,
          productCount: r.productCount,
          countryLabel: r.countryLabel
            ? pickLocalized(r.countryLabel, locale)
            : null,
          imageKind: r.imageKind,
          logoKey: r.logoKey,
        })),
        relatedBrands: (s.relatedBrands ?? []).map((r) => ({
          id: r.id,
          slug: r.slug,
          label: pickLocalized(r.label, locale),
          href: r.href,
          productCount: r.productCount,
          logoKey: r.logoKey,
        })),
        relatedCategories: (s.relatedCategories ?? []).map((r) => ({
          id: r.id,
          slug: r.slug,
          label: pickLocalized(r.label, locale),
          href: r.href,
          productCount: r.productCount,
          imageKind: r.imageKind,
        })),
        relatedProducts: (s.relatedProducts ?? []).map((r) => ({
          id: r.id,
          slug: r.slug,
          label: pickLocalized(r.label, locale),
          href: r.href,
          imageKind: r.imageKind,
        })),
        body: pickLocalized(s.body, locale),
      })) ?? [],
    editorialBlocks:
      ai?.editorialBlocks?.map((b) => ({
        id: b.id,
        kind: b.kind,
        icon: b.icon ?? null,
        heading: b.heading ? pickLocalized(b.heading, locale) : null,
        intro: b.intro ? pickLocalized(b.intro, locale) : null,
        paragraphs: (b.paragraphs ?? []).map((p) => pickLocalized(p, locale)),
        bullets: (b.bullets ?? []).map((p) => pickLocalized(p, locale)),
        callouts: (b.callouts ?? []).map((c) => ({
          id: c.id,
          kind: c.kind,
          title: pickLocalized(c.title, locale),
          body: pickLocalized(c.body, locale),
        })),
        checklist: (b.checklist ?? []).map((p) => pickLocalized(p, locale)),
        comparisonRows: (b.comparisonRows ?? []).map((r) => ({
          label: pickLocalized(r.label, locale),
          optionA: pickLocalized(r.optionA, locale),
          optionB: pickLocalized(r.optionB, locale),
        })),
        topicVisuals: (b.topicVisuals ?? []).map((t) => ({
          id: t.id,
          topic: pickLocalized(t.topic, locale),
          imageKind: t.imageKind,
          imageSrc: t.imageSrc ?? null,
          caption: t.caption ? pickLocalized(t.caption, locale) : null,
          importance: t.importance,
        })),
        importanceRows: (b.importanceRows ?? []).map((r) => ({
          id: r.id,
          label: pickLocalized(r.label, locale),
          score: r.score,
          barPercent: r.barPercent,
        })),
        links: (b.links ?? []).map((l) => ({
          id: l.id,
          label: pickLocalized(l.label, locale),
          href: l.href,
        })),
        richParagraphs: (b.richParagraphs ?? []).map((p) =>
          pickLocalized(p, locale)
        ),
      })) ?? [],
    keyFeatures: ai?.keyFeatures.map((f) => pickLocalized(f, locale)) ?? [],
    whatToLookFor: ai ? pickLocalized(ai.whatToLookFor, locale) : null,
    buyingAdvice: ai ? pickLocalized(ai.buyingAdvice, locale) : null,
    benefits: ai?.benefits.map((b) => pickLocalized(b, locale)) ?? [],
    drawbacks: ai?.drawbacks?.map((b) => pickLocalized(b, locale)) ?? [],
    comparison: ai?.comparison ? pickLocalized(ai.comparison, locale) : null,
    maintenance: ai?.maintenance ? pickLocalized(ai.maintenance, locale) : null,
    sustainability: ai?.sustainability
      ? pickLocalized(ai.sustainability, locale)
      : null,
    suitableFor: ai?.suitableFor?.map((b) => pickLocalized(b, locale)) ?? [],
    lessSuitableFor:
      ai?.lessSuitableFor?.map((b) => pickLocalized(b, locale)) ?? [],
    expertAdvice: ai?.expertAdvice
      ? pickLocalized(ai.expertAdvice, locale)
      : null,
    internalLinks:
      ai?.internalLinks.map((l) => ({
        id: l.id,
        kind: l.kind,
        label: pickLocalized(l.label, locale),
        href: l.href,
        imageKind: l.imageKind,
        logoKey: l.logoKey,
      })) ?? [],
    discoveryCards:
      ai?.discoveryCards?.map((c) => ({
        id: c.id,
        type: c.type,
        title: pickLocalized(c.title, locale),
        subtitle: c.subtitle ? pickLocalized(c.subtitle, locale) : null,
        href: c.href,
        imageKind: c.imageKind,
        logoKey: c.logoKey,
        productCount: c.productCount,
        countryLabel: c.countryLabel
          ? pickLocalized(c.countryLabel, locale)
          : null,
        badge: c.badge ? pickLocalized(c.badge, locale) : null,
      })) ?? [],
    discoveryRails:
      ai?.discoveryRails?.map((rail) => ({
        id: rail.id,
        kind: rail.kind,
        layout: rail.layout,
        title: pickLocalized(rail.title, locale),
        subtitle: rail.subtitle ? pickLocalized(rail.subtitle, locale) : null,
        cards: rail.cards.map((c) => ({
          id: c.id,
          type: c.type,
          title: pickLocalized(c.title, locale),
          subtitle: c.subtitle ? pickLocalized(c.subtitle, locale) : null,
          href: c.href,
          imageKind: c.imageKind,
          logoKey: c.logoKey,
          productCount: c.productCount,
          countryLabel: c.countryLabel
            ? pickLocalized(c.countryLabel, locale)
            : null,
          badge: c.badge ? pickLocalized(c.badge, locale) : null,
        })),
      })) ?? [],
    productCloudInsights:
      productCloud && productCloud.attributes.length > 0
        ? productCloud.attributes.map((attr) => ({
            id: attr.id,
            key: attr.code ?? attr.id,
            label: attr.name,
            value: attr.unit ?? attr.data_type,
            unit: attr.unit,
            source: "product-cloud",
          }))
        : ai?.productCloudInsights?.map((ins) => ({
            id: ins.id,
            key: ins.key,
            label: pickLocalized(ins.label, locale),
            value: pickLocalized(ins.value, locale),
            unit: ins.unit ? pickLocalized(ins.unit, locale) : null,
            source: ins.source,
          })) ?? [],
    productCloudCategory: productCloud
      ? {
          id: productCloud.id,
          slug: productCloud.slug,
          name: productCloud.name,
          filterableAttributeCodes: productCloudFilterableAttributes(
            productCloud
          )
            .map((a) => a.code)
            .filter((c): c is string => Boolean(c)),
          comparableAttributeCodes: productCloudComparableAttributes(
            productCloud
          )
            .map((a) => a.code)
            .filter((c): c is string => Boolean(c)),
        }
      : null,
    relatedBrands:
      ai?.relatedBrands.map((r) => ({
        id: r.id,
        slug: r.slug,
        label: pickLocalized(r.label, locale),
        href: r.href,
        productCount: r.productCount,
        logoKey: r.logoKey,
      })) ?? [],
    relatedProducers:
      ai?.relatedProducers.map((r) => ({
        id: r.id,
        slug: r.slug,
        label: pickLocalized(r.label, locale),
        href: r.href,
        productCount: r.productCount,
        countryLabel: r.countryLabel
          ? pickLocalized(r.countryLabel, locale)
          : null,
        logoKey: r.logoKey,
      })) ?? [],
    frequentlyCombined:
      ai?.frequentlyCombined.map((r) => ({
        id: r.id,
        slug: r.slug,
        label: pickLocalized(r.label, locale),
        href: r.href,
        imageKind: r.imageKind,
        productCount: r.productCount,
      })) ?? [],
    seoSummary: ai ? pickLocalized(ai.seoSummary, locale) : null,
    keywords: ai?.keywords.map((k) => pickLocalized(k, locale)) ?? [],
    longTailKeywords:
      ai?.longTailKeywords.map((k) => pickLocalized(k, locale)) ?? [],
    openGraph: {
      title: ai ? pickLocalized(ai.openGraph.title, locale) : seoTitle,
      description: ai
        ? pickLocalized(ai.openGraph.description, locale)
        : seoDescription,
      type: "website",
    },
    twitterCard: {
      card: "summary_large_image",
      title: ai ? pickLocalized(ai.twitterCard.title, locale) : seoTitle,
      description: ai
        ? pickLocalized(ai.twitterCard.description, locale)
        : seoDescription,
    },
    canonicalPath: ai?.canonicalPath ?? `/categorie/${slug}`,
    structuredData,
    listingPresentation: {
      title: pickLocalized(
        doc.listingPresentation?.title ?? { nl: "", en: "", de: "", fr: "" },
        locale
      ).trim(),
      sort: doc.listingPresentation?.sort ?? "relevance",
      limit: doc.listingPresentation?.limit ?? 24,
    },
  }
}

export function shouldHideCategoryByCount(
  page: Pick<ResolvedCategoryPage, "hideWhenProductCountBelow" | "stats">
): boolean {
  const threshold = page.hideWhenProductCountBelow
  if (threshold == null || threshold <= 0) return false
  return page.stats.productCount < threshold
}
