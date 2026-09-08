/**
 * Central Product Page resolve: template → product override → PDP presentation.
 * Preview and live storefront must call the same helpers.
 */

import {
  mergeProductEditorialFromRaw,
  parseProductEditorial,
  type CmsProductEditorial,
  type GalleryThumbnailPosition,
} from "./product-editorial"
import {
  pickLocalized,
  type LocalizedString,
  type StorefrontLocale,
} from "../i18n/locales"
import {
  CMS_PRODUCT_INTRO_MAX_CHARS,
  sanitizeCmsHtml,
  truncateAtWordBoundary,
} from "@europmade/utils"
import type { PdpDetail, PdpSellerFaq } from "../pdp-seed"
import type { StoreCmsBanner } from "./fetch-store-cms"

export type ResolvedProductPresentation = {
  editorial: CmsProductEditorial
  galleryVisible: boolean
  thumbnailPosition: GalleryThumbnailPosition
  thumbnailCount: number
  buybox: CmsProductEditorial["buybox"]
  trust: CmsProductEditorial["trust"]
  sections: CmsProductEditorial["sections"]
  intro: string
  highlights: string[]
  why: string
  usage: string
  descriptionHtml: string | null
  descriptionVisible: boolean
  faqs: Array<{ q: string; a: string }>
  bannerId: string | null
  bannerVisible: boolean
  seoTitle: string
  seoDescription: string
  seoCanonical: string | null
}

export type ResolvedProductPage = {
  detail: PdpDetail
  presentation: ResolvedProductPresentation
  banner: StoreCmsBanner | null
}

function asLocalized(value: LocalizedString | { nl: string; en: string; de: string; fr: string }) {
  return value as LocalizedString
}

/**
 * Combine seller-level (general) + product FAQs + product CMS FAQ into one list.
 * Same `id` is rendered once. Empty Q/A skipped. No platform-generated fallbacks.
 */
export function mergeSellerFaqs(input: {
  productCmsFaqs: Array<{ id?: string; q: string; a: string }>
  sellerFaqs: PdpSellerFaq[]
}): Array<{ q: string; a: string }> {
  const out: Array<{ q: string; a: string }> = []
  const seenIds = new Set<string>()

  function push(id: string | undefined, q: string, a: string) {
    const qt = q.trim()
    const at = a.trim()
    if (!qt && !at) return
    if (id) {
      if (seenIds.has(id)) return
      seenIds.add(id)
    }
    out.push({ q: qt, a: at })
  }

  for (const f of input.sellerFaqs) {
    if (f.scope !== "general") continue
    push(f.id, f.q, f.a)
  }
  for (const f of input.sellerFaqs) {
    if (f.scope !== "product") continue
    push(f.id, f.q, f.a)
  }
  for (const f of input.productCmsFaqs) {
    push(f.id, f.q, f.a)
  }
  return out
}

