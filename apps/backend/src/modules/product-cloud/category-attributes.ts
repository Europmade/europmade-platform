/**
 * Category attribute catalogs + GPSR compliance attributes (managed config, not AI).
 * requirement_tier drives dynamic Product Form sections.
 */

export type RequirementTier =
  | "compliance_required"
  | "category_required"
  | "recommended"
  | "optional"
  | "not_applicable"

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
  requirement_tier?: RequirementTier
  unit?: string | null
  help_text?: string | null
  is_filterable?: boolean
  is_comparable?: boolean
  sort_order?: number
  option_values?: string[] | null
}

export function resolveRequirementTier(
  item: Pick<AttributeCatalogItem, "is_required" | "requirement_tier">
): RequirementTier {
  if (item.requirement_tier) return item.requirement_tier
  return item.is_required ? "category_required" : "optional"
}

/**
 * Managed EU/GPSR compliance attributes — applied to every category catalog.
 * AI may suggest fills but must not invent or waive these requirements.
 */
export const GPSR_COMPLIANCE_ATTRIBUTES: AttributeCatalogItem[] = [
  {
    code: "gpsr_manufacturer_name",
    name: "Fabrikantnaam",
    data_type: "Tekst-met-eenheid",
    is_required: true,
    requirement_tier: "compliance_required",
    sort_order: 1000,
    is_filterable: false,
    is_comparable: false,
  },
  {
    code: "gpsr_manufacturer_address",
    name: "Fabrikantadres (straat + nr)",
    data_type: "Tekst-met-eenheid",
    is_required: true,
    requirement_tier: "compliance_required",
    sort_order: 1010,
    is_filterable: false,
    is_comparable: false,
  },
  {
    code: "gpsr_manufacturer_postal_city",
    name: "Fabrikant postcode + plaats",
    data_type: "Tekst-met-eenheid",
    is_required: true,
    requirement_tier: "compliance_required",
    sort_order: 1020,
    is_filterable: false,
    is_comparable: false,
  },
  {
    code: "gpsr_manufacturer_country",
    name: "Fabrikant land",
    data_type: "Tekst-met-eenheid",
    is_required: true,
    requirement_tier: "compliance_required",
    sort_order: 1030,
    is_filterable: false,
    is_comparable: false,
  },
  {
    code: "gpsr_manufacturer_email",
    name: "Fabrikant e-mail / elektronisch contact",
    data_type: "Tekst-met-eenheid",
    is_required: true,
    requirement_tier: "compliance_required",
    sort_order: 1040,
    is_filterable: false,
    is_comparable: false,
  },
  {
    code: "gpsr_eu_responsible_name",
    name: "EU verantwoordelijke persoon / economic operator",
    data_type: "Tekst-met-eenheid",
    is_required: true,
    requirement_tier: "compliance_required",
    sort_order: 1050,
    is_filterable: false,
    is_comparable: false,
  },
  {
    code: "gpsr_eu_responsible_address",
    name: "EU verantwoordelijke — adres",
    data_type: "Tekst-met-eenheid",
    is_required: true,
    requirement_tier: "compliance_required",
    sort_order: 1060,
    is_filterable: false,
    is_comparable: false,
  },
  {
    code: "gpsr_eu_responsible_postal_city",
    name: "EU verantwoordelijke — postcode + plaats",
    data_type: "Tekst-met-eenheid",
    is_required: true,
    requirement_tier: "compliance_required",
    sort_order: 1065,
    is_filterable: false,
    is_comparable: false,
  },
  {
    code: "gpsr_eu_responsible_country",
    name: "EU verantwoordelijke — land",
    data_type: "Tekst-met-eenheid",
    is_required: true,
    requirement_tier: "compliance_required",
    sort_order: 1068,
    is_filterable: false,
    is_comparable: false,
  },
  {
    code: "gpsr_eu_responsible_contact",
    name: "EU verantwoordelijke — e-mail/telefoon",
    data_type: "Tekst-met-eenheid",
    is_required: true,
    requirement_tier: "compliance_required",
    sort_order: 1070,
    is_filterable: false,
    is_comparable: false,
  },
  {
    code: "gpsr_safety_warnings",
    name: "Veiligheidswaarschuwingen",
    data_type: "Tekst-met-eenheid",
    is_required: false,
    requirement_tier: "recommended",
    sort_order: 1080,
    is_filterable: false,
    is_comparable: false,
  },
]

