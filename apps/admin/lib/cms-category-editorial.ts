import { emptyLocalized, type LocalizedCms } from "./cms-admin-api"

export type CmsCategoryBannerRef = {
  id: string
  title: LocalizedCms
  image_url: string | null
  destination_url: string
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
  usps: Array<{ id: string; title: LocalizedCms; body: LocalizedCms }>
  faq: Array<{ id: string; question: LocalizedCms; answer: LocalizedCms }>
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

export function parseCategoryEditorial(raw: unknown): CmsCategoryEditorial {
  const base = emptyCategoryEditorial()
  if (!raw || typeof raw !== "object") return base
  const d = raw as Record<string, unknown>
  const sort =
    d.productsSort === "newest" ||
    d.productsSort === "price_asc" ||
    d.productsSort === "price_desc"
      ? d.productsSort
      : "relevance"
  let banner: CmsCategoryBannerRef | null = null
  if (d.banner && typeof d.banner === "object") {
    const b = d.banner as Record<string, unknown>
    banner = {
      id: typeof b.id === "string" ? b.id : "",
      title: loc(b.title),
      image_url: typeof b.image_url === "string" ? b.image_url : null,
      destination_url:
        typeof b.destination_url === "string" ? b.destination_url : "",
      published: b.published === true,
    }
  }
  return {
    title: loc(d.title),
    subtitle: loc(d.subtitle),
    intro: loc(d.intro),
    description: loc(d.description),
    heroImage: typeof d.heroImage === "string" ? d.heroImage : null,
    heroVisible: d.heroVisible !== false,
    bannerId: typeof d.bannerId === "string" ? d.bannerId : banner?.id || null,
    banner,
    bannerVisible: d.bannerVisible !== false,
    productsTitle: loc(d.productsTitle),
    productsSort: sort,
    productsLimit: Number.isFinite(Number(d.productsLimit))
      ? Math.min(96, Math.max(4, Number(d.productsLimit)))
      : 24,
    seoTitle: loc(d.seoTitle),
    seoDescription: loc(d.seoDescription),
    madeInEurope: loc(d.madeInEurope),
    usps: Array.isArray(d.usps)
      ? d.usps.map((item, i) => {
          const u = (item ?? {}) as Record<string, unknown>
          return {
            id: typeof u.id === "string" ? u.id : `usp_${i}`,
            title: loc(u.title),
            body: loc(u.body),
          }
        })
      : [],
    faq: Array.isArray(d.faq)
      ? d.faq.map((item, i) => {
          const f = (item ?? {}) as Record<string, unknown>
          return {
            id: typeof f.id === "string" ? f.id : `faq_${i}`,
            question: loc(f.question),
            answer: loc(f.answer),
          }
        })
      : [],
  }
}
