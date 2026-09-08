import { emptyLocalized, type LocalizedCms } from "./cms-admin-api"

export type CmsProductEditorial = {
  intro: LocalizedCms
  why: LocalizedCms
  usage: LocalizedCms
  seoTitle: LocalizedCms
  seoDescription: LocalizedCms
  usps: Array<{ id: string; title: LocalizedCms; body: LocalizedCms }>
  faq: Array<{ id: string; question: LocalizedCms; answer: LocalizedCms }>
  /** Presentation only — Product Cloud remains source of truth for product data. */
  gallery: {
    visible: boolean
    thumbnailCount: number
    layout: "left" | "top"
  }
  buybox: {
    showReviews: boolean
    showPrice: boolean
    showSellers: boolean
    showStock: boolean
    showDelivery: boolean
    showBadges: boolean
  }
  sections: {
    introVisible: boolean
    uspsVisible: boolean
    whyVisible: boolean
    usageVisible: boolean
    descriptionVisible: boolean
    faqVisible: boolean
  }
  bannerId: string | null
  bannerVisible: boolean
}

export function emptyProductEditorial(): CmsProductEditorial {
  return {
    intro: emptyLocalized(),
    why: emptyLocalized(),
    usage: emptyLocalized(),
    seoTitle: emptyLocalized(),
    seoDescription: emptyLocalized(),
    usps: [],
    faq: [],
    gallery: { visible: true, thumbnailCount: 5, layout: "left" },
    buybox: {
      showReviews: true,
      showPrice: true,
      showSellers: true,
      showStock: true,
      showDelivery: true,
      showBadges: true,
    },
    sections: {
      introVisible: true,
      uspsVisible: true,
      whyVisible: true,
      usageVisible: true,
      descriptionVisible: true,
      faqVisible: true,
    },
    bannerId: null,
    bannerVisible: true,
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

export function parseProductEditorial(raw: unknown): CmsProductEditorial {
  const base = emptyProductEditorial()
  if (!raw || typeof raw !== "object") return base
  const d = raw as Record<string, unknown>
  const gallery = (d.gallery ?? {}) as Record<string, unknown>
  const buybox = (d.buybox ?? {}) as Record<string, unknown>
  const sections = (d.sections ?? {}) as Record<string, unknown>
  return {
    intro: loc(d.intro),
    why: loc(d.why),
    usage: loc(d.usage),
    seoTitle: loc(d.seoTitle),
    seoDescription: loc(d.seoDescription),
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
    gallery: {
      visible: gallery.visible !== false,
      thumbnailCount: Number.isFinite(Number(gallery.thumbnailCount))
        ? Math.min(12, Math.max(2, Number(gallery.thumbnailCount)))
        : 5,
      layout: gallery.layout === "top" ? "top" : "left",
    },
    buybox: {
      showReviews: buybox.showReviews !== false,
      showPrice: buybox.showPrice !== false,
      showSellers: buybox.showSellers !== false,
      showStock: buybox.showStock !== false,
      showDelivery: buybox.showDelivery !== false,
      showBadges: buybox.showBadges !== false,
    },
    sections: {
      introVisible: sections.introVisible !== false,
      uspsVisible: sections.uspsVisible !== false,
      whyVisible: sections.whyVisible !== false,
      usageVisible: sections.usageVisible !== false,
      descriptionVisible: sections.descriptionVisible !== false,
      faqVisible: sections.faqVisible !== false,
    },
    bannerId: typeof d.bannerId === "string" ? d.bannerId : null,
    bannerVisible: d.bannerVisible !== false,
  }
}