/** Category-scoped attribute catalogs for seed / ensureAttributes. */
export const CATEGORY_ATTRIBUTE_CATALOGS: Record<string, AttributeCatalogItem[]> =
  {
    robotstofzuiger: [
      {
        code: "zuigkracht",
        name: "Zuigkracht",
        data_type: "Numeriek",
        is_required: true,
        requirement_tier: "category_required",
        unit: "Pa",
        help_text: "Maximale zuigkracht volgens de fabrikant.",
        sort_order: 10,
      },
      {
        code: "batterijcapaciteit",
        name: "Batterijcapaciteit",
        data_type: "Numeriek",
        is_required: true,
        requirement_tier: "category_required",
        unit: "mAh",
        help_text: "Capaciteit van de accu.",
        sort_order: 20,
      },
      {
        code: "werktijd",
        name: "Werktijd",
        data_type: "Numeriek",
        is_required: true,
        requirement_tier: "category_required",
        unit: "min",
        help_text: "Maximale werktijd per lading.",
        sort_order: 30,
      },
      {
        code: "laadtijd",
        name: "Laadtijd",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "recommended",
        unit: "min",
        sort_order: 40,
      },
      {
        code: "stofreservoir",
        name: "Stofreservoir",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "recommended",
        unit: "L",
        sort_order: 50,
      },
      {
        code: "watertank",
        name: "Watertank",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "optional",
        unit: "ml",
        sort_order: 60,
      },
      {
        code: "geluidsniveau",
        name: "Geluidsniveau",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "recommended",
        unit: "dB",
        sort_order: 70,
      },
      {
        code: "navigatietype",
        name: "Navigatietype",
        data_type: "Keuzelijst",
        is_required: false,
        requirement_tier: "recommended",
        option_values: ["Laser / LiDAR", "Camera", "Gyro", "Random", "Overig"],
        sort_order: 80,
      },
      {
        code: "dweilfunctie",
        name: "Dweilfunctie",
        data_type: "Keuzelijst",
        is_required: false,
        requirement_tier: "recommended",
        option_values: ["Ja", "Nee"],
        sort_order: 90,
      },
      {
        code: "hepa_filter",
        name: "HEPA-filter",
        data_type: "Keuzelijst",
        is_required: false,
        requirement_tier: "optional",
        option_values: ["Ja", "Nee"],
        sort_order: 100,
      },
      {
        code: "automatisch_legen",
        name: "Automatisch legen",
        data_type: "Keuzelijst",
        is_required: false,
        requirement_tier: "optional",
        option_values: ["Ja", "Nee"],
        sort_order: 110,
      },
      {
        code: "obstakeldetectie",
        name: "Obstakeldetectie",
        data_type: "Keuzelijst",
        is_required: false,
        requirement_tier: "optional",
        option_values: ["Ja", "Nee"],
        sort_order: 120,
      },
      {
        code: "oppervlakte",
        name: "Aanbevolen oppervlakte",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "optional",
        unit: "m²",
        sort_order: 130,
      },
    ],
    elektronica: [
      {
        code: "processor",
        name: "Processor",
        data_type: "Tekst-met-eenheid",
        is_required: true,
        requirement_tier: "category_required",
        sort_order: 10,
      },
      {
        code: "geheugen",
        name: "Geheugen",
        data_type: "Tekst-met-eenheid",
        is_required: true,
        requirement_tier: "category_required",
        unit: "GB",
        sort_order: 20,
      },
      {
        code: "opslag",
        name: "Opslag",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        requirement_tier: "recommended",
        unit: "GB",
        sort_order: 30,
      },
      {
        code: "scherm",
        name: "Schermformaat",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "recommended",
        unit: "inch",
        sort_order: 40,
      },
      {
        code: "batterij",
        name: "Batterij",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        requirement_tier: "optional",
        sort_order: 50,
      },
      {
        code: "gewicht",
        name: "Gewicht",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "optional",
        unit: "kg",
        sort_order: 60,
      },
      {
        code: "usb-c",
        name: "USB-C",
        data_type: "Keuzelijst",
        is_required: false,
        requirement_tier: "optional",
        option_values: ["Ja", "Nee"],
        sort_order: 70,
      },
    ],
    tuin: [
      {
        code: "vermogen",
        name: "Vermogen",
        data_type: "Numeriek",
        is_required: true,
        requirement_tier: "category_required",
        unit: "W",
        sort_order: 10,
      },
      {
        code: "maaibreedte",
        name: "Maaibreedte",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "recommended",
        unit: "cm",
        sort_order: 20,
      },
      {
        code: "max_oppervlakte",
        name: "Maximale oppervlakte",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "recommended",
        unit: "m²",
        sort_order: 25,
      },
      {
        code: "accu",
        name: "Accutype / capaciteit",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        requirement_tier: "recommended",
        sort_order: 30,
      },
      {
        code: "maaihoogte",
        name: "Maaihoogte",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        requirement_tier: "optional",
        sort_order: 35,
      },
      {
        code: "helling",
        name: "Max. hellingspercentage",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "optional",
        unit: "%",
        sort_order: 36,
      },
      {
        code: "geluidsniveau",
        name: "Geluidsniveau",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "optional",
        unit: "dB",
        sort_order: 37,
      },
      {
        code: "navigatie",
        name: "Navigatiemethode",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        requirement_tier: "optional",
        sort_order: 38,
      },
      {
        code: "werkduur",
        name: "Werkduur",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        requirement_tier: "optional",
        unit: "min",
        sort_order: 40,
      },
      {
        code: "gewicht",
        name: "Gewicht",
        data_type: "Numeriek",
        is_required: false,
        requirement_tier: "optional",
        unit: "kg",
        sort_order: 50,
      },
      {
        code: "elektrisch",
        name: "Elektrisch",
        data_type: "Keuzelijst",
        is_required: true,
        requirement_tier: "category_required",
        option_values: ["Ja", "Nee"],
        sort_order: 60,
      },
      {
        code: "wifi",
        name: "WiFi",
        data_type: "Keuzelijst",
        is_required: false,
        requirement_tier: "optional",
        option_values: ["Ja", "Nee"],
        sort_order: 70,
      },
      {
        code: "app",
        name: "App-besturing",
        data_type: "Keuzelijst",
        is_required: false,
        requirement_tier: "optional",
        option_values: ["Ja", "Nee"],
        sort_order: 80,
      },
    ],
    mode: [
      {
        code: "maat",
        name: "Maat",
        data_type: "Keuzelijst",
        is_required: true,
        requirement_tier: "category_required",
        option_values: ["XS", "S", "M", "L", "XL"],
        sort_order: 10,
      },
      {
        code: "materiaal",
        name: "Materiaal",
        data_type: "Tekst-met-eenheid",
        is_required: true,
        requirement_tier: "category_required",
        sort_order: 20,
      },
      {
        code: "kleur",
        name: "Kleur",
        data_type: "Tekst-met-eenheid",
        is_required: false,
        requirement_tier: "recommended",
        sort_order: 30,
      },
      {
        code: "pasvorm",
        name: "Pasvorm",
        data_type: "Keuzelijst",
        is_required: false,
        requirement_tier: "optional",
        option_values: ["Slim", "Regular", "Relaxed"],
        sort_order: 40,
      },
    ],
  }

