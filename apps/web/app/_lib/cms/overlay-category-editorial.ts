import { L, type LocalizedString } from "../i18n/locales"
import {
  type CategoryAiHooks,
  type CategoryCmsDocument,
  type CategoryFaqCms,
} from "./category-cms"

const EMPTY_AI: CategoryAiHooks = {
  contentSource: "cms",
  lastGeneratedAt: null,
  generationPromptVersion: "category-content-v4",
  generatedBy: null,
  generationStatus: null,
  published: true,
  hooks: {
    generateIntro: false,
    generateFaq: false,
    generateSeo: false,
    generateBuyGuide: false,
    generateTranslations: false,
    suggestFilters: false,
    suggestRelatedCategories: false,
    suggestRelatedBrands: false,
    suggestRelatedProducers: false,
    suggestInternalLinks: false,
    suggestDynamicBlocks: false,
  },
}

function emptyLoc(): LocalizedString {
  return L("", "", "", "")
}

function mergeLoc(
  base: LocalizedString,
  over: Partial<LocalizedString> | undefined
): LocalizedString {
  if (!over) return base
  return {
    nl: typeof over.nl === "string" && over.nl.trim() ? over.nl : base.nl,
    en: typeof over.en === "string" && over.en.trim() ? over.en : base.en,
    de: typeof over.de === "string" && over.de.trim() ? over.de : base.de,
    fr: typeof over.fr === "string" && over.fr.trim() ? over.fr : base.fr,
  }
}

function locOf(value: unknown): LocalizedString {
  if (!value || typeof value !== "object") return emptyLoc()
  const v = value as Record<string, unknown>
  return {
    nl: typeof v.nl === "string" ? v.nl : "",
    en: typeof v.en === "string" ? v.en : "",
    de: typeof v.de === "string" ? v.de : "",
    fr: typeof v.fr === "string" ? v.fr : "",
  }
}

function emptyCategoryDocument(slug: string): CategoryCmsDocument {
  return {
    id: `cat_${slug}`,
    slug,
    visible: true,
    sortOrder: 0,
    publishAt: null,
    expiresAt: null,
    hideWhenProductCountBelow: null,
    title: emptyLoc(),
    seo: {
      title: emptyLoc(),
      metaDescription: emptyLoc(),
      h1: emptyLoc(),
      intro: emptyLoc(),
      structuredDataType: "CollectionPage",
    },
    stats: {
      productCount: 0,
      producerCount: 0,
      retailerCount: 0,
      productionCountryCount: 0,
    },
    banners: [],
    filterGroups: [],
    countries: [],
    relatedCategorySlugs: [],
    faq: [],
    dynamicBlocks: [],
    ai: EMPTY_AI,
  }
}

/**
 * Build category editorial CMS from published admin document only.
 * Does not use category-cms.ts mock FAQ/banners/brands.
 */
export function overlayCategoryEditorial(
  slug: string,
  editorial: unknown
): CategoryCmsDocument {
  const base = emptyCategoryDocument(slug)
  if (!editorial || typeof editorial !== "object") return base
  const d = editorial as Record<string, unknown>
  const title = locOf(d.title)
  const intro = locOf(d.intro)
  const description = locOf(d.description)
  const seoTitle = locOf(d.seoTitle)
  const seoDescription = locOf(d.seoDescription)
  const madeInEurope = locOf(d.madeInEurope)
  const heroImage = typeof d.heroImage === "string" ? d.heroImage : null
  const subtitle = locOf(d.subtitle)
  const heroVisible = d.heroVisible !== false
  const bannerVisible = d.bannerVisible !== false

  const introCombined: LocalizedString = {
    nl: [intro.nl, madeInEurope.nl].filter(Boolean).join("\n\n"),
    en: [intro.en, madeInEurope.en].filter(Boolean).join("\n\n"),
    de: [intro.de, madeInEurope.de].filter(Boolean).join("\n\n"),
    fr: [intro.fr, madeInEurope.fr].filter(Boolean).join("\n\n"),
  }

  let faq: CategoryFaqCms[] = []
  if (Array.isArray(d.faq)) {
    faq = d.faq.map((item, i): CategoryFaqCms => {
      const f = (item ?? {}) as Record<string, unknown>
      return {
        id: typeof f.id === "string" ? f.id : `cms-faq-${i}`,
        visible: true,
        sortOrder: i * 10,
        question: locOf(f.question),
        answer: locOf(f.answer),
      }
    })
  }

  const banners: CategoryCmsDocument["banners"] = []
  if (bannerVisible && d.banner && typeof d.banner === "object") {
    const b = d.banner as Record<string, unknown>
    const bannerTitle = locOf(b.title)
    banners.push({
      id: typeof b.id === "string" ? b.id : `cms_banner_${slug}`,
      priority: "default",
      visible: true,
      sortOrder: 0,
      title: bannerTitle,
      subtitle: subtitle.nl || subtitle.en ? subtitle : introCombined,
      ctaLabel: emptyLoc(),
      destinationUrl:
        typeof b.destination_url === "string" && b.destination_url
          ? b.destination_url
          : `/categorie/${slug}`,
      linkType: "category",
      image: typeof b.image_url === "string" ? b.image_url : undefined,
      imageAlt: bannerTitle,
      background: "",
    })
  } else if (heroVisible && heroImage) {
    banners.push({
      id: `cms_hero_${slug}`,
      priority: "default",
      visible: true,
      sortOrder: 0,
      title,
      subtitle: introCombined,
      ctaLabel: emptyLoc(),
      destinationUrl: `/categorie/${slug}`,
      linkType: "category",
      image: heroImage,
      imageAlt: title,
      background: "",
    })
  }

  const productsSort =
    d.productsSort === "newest" ||
    d.productsSort === "price_asc" ||
    d.productsSort === "price_desc"
      ? d.productsSort
      : "relevance"
  const productsLimit = Number.isFinite(Number(d.productsLimit))
    ? Math.min(96, Math.max(4, Number(d.productsLimit)))
    : 24

  return {
    ...base,
    title,
    seo: {
      ...base.seo,
      title: mergeLoc(seoTitle, title),
      metaDescription: mergeLoc(seoDescription, description),
      intro: introCombined,
      h1: title,
    },
    faq,
    banners,
    listingPresentation: {
      title: locOf(d.productsTitle),
      sort: productsSort,
      limit: productsLimit,
    },
  }
}
