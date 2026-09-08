/**
 * Product CMS editorial document — shared parse/merge for admin + storefront.
 * Product Cloud / Commerce Cloud remain source of truth for master/commerce data.
 *
 * Intro helpers are inlined (not imported from cms-product-intro) so consumer
 * `tsc` runs that follow into this package do not hit TS5097 on `.ts` extensions.
 */

export const CMS_PRODUCT_INTRO_MAX_CHARS = 320

export function stripHtmlToPlainText(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export function truncateAtWordBoundary(
  input: string,
  maxChars: number = CMS_PRODUCT_INTRO_MAX_CHARS
): string {
  const text = stripHtmlToPlainText(input)
  if (text.length <= maxChars) return text
  const slice = text.slice(0, maxChars)
  const lastSpace = slice.lastIndexOf(" ")
  if (lastSpace <= 0) return slice.trimEnd()
  return slice.slice(0, lastSpace).trimEnd()
}

export type LocalizedCms = {
  nl: string
  en: string
  de: string
  fr: string
}

export type GalleryThumbnailPosition = "left" | "under"

export type CmsProductEditorial = {
  intro: LocalizedCms
  why: LocalizedCms
  usage: LocalizedCms
  /** Optional CMS HTML overlay for description tab (sanitized on render). */
  descriptionHtml: LocalizedCms
  seoTitle: LocalizedCms
  seoDescription: LocalizedCms
  seoCanonical: string | null
  /** USP highlights — title only (legacy `body` ignored). */
  usps: Array<{ id: string; title: LocalizedCms }>
  faq: Array<{ id: string; question: LocalizedCms; answer: LocalizedCms }>
  gallery: {
    visible: boolean
    thumbnailCount: number
    thumbnailPosition: GalleryThumbnailPosition
  }
  buybox: {
    showReviews: boolean
    showPrice: boolean
    showSellers: boolean
    showStock: boolean
    showDelivery: boolean
    showBadges: boolean
  }
  /** EuropMade platform trust badges — template visibility only (not seller content). */
  trust: {
    showSafePayment: boolean
    show30DayReturn: boolean
    showMadeInEurope: boolean
    showVerifiedInfo: boolean
  }
  sections: {
    introVisible: boolean
    uspsVisible: boolean
    whyVisible: boolean
    usageVisible: boolean
    descriptionVisible: boolean
    faqVisible: boolean
    sellersVisible: boolean
    relatedVisible: boolean
    frequentlyBoughtVisible: boolean
  }
  bannerId: string | null
  bannerVisible: boolean
}

/** Canonical PDP section order for template + storefront (no drag-drop yet). */
export const PRODUCT_PAGE_SECTION_ORDER = [
  "chrome_header",
  "breadcrumb",
  "gallery",
  "buybox",
  "trust",
  "intro",
  "usps",
  "why",
  "usage",
  "sellers",
  "description",
  "related",
  "frequently_bought",
  "faq",
  "banner",
  "chrome_footer",
  "seo",
] as const

export type ProductPageSectionId = (typeof PRODUCT_PAGE_SECTION_ORDER)[number]

export function emptyLocalized(): LocalizedCms {
  return { nl: "", en: "", de: "", fr: "" }
}

export function emptyProductEditorial(): CmsProductEditorial {
  return {
    intro: emptyLocalized(),
    why: emptyLocalized(),
    usage: emptyLocalized(),
    descriptionHtml: emptyLocalized(),
    seoTitle: emptyLocalized(),
    seoDescription: emptyLocalized(),
    seoCanonical: null,
    usps: [],
    faq: [],
    gallery: {
      visible: true,
      thumbnailCount: 5,
      thumbnailPosition: "left",
    },
    buybox: {
      showReviews: true,
      showPrice: true,
      showSellers: true,
      showStock: true,
      showDelivery: true,
      showBadges: true,
    },
    trust: {
      showSafePayment: true,
      show30DayReturn: true,
      showMadeInEurope: true,
      showVerifiedInfo: true,
    },
    sections: {
      introVisible: true,
      uspsVisible: true,
      whyVisible: true,
      usageVisible: true,
      descriptionVisible: true,
      faqVisible: true,
      sellersVisible: true,
      relatedVisible: true,
      frequentlyBoughtVisible: true,
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

function localizedHasText(value: LocalizedCms): boolean {
  return Boolean(
    value.nl.trim() || value.en.trim() || value.de.trim() || value.fr.trim()
  )
}

function localizedEqual(a: LocalizedCms, b: LocalizedCms): boolean {
  return a.nl === b.nl && a.en === b.en && a.de === b.de && a.fr === b.fr
}

function normalizeIntroLocale(value: LocalizedCms): LocalizedCms {
  return {
    nl: truncateAtWordBoundary(value.nl, CMS_PRODUCT_INTRO_MAX_CHARS),
    en: truncateAtWordBoundary(value.en, CMS_PRODUCT_INTRO_MAX_CHARS),
    de: truncateAtWordBoundary(value.de, CMS_PRODUCT_INTRO_MAX_CHARS),
    fr: truncateAtWordBoundary(value.fr, CMS_PRODUCT_INTRO_MAX_CHARS),
  }
}

function parseThumbnailPosition(raw: unknown): GalleryThumbnailPosition {
  if (raw === "under" || raw === "bottom" || raw === "top") return "under"
  return "left"
}

export function parseProductEditorial(raw: unknown): CmsProductEditorial {
  const base = emptyProductEditorial()
  if (!raw || typeof raw !== "object") return base
  const d = raw as Record<string, unknown>
  const gallery = (d.gallery ?? {}) as Record<string, unknown>
  const buybox = (d.buybox ?? {}) as Record<string, unknown>
  const trust = (d.trust ?? {}) as Record<string, unknown>
  const sections = (d.sections ?? {}) as Record<string, unknown>

  const usps = Array.isArray(d.usps)
    ? d.usps.map((item, i) => {
        const u = (item ?? {}) as Record<string, unknown>
        return {
          id: typeof u.id === "string" ? u.id : `usp_${i}`,
          title: loc(u.title),
          // legacy body intentionally dropped from model
        }
      })
    : []

  const faq = Array.isArray(d.faq)
    ? d.faq
        .map((item, i) => {
          const f = (item ?? {}) as Record<string, unknown>
          return {
            id: typeof f.id === "string" ? f.id : `faq_${i}`,
            question: loc(f.question),
            answer: loc(f.answer),
          }
        })
        .filter(
          (f) =>
            f.question.nl.trim() ||
            f.question.en.trim() ||
            f.question.de.trim() ||
            f.question.fr.trim() ||
            f.answer.nl.trim() ||
            f.answer.en.trim() ||
            f.answer.de.trim() ||
            f.answer.fr.trim()
        )
    : []

  return {
    intro: normalizeIntroLocale(loc(d.intro)),
    why: loc(d.why),
    usage: loc(d.usage),
    descriptionHtml: loc(d.descriptionHtml),
    seoTitle: loc(d.seoTitle),
    seoDescription: loc(d.seoDescription),
    seoCanonical:
      typeof d.seoCanonical === "string" && d.seoCanonical.trim()
        ? d.seoCanonical.trim()
        : null,
    usps: usps.filter((u) => localizedHasText(u.title)),
    faq,
    gallery: {
      visible: gallery.visible !== false,
      thumbnailCount: Number.isFinite(Number(gallery.thumbnailCount))
        ? Math.min(12, Math.max(2, Number(gallery.thumbnailCount)))
        : 5,
      thumbnailPosition: parseThumbnailPosition(
        gallery.thumbnailPosition ?? gallery.layout
      ),
    },
    buybox: {
      showReviews: buybox.showReviews !== false,
      showPrice: buybox.showPrice !== false,
      showSellers: buybox.showSellers !== false,
      showStock: buybox.showStock !== false,
      showDelivery: buybox.showDelivery !== false,
      showBadges: buybox.showBadges !== false,
    },
    trust: {
      showSafePayment: trust.showSafePayment !== false,
      show30DayReturn: trust.show30DayReturn !== false,
      showMadeInEurope: trust.showMadeInEurope !== false,
      showVerifiedInfo: trust.showVerifiedInfo !== false,
    },
    sections: {
      introVisible: sections.introVisible !== false,
      uspsVisible: sections.uspsVisible !== false,
      whyVisible: sections.whyVisible !== false,
      usageVisible: sections.usageVisible !== false,
      descriptionVisible: sections.descriptionVisible !== false,
      faqVisible: sections.faqVisible !== false,
      sellersVisible: sections.sellersVisible !== false,
      relatedVisible: sections.relatedVisible !== false,
      frequentlyBoughtVisible: sections.frequentlyBoughtVisible !== false,
    },
    bannerId: typeof d.bannerId === "string" && d.bannerId ? d.bannerId : null,
    bannerVisible: d.bannerVisible !== false,
  }
}

/** Prefer override locale text when any locale has content; else template. */
function pickLocalizedField(
  override: LocalizedCms,
  template: LocalizedCms
): LocalizedCms {
  return localizedHasText(override) ? override : template
}

function mergeGallery(
  template: CmsProductEditorial["gallery"],
  rawGallery: unknown | undefined,
  parsed: CmsProductEditorial["gallery"]
): CmsProductEditorial["gallery"] {
  if (rawGallery == null || typeof rawGallery !== "object") return template
  const g = rawGallery as Record<string, unknown>
  return {
    visible: "visible" in g ? parsed.visible : template.visible,
    thumbnailCount:
      "thumbnailCount" in g ? parsed.thumbnailCount : template.thumbnailCount,
    thumbnailPosition:
      "thumbnailPosition" in g || "layout" in g
        ? parsed.thumbnailPosition
        : template.thumbnailPosition,
  }
}

function mergeBuybox(
  template: CmsProductEditorial["buybox"],
  rawBuybox: unknown | undefined,
  parsed: CmsProductEditorial["buybox"]
): CmsProductEditorial["buybox"] {
  if (rawBuybox == null || typeof rawBuybox !== "object") return template
  const b = rawBuybox as Record<string, unknown>
  return {
    showReviews: "showReviews" in b ? parsed.showReviews : template.showReviews,
    showPrice: "showPrice" in b ? parsed.showPrice : template.showPrice,
    showSellers: "showSellers" in b ? parsed.showSellers : template.showSellers,
    showStock: "showStock" in b ? parsed.showStock : template.showStock,
    showDelivery:
      "showDelivery" in b ? parsed.showDelivery : template.showDelivery,
    showBadges: "showBadges" in b ? parsed.showBadges : template.showBadges,
  }
}

function mergeTrust(
  template: CmsProductEditorial["trust"],
  rawTrust: unknown | undefined,
  parsed: CmsProductEditorial["trust"]
): CmsProductEditorial["trust"] {
  if (rawTrust == null || typeof rawTrust !== "object") return template
  const t = rawTrust as Record<string, unknown>
  return {
    showSafePayment:
      "showSafePayment" in t ? parsed.showSafePayment : template.showSafePayment,
    show30DayReturn:
      "show30DayReturn" in t ? parsed.show30DayReturn : template.show30DayReturn,
    showMadeInEurope:
      "showMadeInEurope" in t
        ? parsed.showMadeInEurope
        : template.showMadeInEurope,
    showVerifiedInfo:
      "showVerifiedInfo" in t
        ? parsed.showVerifiedInfo
        : template.showVerifiedInfo,
  }
}

function mergeSections(
  template: CmsProductEditorial["sections"],
  rawSections: unknown | undefined,
  parsed: CmsProductEditorial["sections"]
): CmsProductEditorial["sections"] {
  if (rawSections == null || typeof rawSections !== "object") return template
  const s = rawSections as Record<string, unknown>
  return {
    introVisible:
      "introVisible" in s ? parsed.introVisible : template.introVisible,
    uspsVisible: "uspsVisible" in s ? parsed.uspsVisible : template.uspsVisible,
    whyVisible: "whyVisible" in s ? parsed.whyVisible : template.whyVisible,
    usageVisible:
      "usageVisible" in s ? parsed.usageVisible : template.usageVisible,
    descriptionVisible:
      "descriptionVisible" in s
        ? parsed.descriptionVisible
        : template.descriptionVisible,
    faqVisible: "faqVisible" in s ? parsed.faqVisible : template.faqVisible,
    sellersVisible:
      "sellersVisible" in s ? parsed.sellersVisible : template.sellersVisible,
    relatedVisible:
      "relatedVisible" in s ? parsed.relatedVisible : template.relatedVisible,
    frequentlyBoughtVisible:
      "frequentlyBoughtVisible" in s
        ? parsed.frequentlyBoughtVisible
        : template.frequentlyBoughtVisible,
  }
}

/**
 * Merge global product template with optional per-product CMS override.
 * Empty localized content inherits from template. Presentation flags merge
 * sparsely when the override document omits keys (product need not re-save all).
 */
export function mergeProductEditorial(
  template: CmsProductEditorial,
  override: CmsProductEditorial | null
): CmsProductEditorial {
  if (!override) return template
  return {
    intro: normalizeIntroLocale(pickLocalizedField(override.intro, template.intro)),
    why: pickLocalizedField(override.why, template.why),
    usage: pickLocalizedField(override.usage, template.usage),
    descriptionHtml: pickLocalizedField(
      override.descriptionHtml,
      template.descriptionHtml
    ),
    seoTitle: pickLocalizedField(override.seoTitle, template.seoTitle),
    seoDescription: pickLocalizedField(
      override.seoDescription,
      template.seoDescription
    ),
    seoCanonical: override.seoCanonical ?? template.seoCanonical,
    usps: override.usps.length > 0 ? override.usps : template.usps,
    faq: override.faq.length > 0 ? override.faq : template.faq,
    gallery: override.gallery,
    buybox: override.buybox,
    trust: override.trust,
    sections: override.sections,
    bannerId:
      override.bannerId !== null && override.bannerId !== undefined
        ? override.bannerId
        : template.bannerId,
    bannerVisible: override.bannerVisible,
  }
}

/**
 * Sparse merge from raw product JSON so absent keys inherit the template.
 */
export function mergeProductEditorialFromRaw(
  template: CmsProductEditorial,
  productRaw: unknown | null
): CmsProductEditorial {
  if (productRaw == null || typeof productRaw !== "object") return template
  const raw = productRaw as Record<string, unknown>
  const parsed = parseProductEditorial(productRaw)

  return {
    intro:
      "intro" in raw
        ? normalizeIntroLocale(pickLocalizedField(parsed.intro, template.intro))
        : template.intro,
    why: "why" in raw ? pickLocalizedField(parsed.why, template.why) : template.why,
    usage:
      "usage" in raw
        ? pickLocalizedField(parsed.usage, template.usage)
        : template.usage,
    descriptionHtml:
      "descriptionHtml" in raw
        ? pickLocalizedField(parsed.descriptionHtml, template.descriptionHtml)
        : template.descriptionHtml,
    seoTitle:
      "seoTitle" in raw
        ? pickLocalizedField(parsed.seoTitle, template.seoTitle)
        : template.seoTitle,
    seoDescription:
      "seoDescription" in raw
        ? pickLocalizedField(parsed.seoDescription, template.seoDescription)
        : template.seoDescription,
    seoCanonical:
      "seoCanonical" in raw ? parsed.seoCanonical : template.seoCanonical,
    usps: "usps" in raw && parsed.usps.length > 0 ? parsed.usps : template.usps,
    faq: "faq" in raw && parsed.faq.length > 0 ? parsed.faq : template.faq,
    gallery: mergeGallery(template.gallery, raw.gallery, parsed.gallery),
    buybox: mergeBuybox(template.buybox, raw.buybox, parsed.buybox),
    trust: mergeTrust(template.trust, raw.trust, parsed.trust),
    sections: mergeSections(template.sections, raw.sections, parsed.sections),
    bannerId: "bannerId" in raw ? parsed.bannerId : template.bannerId,
    bannerVisible:
      "bannerVisible" in raw ? parsed.bannerVisible : template.bannerVisible,
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value)
}

/**
 * Persist only product overrides that differ from the template so later
 * template changes keep applying for untouched fields.
 */
export function buildProductEditorialOverride(
  template: CmsProductEditorial,
  current: CmsProductEditorial
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const cur = serializeProductEditorialForSave(current)

  if (!localizedEqual(cur.intro, template.intro) && localizedHasText(cur.intro)) {
    out.intro = cur.intro
  }
  if (!localizedEqual(cur.why, template.why) && localizedHasText(cur.why)) {
    out.why = cur.why
  }
  if (!localizedEqual(cur.usage, template.usage) && localizedHasText(cur.usage)) {
    out.usage = cur.usage
  }
  if (
    !localizedEqual(cur.descriptionHtml, template.descriptionHtml) &&
    localizedHasText(cur.descriptionHtml)
  ) {
    out.descriptionHtml = cur.descriptionHtml
  }
  if (
    !localizedEqual(cur.seoTitle, template.seoTitle) &&
    localizedHasText(cur.seoTitle)
  ) {
    out.seoTitle = cur.seoTitle
  }
  if (
    !localizedEqual(cur.seoDescription, template.seoDescription) &&
    localizedHasText(cur.seoDescription)
  ) {
    out.seoDescription = cur.seoDescription
  }
  if (cur.seoCanonical !== template.seoCanonical) {
    out.seoCanonical = cur.seoCanonical
  }
  if (stableJson(cur.usps) !== stableJson(template.usps)) {
    out.usps = cur.usps
  }
  if (stableJson(cur.faq) !== stableJson(template.faq)) {
    out.faq = cur.faq
  }

  const galleryPatch: Record<string, unknown> = {}
  if (cur.gallery.visible !== template.gallery.visible) {
    galleryPatch.visible = cur.gallery.visible
  }
  if (cur.gallery.thumbnailCount !== template.gallery.thumbnailCount) {
    galleryPatch.thumbnailCount = cur.gallery.thumbnailCount
  }
  if (cur.gallery.thumbnailPosition !== template.gallery.thumbnailPosition) {
    galleryPatch.thumbnailPosition = cur.gallery.thumbnailPosition
  }
  if (Object.keys(galleryPatch).length > 0) out.gallery = galleryPatch

  const buyboxPatch: Record<string, unknown> = {}
  for (const key of Object.keys(cur.buybox) as Array<
    keyof CmsProductEditorial["buybox"]
  >) {
    if (cur.buybox[key] !== template.buybox[key]) {
      buyboxPatch[key] = cur.buybox[key]
    }
  }
  if (Object.keys(buyboxPatch).length > 0) out.buybox = buyboxPatch

  const trustPatch: Record<string, unknown> = {}
  for (const key of Object.keys(cur.trust) as Array<
    keyof CmsProductEditorial["trust"]
  >) {
    if (cur.trust[key] !== template.trust[key]) {
      trustPatch[key] = cur.trust[key]
    }
  }
  if (Object.keys(trustPatch).length > 0) out.trust = trustPatch

  const sectionsPatch: Record<string, unknown> = {}
  for (const key of Object.keys(cur.sections) as Array<
    keyof CmsProductEditorial["sections"]
  >) {
    if (cur.sections[key] !== template.sections[key]) {
      sectionsPatch[key] = cur.sections[key]
    }
  }
  if (Object.keys(sectionsPatch).length > 0) out.sections = sectionsPatch

  if (cur.bannerId !== template.bannerId) out.bannerId = cur.bannerId
  if (cur.bannerVisible !== template.bannerVisible) {
    out.bannerVisible = cur.bannerVisible
  }

  return out
}

/** Serialize for API — drop legacy body; keep intro truncated. */
export function serializeProductEditorialForSave(
  doc: CmsProductEditorial
): CmsProductEditorial {
  return {
    ...doc,
    intro: normalizeIntroLocale(doc.intro),
    usps: doc.usps
      .map((u) => ({ id: u.id, title: u.title }))
      .filter((u) => localizedHasText(u.title)),
    faq: doc.faq.filter(
      (f) => localizedHasText(f.question) || localizedHasText(f.answer)
    ),
  }
}