/** Merge category catalog + GPSR compliance (compliance always present). */
export const MANUAL_LANGUAGE_OPTIONS = [
  "Nederlands",
  "Engels",
  "Duits",
  "Frans",
  "Spaans",
  "Italiaans",
  "Pools",
  "Portugees",
  "Zweeds",
  "Deens",
  "Noors",
  "Fins",
  "Universeel",
  "Geen taal",
] as const

export const MULTI_SELECT_ATTRIBUTE_CODES = new Set([
  "product_languages",
  "manual_languages",
])

/** Categories that typically fall under CE product-safety directives. */
export function categoryRequiresCeMarking(
  slug: string | null | undefined,
  categoryNames: string[] = []
): boolean {
  const hay = [slug || "", ...categoryNames].join(" ").toLowerCase()
  return /elektr|electron|robot|stofzuig|vacuum|apparaat|machine|lader|adapter/.test(
    hay
  )
}

export function categoryRequiresElectronicsExtras(
  slug: string | null | undefined,
  categoryNames: string[] = []
): boolean {
  return categoryRequiresCeMarking(slug, categoryNames)
}

function sharedChoiceAttributes(
  slug: string | null | undefined
): AttributeCatalogItem[] {
  const electronics = categoryRequiresElectronicsExtras(slug, [])
  return [
    {
      code: "ce_marking",
      name: "CE-markering",
      data_type: "Keuzelijst",
      is_required: true,
      requirement_tier: "compliance_required",
      option_values: ["Zichtbaar", "Niet van toepassing"],
      help_text:
        "Kies Zichtbaar als het product een CE-markering draagt. Dan is CE-bewijs verplicht tot goedkeuring. Niet van toepassing: geen CE-document nodig.",
      sort_order: 900,
      is_filterable: false,
      is_comparable: false,
    },
    {
      code: "app_required",
      name: "App vereist voor volledige functionaliteit",
      data_type: "Keuzelijst",
      is_required: electronics,
      requirement_tier: electronics ? "category_required" : "optional",
      option_values: ["Ja", "Nee"],
      sort_order: 910,
      is_filterable: false,
      is_comparable: false,
    },
    {
      code: "collects_data",
      name: "Verwerkt dit product gegevens van gebruikers?",
      data_type: "Keuzelijst",
      is_required: electronics,
      requirement_tier: electronics ? "category_required" : "optional",
      option_values: ["Ja", "Nee"],
      help_text:
        "Nee: het product verwerkt geen gebruikersgegevens, dus het datagebruikdocument is niet nodig. Ja: het product verwerkt wel gebruikersgegevens (bijvoorbeeld via app, account, camera, microfoon, locatie of cloud) en het document is verplicht tot goedkeuring. Elektronisch zijn is op zichzelf niet genoeg.",
      sort_order: 920,
      is_filterable: false,
      is_comparable: false,
    },
    {
      code: "product_languages",
      name: "Producttaal",
      data_type: "Keuzelijst",
      is_required: false,
      requirement_tier: "recommended",
      option_values: [...MANUAL_LANGUAGE_OPTIONS],
      sort_order: 930,
      is_filterable: false,
      is_comparable: false,
    },
    {
      code: "manual_languages",
      name: "Taal handleiding",
      data_type: "Keuzelijst",
      is_required: electronics,
      requirement_tier: electronics ? "category_required" : "recommended",
      option_values: [...MANUAL_LANGUAGE_OPTIONS],
      sort_order: 940,
      is_filterable: false,
      is_comparable: false,
    },
  ]
}

