/**
 * Pure helpers for Product Cloud central layer (ADR-0037) — unit-testable.
 */

export function slugifyCategoryName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export type AttributeCatalogItem = {
  code: string
  name: string
  data_type: "Numeriek" | "Keuzelijst" | "Tekst-met-eenheid"
  is_required: boolean
  unit?: string | null
  is_filterable?: boolean
  is_comparable?: boolean
  sort_order?: number
  option_values?: string[] | null
}

/** Category-scoped attribute catalogs for seed / ensureAttributes. */
export const CATEGORY_ATTRIBUTE_CATALOGS: Record<string, AttributeCatalogItem[]> =
  {
    elektronica: [
      {
        code: "processor",
        name: "Processor",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        sort_order: 10,
      },
      {
        code: "geheugen",
        name: "Geheugen",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        unit: "GB",
        sort_order: 20,
      },
      {
        code: "opslag",
        name: "Opslag",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        unit: "GB",
        sort_order: 30,
      },
      {
        code: "scherm",
        name: "Schermformaat",
        data_type: "Numeriek",
        is_required: false,
        unit: "inch",
        sort_order: 40,
      },
      {
        code: "batterij",
        name: "Batterij",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        sort_order: 50,
      },
      {
        code: "gewicht",
        name: "Gewicht",
        data_type: "Numeriek",
        is_required: false,
        unit: "kg",
        sort_order: 60,
      },
      {
        code: "usb-c",
        name: "USB-C",
        data_type: "Keuzelijst",
        is_required: false,
        option_values: ["Ja", "Nee"],
        sort_order: 70,
      },
    ],
    tuin: [
      {
        code: "vermogen",
        name: "Vermogen",
        data_type: "Numeriek",
        is_required: false,
        unit: "W",
        sort_order: 10,
      },
      {
        code: "maaibreedte",
        name: "Maaibreedte",
        data_type: "Numeriek",
        is_required: false,
        unit: "cm",
        sort_order: 20,
      },
      {
        code: "accu",
        name: "Accutype",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        sort_order: 30,
      },
      {
        code: "werkduur",
        name: "Werkduur",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        unit: "min",
        sort_order: 40,
      },
      {
        code: "gewicht",
        name: "Gewicht",
        data_type: "Numeriek",
        is_required: false,
        unit: "kg",
        sort_order: 50,
      },
      {
        code: "elektrisch",
        name: "Elektrisch",
        data_type: "Keuzelijst",
        is_required: false,
        option_values: ["Ja", "Nee"],
        sort_order: 60,
      },
    ],
    mode: [
      {
        code: "maat",
        name: "Maat",
        data_type: "Keuzelijst",
        is_required: false,
        option_values: ["XS", "S", "M", "L", "XL"],
        sort_order: 10,
      },
      {
        code: "materiaal",
        name: "Materiaal",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        sort_order: 20,
      },
      {
        code: "kleur",
        name: "Kleur",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        sort_order: 30,
      },
      {
        code: "pasvorm",
        name: "Pasvorm",
        data_type: "Keuzelijst",
        is_required: false,
        option_values: ["Slim", "Regular", "Relaxed"],
        sort_order: 40,
      },
    ],
  }

export function parseUseCaseTags(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : []
  } catch {
    return []
  }
}

export function serializeUseCaseTags(tags: string[]): string {
  return JSON.stringify([...new Set(tags.map((t) => t.trim()).filter(Boolean))])
}

/** Match products to a toplist persona using use_case_tags (no ranking). */
export function productMatchesUseCase(
  useCaseTagsJson: string | null | undefined,
  persona: string
): boolean {
  const tags = parseUseCaseTags(useCaseTagsJson).map((t) => t.toLowerCase())
  return tags.includes(persona.toLowerCase())
}
