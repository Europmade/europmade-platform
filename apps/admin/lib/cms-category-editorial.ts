import {
  categoryCmsDocumentFromLegacyEditorial,
  emptyCategoryLocalized,
  getBlock,
  getUspBar,
  type CategoryCmsDocumentV2,
  type CategoryCmsProfile,
} from "@europmade/utils"
import { emptyLocalized, type LocalizedCms } from "./cms-admin-api"

export type CmsCategoryFilterControl = {
  attributeKey: string
  visible: boolean
  label: LocalizedCms
  sortOrder: number
}

export type CmsCategoryBannerRef = {
  id: string
  title: LocalizedCms
  subtitle?: LocalizedCms
  cta_label?: LocalizedCms
  image_url: string | null
  destination_url: string
  background?: string | null
  presentation?: {
    fit?: "cover" | "contain"
    positionX?: number
    positionY?: number
    scale?: number
    textColor?: "white" | "black"
    buttonColor?: "white" | "black"
  } | null
  published: boolean
}

export type CmsCategoryEditorial = {
  title: LocalizedCms
  subtitle: LocalizedCms
  intro: LocalizedCms
  description: LocalizedCms
  heroImage: string | null
  heroVisible: boolean
  bannerId: string | null
  banner: CmsCategoryBannerRef | null
  bannerVisible: boolean
  productsTitle: LocalizedCms
  productsSort: "relevance" | "newest" | "price_asc" | "price_desc"
  productsLimit: number
  seoTitle: LocalizedCms
  seoDescription: LocalizedCms
  madeInEurope: LocalizedCms
  usps: Array<{ id: string; title: LocalizedCms; body: LocalizedCms; icon_key?: string }>
  faq: Array<{ id: string; question: LocalizedCms; answer: LocalizedCms }>
  filterControls: CmsCategoryFilterControl[]
  /** V2 profile when known. */
  profile?: CategoryCmsProfile
  schema_version?: 2
}

export function emptyCategoryEditorial(): CmsCategoryEditorial {
  return {
    title: emptyLocalized(),
    subtitle: emptyLocalized(),
    intro: emptyLocalized(),
    description: emptyLocalized(),
    heroImage: null,
    heroVisible: true,
    bannerId: null,
    banner: null,
    bannerVisible: true,
    productsTitle: emptyLocalized(),
    productsSort: "relevance",
    productsLimit: 24,
    seoTitle: emptyLocalized(),
    seoDescription: emptyLocalized(),
    madeInEurope: emptyLocalized(),
    usps: [],
    faq: [],
    filterControls: [],
  }
}

function loc(value: unknown): LocalizedCms {
  if (!value || typeof value !== "object") return emptyLocalized()
  const v = value as Record<string, unknown>
  return {
    nl: typeof v.nl === "string" ? v.nl : "",
    en: typeof v.en === "string" ? v.en : "",
    de: typeof v.de === "string" ? v.de : "",
    fr: typeof v.fr === "string" ? v.fr : "",
  }
}

function isStoredCategoryDocumentV2(raw: unknown): raw is CategoryCmsDocumentV2 {
  if (!raw || typeof raw !== "object") return false
  const row = raw as { schema_version?: unknown; profile?: unknown; blocks?: unknown }
  return (
    row.schema_version === 2 &&
    (row.profile === "level_1" || row.profile === "level_2" || row.profile === "level_3") &&
    Array.isArray(row.blocks)
  )
}

export function parseCategoryEditorial(raw: unknown): CmsCategoryEditorial {
  if (isStoredCategoryDocumentV2(raw)) return categoryEditorialFromV2(raw)
  return categoryEditorialFromFlat(raw)
}