/** Map category slug/name to a managed catalog key. */
export function resolveCatalogKey(
  slug: string | null | undefined,
  categoryNames: string[] = []
): string {
  const hay = [slug || "", ...categoryNames].join(" ").toLowerCase()
  if (/robot|stofzuig|vacuum/.test(hay)) return "robotstofzuiger"
  if (/elektr|electron|apparaat/.test(hay)) return "elektronica"
  if (/heggensch|tuin|maaier|grasmaai/.test(hay)) return "tuin"
  if (/schoen|shoe|mode|kleding|fashion/.test(hay)) return "mode"
  return slug || ""
}

/** Merge category catalog + GPSR + shared CE/app/data/language choices. */
export function catalogForCategorySlug(slug: string | null | undefined): AttributeCatalogItem[] {
  const key = resolveCatalogKey(slug)
  const base = CATEGORY_ATTRIBUTE_CATALOGS[key] ?? CATEGORY_ATTRIBUTE_CATALOGS[slug || ""] ?? []
  const codes = new Set(base.map((i) => i.code))
  const extra = [
    ...GPSR_COMPLIANCE_ATTRIBUTES,
    ...sharedChoiceAttributes(key || slug),
  ].filter((i) => !codes.has(i.code))
  return [...base, ...extra]
}

/**
 * Universal import/template fields only (GPSR + shared compliance).
 * Category-specific fields (maat, wifi, zuigkracht, …) are NOT included.
 */
export function universalImportFields(): AttributeCatalogItem[] {
  const byCode = new Map<string, AttributeCatalogItem>()
  for (const item of GPSR_COMPLIANCE_ATTRIBUTES) {
    byCode.set(item.code, item)
  }
  for (const item of sharedChoiceAttributes("algemeen")) {
    if (!byCode.has(item.code)) byCode.set(item.code, item)
  }
  return [...byCode.values()]
}

/** @deprecated Use universalImportFields — general template must stay category-free. */
export function uniqueCatalogFieldsForImport(): AttributeCatalogItem[] {
  return universalImportFields()
}

/** Category-specific fields after the import row's category is known. */
export function categorySpecificFieldsForNames(
  names: Array<string | null | undefined>
): AttributeCatalogItem[] {
  const byCode = new Map<string, AttributeCatalogItem>()
  for (const name of names) {
    if (!name?.trim()) continue
    const key = resolveCatalogKey(slugifyCategoryName(name), [name])
    const items = CATEGORY_ATTRIBUTE_CATALOGS[key] ?? []
    for (const item of items) byCode.set(item.code, item)
  }
  return [...byCode.values()]
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
