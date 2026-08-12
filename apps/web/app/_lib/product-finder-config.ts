/**
 * Product Finder — stabiele vraag-/optie-IDs (programmatisch), labels via messages.ts.
 * Antwoordwaarden zijn slugs/keys, nooit vertaalde UI-tekst.
 */

export type ProductFinderQuestionId = "usage_area" | "search_term" | "preferences"

export type ProductFinderOptionId =
  | "any_category"
  | "category_tuin"
  | "category_wonen"
  | "category_elektronica"
  | "category_mode"
  | "category_sport"
  | "country_any"
  | "country_nl"
  | "country_de"
  | "country_fr"
  | "verified_only"

export type ProductFinderSelectOption = {
  id: ProductFinderOptionId
  /** Marketplace category slug — alleen voor usage_area-opties */
  categorySlug?: string
  /** ISO landcode — alleen voor preferences */
  countryCode?: string
  verified?: boolean
}

export type ProductFinderStep =
  | {
      id: ProductFinderQuestionId
      kind: "select"
      options: ProductFinderSelectOption[]
    }
  | {
      id: "search_term"
      kind: "text"
    }
  | {
      id: "preferences"
      kind: "preferences"
      countryOptions: ProductFinderSelectOption[]
    }

export const PRODUCT_FINDER_STEPS: ProductFinderStep[] = [
  {
    id: "usage_area",
    kind: "select",
    options: [
      { id: "any_category" },
      { id: "category_tuin", categorySlug: "tuin" },
      { id: "category_wonen", categorySlug: "wonen" },
      { id: "category_elektronica", categorySlug: "elektronica" },
      { id: "category_mode", categorySlug: "mode" },
      { id: "category_sport", categorySlug: "sport" },
    ],
  },
  { id: "search_term", kind: "text" },
  {
    id: "preferences",
    kind: "preferences",
    countryOptions: [
      { id: "country_any" },
      { id: "country_nl", countryCode: "NL" },
      { id: "country_de", countryCode: "DE" },
      { id: "country_fr", countryCode: "FR" },
    ],
  },
]

export function productFinderMessageKey(
  kind: "question" | "option",
  id: string
): `productFinderQuestion_${string}` | `productFinderOption_${string}` {
  return kind === "question"
    ? (`productFinderQuestion_${id}` as `productFinderQuestion_${string}`)
    : (`productFinderOption_${id}` as `productFinderOption_${string}`)
}