function categoryEditorialFromFlat(raw: unknown): CmsCategoryEditorial {
  const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const base = emptyCategoryEditorial()
  let banner: CmsCategoryBannerRef | null = null
  if (d.banner && typeof d.banner === "object") {
    const b = d.banner as Record<string, unknown>
    banner = {
      id: typeof b.id === "string" ? b.id : "",
      title: loc(b.title),
      subtitle: loc(b.subtitle),
      cta_label: loc(b.cta_label),
      image_url: typeof b.image_url === "string" ? b.image_url : null,
      destination_url: typeof b.destination_url === "string" ? b.destination_url : "",
      background: typeof b.background === "string" ? b.background : null,
      presentation:
        b.presentation && typeof b.presentation === "object"
          ? (b.presentation as CmsCategoryBannerRef["presentation"])
          : null,
      published: b.published === true,
    }
  }
  const usps = Array.isArray(d.usps) ? d.usps : []
  const faq = Array.isArray(d.faq) ? d.faq : []
  const filters = Array.isArray(d.filterControls) ? d.filterControls : []
  return {
    ...base,
    title: loc(d.title),
    subtitle: loc(d.subtitle),
    intro: loc(d.intro),
    description: loc(d.description),
    heroImage: typeof d.heroImage === "string" ? d.heroImage : null,
    heroVisible: d.heroVisible !== false,
    bannerId: typeof d.bannerId === "string" ? d.bannerId : null,
    banner,
    bannerVisible: d.bannerVisible !== false,
    productsTitle: loc(d.productsTitle),
    productsSort:
      d.productsSort === "newest" ||
      d.productsSort === "price_asc" ||
      d.productsSort === "price_desc"
        ? d.productsSort
        : "relevance",
    productsLimit: Number.isFinite(Number(d.productsLimit))
      ? Math.min(96, Math.max(4, Number(d.productsLimit)))
      : 24,
    seoTitle: loc(d.seoTitle),
    seoDescription: loc(d.seoDescription),
    madeInEurope: loc(d.madeInEurope),
    usps: usps.map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>
      return {
        id: typeof row.id === "string" ? row.id : `usp-${index}`,
        title: loc(row.title),
        body: loc(row.body),
        icon_key: typeof row.icon_key === "string" ? row.icon_key : "",
      }
    }),
    faq: faq.map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>
      return {
        id: typeof row.id === "string" ? row.id : `faq-${index}`,
        question: loc(row.question),
        answer: loc(row.answer),
      }
    }),
    filterControls: filters.flatMap((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>
      const attributeKey = typeof row.attributeKey === "string" ? row.attributeKey.trim() : ""
      if (!attributeKey) return []
      return [
        {
          attributeKey,
          visible: row.visible !== false,
          label: loc(row.label),
          sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : index,
        },
      ]
    }),
  }
}

