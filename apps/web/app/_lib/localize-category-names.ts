import { MARKETPLACE_CATEGORIES } from "./marketplace-categories"
import { type StorefrontLocale } from "./i18n/locales"
import { categoryNavLabel, t } from "./i18n/messages"

/**
 * Map a Product Cloud / catalog category name onto the storefront
 * marketplace taxonomy slug (same resolve as PDP).
 */
export function categorySlugFromName(name: string): string | null {
  const lower = name.toLowerCase()
  const exact = MARKETPLACE_CATEGORIES.find(
    (c) => c.label.toLowerCase() === lower
  )
  if (exact) return exact.slug
  const partial = MARKETPLACE_CATEGORIES.find(
    (c) =>
      lower.includes(c.label.toLowerCase()) ||
      c.label.toLowerCase().includes(lower)
  )
  if (partial) return partial.slug
  if (lower.includes("tuin")) return "tuin"
  if (lower.includes("keuken")) return "keuken"
  if (lower.includes("elektron")) return "elektronica"
  if (lower.includes("mode") || lower.includes("kleding")) return "mode"
  if (lower.includes("woon")) return "wonen"
  if (lower.includes("sport")) return "sport"
  if (lower.includes("voeding") || lower.includes("food")) return "voeding"
  return null
}

/**
 * Localize catalog category_names with the same marketplace UI i18n as the storefront PDP.
 * Unmapped Product Cloud leaf names stay on the source string (no invented translation).
 */
export function localizeCategoryNames(
  names: string[],
  locale: StorefrontLocale
): string {
  if (names.length === 0) return t("catAlgemeen", locale)
  return names
    .map((name) => {
      const slug = categorySlugFromName(name)
      return slug ? categoryNavLabel(slug, name, locale) : name
    })
    .join(", ")
}
