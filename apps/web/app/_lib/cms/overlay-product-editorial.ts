import { pickLocalized, type LocalizedString, type StorefrontLocale } from "../i18n/locales"
import type { PdpDetail } from "../pdp-seed"

function locOf(value: unknown): LocalizedString {
  if (!value || typeof value !== "object") {
    return { nl: "", en: "", de: "", fr: "" }
  }
  const v = value as Record<string, unknown>
  return {
    nl: typeof v.nl === "string" ? v.nl : "",
    en: typeof v.en === "string" ? v.en : "",
    de: typeof v.de === "string" ? v.de : "",
    fr: typeof v.fr === "string" ? v.fr : "",
  }
}

/**
 * Overlay published CMS editorial onto Product Cloud PDP data.
 * Does not replace Buy Box, price, gallery or specs.
 */
export function overlayProductEditorial(
  detail: PdpDetail,
  editorial: unknown,
  locale: StorefrontLocale
): PdpDetail {
  if (!editorial || typeof editorial !== "object") return detail
  const d = editorial as Record<string, unknown>
  const sections = (d.sections ?? {}) as Record<string, unknown>
  const introVisible = sections.introVisible !== false
  const uspsVisible = sections.uspsVisible !== false
  const whyVisible = sections.whyVisible !== false
  const usageVisible = sections.usageVisible !== false
  const faqVisible = sections.faqVisible !== false

  const intro = introVisible
    ? pickLocalized(locOf(d.intro), locale).trim()
    : ""
  const why = whyVisible ? pickLocalized(locOf(d.why), locale).trim() : ""
  const usage = usageVisible
    ? pickLocalized(locOf(d.usage), locale).trim()
    : ""
  const usps =
    uspsVisible && Array.isArray(d.usps)
      ? d.usps
          .map((item) => {
            const u = (item ?? {}) as Record<string, unknown>
            return pickLocalized(locOf(u.title), locale).trim()
          })
          .filter(Boolean)
      : []
  const faq =
    faqVisible && Array.isArray(d.faq)
      ? d.faq
          .map((item) => {
            const f = (item ?? {}) as Record<string, unknown>
            return {
              q: pickLocalized(locOf(f.question), locale).trim(),
              a: pickLocalized(locOf(f.answer), locale).trim(),
            }
          })
          .filter((x) => x.q || x.a)
      : []

  const extraParagraphs = [why, usage].filter(Boolean)
  return {
    ...detail,
    intro: intro || detail.intro,
    highlights: usps.length > 0 ? usps : detail.highlights,
    descriptionParagraphs:
      extraParagraphs.length > 0
        ? [...detail.descriptionParagraphs, ...extraParagraphs]
        : detail.descriptionParagraphs,
    faqs: faq.length > 0 ? faq : detail.faqs,
  }
}