export function categoryEditorialFromV2(
  doc: CategoryCmsDocumentV2
): CmsCategoryEditorial {
  const hero = getBlock(doc, "hero")
  const usp = getUspBar(doc)
  const grid = getBlock(doc, "product_grid")
  const carousel = getBlock(doc, "product_carousel")
  const listing = grid ?? carousel
  const filters = getBlock(doc, "filters")
  const guide = getBlock(doc, "buying_guide")
  const why = getBlock(doc, "why_europmade")
  const legacy = (doc as CategoryCmsDocumentV2 & { legacy?: Record<string, unknown> })
    .legacy

  let banner: CmsCategoryBannerRef | null = null
  const rawBanner = hero?.banner ?? legacy?.banner
  if (rawBanner && typeof rawBanner === "object") {
    const b = rawBanner as Record<string, unknown>
    banner = {
      id: typeof b.id === "string" ? b.id : "",
      title: loc(b.title),
      subtitle: loc(b.subtitle),
      cta_label: loc(b.cta_label),
      image_url: typeof b.image_url === "string" ? b.image_url : null,
      destination_url:
        typeof b.destination_url === "string" ? b.destination_url : "",
      background: typeof b.background === "string" ? b.background : null,
      presentation:
        b.presentation && typeof b.presentation === "object"
          ? (b.presentation as CmsCategoryBannerRef["presentation"])
          : null,
      published: b.published === true,
    }
  }

  return {
    title: loc(hero?.title ?? legacy?.title),
    subtitle: loc(hero?.subtitle ?? legacy?.subtitle),
    intro: loc(hero?.intro ?? legacy?.intro),
    description: loc(doc.seo.meta_description ?? legacy?.description),
    heroImage: hero?.image_url ?? (typeof legacy?.heroImage === "string" ? legacy.heroImage : null),
    heroVisible: hero?.hero_visible !== false,
    bannerId: hero?.banner_id ?? (typeof legacy?.bannerId === "string" ? legacy.bannerId : null),
    banner,
    bannerVisible: hero?.banner_visible !== false,
    productsTitle: loc(listing?.title ?? legacy?.productsTitle),
    productsSort: listing?.sort ?? "relevance",
    productsLimit: listing?.limit ?? 24,
    seoTitle: loc(doc.seo.title),
    seoDescription: loc(doc.seo.meta_description),
    madeInEurope: loc(why?.body ?? legacy?.madeInEurope),
    usps: (usp?.slots ?? []).map((s) => ({
      id: s.id,
      title: loc(s.title),
      body: loc(s.body),
      icon_key: s.icon_key,
    })),
    faq: (guide?.faq?.length
      ? guide.faq
      : Array.isArray(legacy?.faq)
        ? (legacy.faq as Array<Record<string, unknown>>)
        : []
    ).map((f, index) => ({
      id: typeof f.id === "string" ? f.id : `faq-${index}`,
      question: loc(f.question),
      answer: loc(f.answer),
    })),
    filterControls: (filters?.controls ?? []).map((c) => ({
      attributeKey: c.attributeKey,
      visible: c.visible,
      label: loc(c.label),
      sortOrder: c.sortOrder,
    })),
    profile: doc.profile,
    schema_version: 2,
  }
}

/** Lean payload. The server assigns the taxonomy profile; the client does not guess one. */
export function categoryEditorialPayload(
  editorial: CmsCategoryEditorial
): Record<string, unknown> {
  return {
    title: editorial.title,
    subtitle: editorial.subtitle,
    intro: editorial.intro,
    description: editorial.description,
    heroImage: editorial.heroImage,
    heroVisible: editorial.heroVisible,
    bannerId: editorial.bannerId,
    banner: editorial.banner,
    bannerVisible: editorial.bannerVisible,
    productsTitle: editorial.productsTitle,
    productsSort: editorial.productsSort,
    productsLimit: editorial.productsLimit,
    seoTitle: editorial.seoTitle,
    seoDescription: editorial.seoDescription,
    madeInEurope: editorial.madeInEurope,
    usps: editorial.usps,
    faq: editorial.faq,
    filterControls: editorial.filterControls,
  }
}

/** Serialize studio state to V2 only when slug and profile are both known. */
export function serializeCategoryEditorial(
  editorial: CmsCategoryEditorial,
  opts: { slug: string; profile: CategoryCmsProfile; path_key?: string | null }
): CategoryCmsDocumentV2 {
  const profile = opts.profile
  return categoryCmsDocumentFromLegacyEditorial(
    {
      title: editorial.title,
      subtitle: editorial.subtitle,
      intro: editorial.intro,
      description: editorial.description,
      heroImage: editorial.heroImage,
      heroVisible: editorial.heroVisible,
      bannerId: editorial.bannerId,
      banner: editorial.banner,
      bannerVisible: editorial.bannerVisible,
      productsTitle: editorial.productsTitle,
      productsSort: editorial.productsSort,
      productsLimit: editorial.productsLimit,
      seoTitle: editorial.seoTitle,
      seoDescription: editorial.seoDescription,
      madeInEurope: editorial.madeInEurope,
      usps: editorial.usps.map((u) => ({
        id: u.id,
        title: u.title,
        body: u.body,
        icon_key: u.icon_key,
      })),
      faq: editorial.faq,
      filterControls: editorial.filterControls,
    },
    { slug: opts.slug, profile, path_key: opts.path_key ?? null }
  )
}

export { emptyCategoryLocalized }