export function resolveProductPresentation(
  templateRaw: unknown | null,
  productRaw: unknown | null,
  locale: StorefrontLocale,
  detail: PdpDetail
): ResolvedProductPresentation {
  const template = parseProductEditorial(templateRaw ?? {})
  const editorial = mergeProductEditorialFromRaw(template, productRaw)
  const s = editorial.sections

  // introVisible=false → hide completely (no Product Cloud fallback).
  // introVisible=true → CMS intro when set, else Product Cloud intro.
  // Always truncate to CMS_PRODUCT_INTRO_MAX_CHARS (CMS and PC fallback).
  let intro = ""
  if (s.introVisible) {
    const introRaw = pickLocalized(asLocalized(editorial.intro), locale).trim()
    const source = introRaw || detail.intro || ""
    intro = source
      ? truncateAtWordBoundary(source, CMS_PRODUCT_INTRO_MAX_CHARS)
      : ""
  }

  const highlights =
    s.uspsVisible && editorial.usps.length > 0
      ? editorial.usps
          .map((u) => pickLocalized(asLocalized(u.title), locale).trim())
          .filter(Boolean)
      : detail.highlights

  // Seller-owned editorial overlays (CMS interim channel until seller BO).
  // Never invent platform copy when content is missing.
  const why = s.whyVisible
    ? pickLocalized(asLocalized(editorial.why), locale).trim()
    : ""
  const usage = s.usageVisible
    ? pickLocalized(asLocalized(editorial.usage), locale).trim()
    : ""

  const descriptionHtmlRaw = s.descriptionVisible
    ? pickLocalized(asLocalized(editorial.descriptionHtml), locale).trim()
    : ""
  const descriptionHtml = descriptionHtmlRaw
    ? sanitizeCmsHtml(descriptionHtmlRaw)
    : null

  // faqVisible=false → hide completely.
  // faqVisible=true → merge product CMS FAQ + seller FAQs (general + product)
  // into one storefront list. No EuropMade platform FAQ fallback.
  let faqs: Array<{ q: string; a: string }> = []
  if (s.faqVisible) {
    faqs = mergeSellerFaqs({
      productCmsFaqs: editorial.faq.map((f) => ({
        id: f.id,
        q: pickLocalized(asLocalized(f.question), locale).trim(),
        a: pickLocalized(asLocalized(f.answer), locale).trim(),
      })),
      sellerFaqs: detail.sellerFaqs ?? [],
    })
  }

  return {
    editorial,
    galleryVisible: editorial.gallery.visible,
    thumbnailPosition: editorial.gallery.thumbnailPosition,
    thumbnailCount: editorial.gallery.thumbnailCount,
    buybox: editorial.buybox,
    trust: editorial.trust,
    sections: editorial.sections,
    intro,
    highlights,
    why,
    usage,
    descriptionHtml: descriptionHtml && descriptionHtml.trim() ? descriptionHtml : null,
    descriptionVisible: s.descriptionVisible,
    faqs,
    bannerId: editorial.bannerVisible ? editorial.bannerId : null,
    bannerVisible: editorial.bannerVisible && Boolean(editorial.bannerId),
    seoTitle: pickLocalized(asLocalized(editorial.seoTitle), locale).trim(),
    seoDescription: pickLocalized(
      asLocalized(editorial.seoDescription),
      locale
    ).trim(),
    seoCanonical: editorial.seoCanonical,
  }
}

export function applyPresentationToDetail(
  detail: PdpDetail,
  presentation: ResolvedProductPresentation
): PdpDetail {
  // Trust resolveProductPresentation for intro/faqs visibility (empty = hidden).
  return {
    ...detail,
    intro: presentation.intro,
    highlights:
      presentation.highlights.length > 0
        ? presentation.highlights
        : detail.highlights,
    faqs: presentation.faqs,
  }
}

export function pickBannerById(
  banners: StoreCmsBanner[] | null | undefined,
  bannerId: string | null,
  opts?: { requirePublished?: boolean }
): StoreCmsBanner | null {
  if (!bannerId || !banners?.length) return null
  const requirePublished = opts?.requirePublished !== false
  return (
    banners.find((b) => {
      if (b.id !== bannerId) return false
      if (!b.visible) return false
      if (requirePublished && !b.published) return false
      return true
    }) ?? null
  )
}

/**
 * Build resolved product page from catalog detail + CMS docs + banner library.
 */
export function resolveProductPage(input: {
  detail: PdpDetail
  locale: StorefrontLocale
  templateDocument: unknown | null
  productDocument: unknown | null
  banners?: StoreCmsBanner[] | null
  /** Preview may show library banners that are not yet published. */
  preview?: boolean
}): ResolvedProductPage {
  const presentation = resolveProductPresentation(
    input.templateDocument,
    input.productDocument,
    input.locale,
    input.detail
  )
  const detail = applyPresentationToDetail(input.detail, presentation)
  const banner = presentation.bannerVisible
    ? pickBannerById(input.banners, presentation.bannerId, {
        requirePublished: !input.preview,
      })
    : null
  return { detail, presentation, banner }
}
