/**
 * Subcategory-bound product specifications (max 10, optional in import/UI flow).
 * Distinct from free-text USPs and GPSR/compliance.
 * Reuses AttributeCatalogItem shape and attribute_definition storage.
 *
 * Definitive L1>L2>L3 catalogs (approved Excel bron) overlay legacy L2 keys.
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  type AttributeCatalogItem,
  sanitizeAttributeUnit,
  slugifyCategoryName,
  toCanonicalCategorySlug,
} from "./category-attributes"
import { resolveNlFromSellerTemplateLabel } from "./seller-template-en-catalog"

function resolveDefinitiveCatalogPath(): string | null {
  const fileName = "definitive-product-spec-catalogs.json"
  const moduleDir = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(moduleDir, "data", fileName),
    path.join(process.cwd(), "src/modules/product-cloud/data", fileName),
    path.join(
      process.cwd(),
      "apps/backend/src/modules/product-cloud/data",
      fileName
    ),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

function loadDefinitiveCatalogs(): Record<string, AttributeCatalogItem[]> {
  const filePath = resolveDefinitiveCatalogPath()
  if (!filePath) return {}
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
      catalogs?: Record<string, AttributeCatalogItem[]>
    }
    const catalogs = parsed.catalogs || {}
    for (const list of Object.values(catalogs)) {
      if (!Array.isArray(list)) continue
      for (const item of list) {
        item.unit = sanitizeAttributeUnit(item.unit)
      }
    }
    return catalogs
  } catch {
    return {}
  }
}

export const MAX_PRODUCT_SPECIFICATIONS = 10

/**
 * Historically variant-bound; the approved definitive bron still lists these as
 * product-spec slots for some paths — keep as a soft hint only (not stripped).
 */
export const VARIANT_BOUND_SPEC_CODES = new Set(["maat", "kleur"])

/**
 * Legacy L2-only catalogs (fallback when definitive L3 path has no match).
 */
const LEGACY_SUBCATEGORY_PRODUCT_SPEC_CATALOGS: Record<
  string,
  AttributeCatalogItem[]
> = {
  // Tuin → Grasmaaiers & Robots
  "grasmaaiers-robots": [
    {
      code: "maaibreedte",
      name: "Maaibreedte",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "cm",
      sort_order: 10,
    },
    {
      code: "maaihoogte",
      name: "Maaihoogte",
      data_type: "Tekst-met-eenheid",
      is_required: false,
      requirement_tier: "optional",
      sort_order: 20,
    },
    {
      code: "vermogen",
      name: "Vermogen",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "W",
      sort_order: 30,
    },
    {
      code: "aandrijving",
      name: "Aandrijving",
      data_type: "Keuzelijst",
      is_required: false,
      requirement_tier: "optional",
      option_values: ["Accu", "Benzine", "Netstroom", "Robot / autonoom", "Handmatig"],
      sort_order: 40,
    },
    {
      code: "max_oppervlakte",
      name: "Maximale oppervlakte",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "m²",
      sort_order: 50,
    },
    {
      code: "accu",
      name: "Accutype / capaciteit",
      data_type: "Tekst-met-eenheid",
      is_required: false,
      requirement_tier: "optional",
      sort_order: 60,
    },
    {
      code: "geluidsniveau",
      name: "Geluidsniveau",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "dB",
      sort_order: 70,
    },
    {
      code: "gewicht",
      name: "Gewicht",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "kg",
      sort_order: 80,
    },
  ],
  // Tuin → Tuinhandgereedschap (harken e.d.)
  tuinhandgereedschap: [
    {
      code: "werkbreedte",
      name: "Werkbreedte",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "cm",
      sort_order: 10,
    },
    {
      code: "aantal_tanden",
      name: "Aantal tanden",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      sort_order: 20,
    },
    {
      code: "materiaal",
      name: "Materiaal",
      data_type: "Tekst-met-eenheid",
      is_required: false,
      requirement_tier: "optional",
      sort_order: 30,
    },
    {
      code: "steellengte",
      name: "Steellengte",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "cm",
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
  ],
  // Tuin → Heggenscharen
  heggenscharen: [
    {
      code: "meslengte",
      name: "Meslengte",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "cm",
      sort_order: 10,
    },
    {
      code: "vermogen",
      name: "Vermogen",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "W",
      sort_order: 20,
    },
    {
      code: "aandrijving",
      name: "Aandrijving",
      data_type: "Keuzelijst",
      is_required: false,
      requirement_tier: "optional",
      option_values: ["Accu", "Benzine", "Netstroom", "Handmatig"],
      sort_order: 30,
    },
    {
      code: "gewicht",
      name: "Gewicht",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "kg",
      sort_order: 40,
    },
    {
      code: "accu",
      name: "Accutype / capaciteit",
      data_type: "Tekst-met-eenheid",
      is_required: false,
      requirement_tier: "optional",
      sort_order: 50,
    },
  ],
  // Huishouden → Robotstofzuiger
  robotstofzuiger: [
    {
      code: "zuigkracht",
      name: "Zuigkracht",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "Pa",
      sort_order: 10,
    },
    {
      code: "batterijcapaciteit",
      name: "Batterijcapaciteit",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "mAh",
      sort_order: 20,
    },
    {
      code: "werktijd",
      name: "Werktijd",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "min",
      sort_order: 30,
    },
    {
      code: "navigatietype",
      name: "Navigatietype",
      data_type: "Keuzelijst",
      is_required: false,
      requirement_tier: "optional",
      option_values: ["Laser / LiDAR", "Camera", "Gyro", "Random", "Overig"],
      sort_order: 40,
    },
    {
      code: "dweilfunctie",
      name: "Dweilfunctie",
      data_type: "Keuzelijst",
      is_required: false,
      requirement_tier: "optional",
      option_values: ["Ja", "Nee"],
      sort_order: 50,
    },
    {
      code: "stofreservoir",
      name: "Stofreservoir",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "L",
      sort_order: 60,
    },
    {
      code: "geluidsniveau",
      name: "Geluidsniveau",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "dB",
      sort_order: 70,
    },
    {
      code: "oppervlakte",
      name: "Aanbevolen oppervlakte",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "m²",
      sort_order: 80,
    },
  ],
  // Elektronica → Computers & Laptops
  "computers-laptops": [
    {
      code: "processor",
      name: "Processor",
      data_type: "Tekst-met-eenheid",
      is_required: false,
      requirement_tier: "optional",
      sort_order: 10,
    },
    {
      code: "geheugen",
      name: "Geheugen",
      data_type: "Tekst-met-eenheid",
      is_required: false,
      requirement_tier: "optional",
      unit: "GB",
      sort_order: 20,
    },
    {
      code: "opslag",
      name: "Opslag",
      data_type: "Tekst-met-eenheid",
      is_required: false,
      requirement_tier: "optional",
      unit: "GB",
      sort_order: 30,
    },
    {
      code: "scherm",
      name: "Schermformaat",
      data_type: "Numeriek",
      is_required: false,
      requirement_tier: "optional",
      unit: "inch",
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
      code: "usb-c",
      name: "USB-C",
      data_type: "Keuzelijst",
      is_required: false,
      requirement_tier: "optional",
      option_values: ["Ja", "Nee"],
      sort_order: 60,
    },
  ],
  // Kleding → Heren / Dames / … (materiaal + pasvorm; maat/kleur via varianten)
  heren: clothingSpecs(),
  dames: clothingSpecs(),
  baby: clothingSpecs(),
  kinderkleding: clothingSpecs(),
  "onderkleding-lingerie": clothingSpecs(),
}

const DEFINITIVE_CATALOGS = loadDefinitiveCatalogs()

/**
 * Managed product-spec catalogs.
 * Keys: definitive L3 slug / L3 name / full "L1 > L2 > L3" path, plus legacy L2 keys.
 * Definitive bron overlays legacy when keys collide.
 */
export const SUBCATEGORY_PRODUCT_SPEC_CATALOGS: Record<
  string,
  AttributeCatalogItem[]
> = {
  ...LEGACY_SUBCATEGORY_PRODUCT_SPEC_CATALOGS,
  ...DEFINITIVE_CATALOGS,
}

function clothingSpecs(): AttributeCatalogItem[] {
  return [
    {
      code: "materiaal",
      name: "Materiaal",
      data_type: "Tekst-met-eenheid",
      is_required: false,
      requirement_tier: "optional",
      sort_order: 10,
    },
    {
      code: "pasvorm",
      name: "Pasvorm",
      data_type: "Keuzelijst",
      is_required: false,
      requirement_tier: "optional",
      option_values: ["Slim", "Regular", "Relaxed"],
      sort_order: 20,
    },
    {
      code: "wasvoorschrift",
      name: "Wasvoorschrift",
      data_type: "Tekst-met-eenheid",
      is_required: false,
      requirement_tier: "optional",
      sort_order: 30,
    },
  ]
}

/** Alias map: alternate names → catalog key. */
const SUBCATEGORY_ALIASES: Record<string, string> = {
  grasmaaiers: "grasmaaiers-robots",
  grasmaaier: "grasmaaiers-robots",
  // slugify turns "&" into "en" → grasmaaiers-en-robots
  "grasmaaiers-en-robots": "grasmaaiers-robots",
  "grasmaaiers-robots": "grasmaaiers-robots",
  harken: "tuinhandgereedschap",
  hark: "tuinhandgereedschap",
  "tuin-handgereedschap": "tuinhandgereedschap",
  tshirts: "heren",
  "t-shirts": "heren",
  "computers-en-laptops": "computers-laptops",
}

function withoutEnToken(slug: string): string {
  return slug.replace(/-en-/g, "-")
}

export function resolveSubcategorySpecKey(
  nameOrSlug: string | null | undefined
): string {
  const raw = String(nameOrSlug || "").trim()
  if (!raw) return ""
  const canonical = toCanonicalCategorySlug(raw)
  const slugified = slugifyCategoryName(raw)
  const candidates = [
    raw,
    canonical,
    slugified,
    withoutEnToken(canonical),
    withoutEnToken(slugified),
    raw.toLowerCase(),
  ]
  for (const candidate of candidates) {
    if (!candidate) continue
    if (SUBCATEGORY_PRODUCT_SPEC_CATALOGS[candidate]) return candidate
    const aliased = SUBCATEGORY_ALIASES[candidate]
    if (aliased && SUBCATEGORY_PRODUCT_SPEC_CATALOGS[aliased]) return aliased
  }
  return withoutEnToken(canonical) || canonical
}

export function normalizeProductSpecs(
  items: AttributeCatalogItem[]
): AttributeCatalogItem[] {
  const seen = new Set<string>()
  const out: AttributeCatalogItem[] = []
  for (const item of [...items].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )) {
    if (seen.has(item.code)) continue
    seen.add(item.code)
    out.push({
      ...item,
      is_required: false,
      requirement_tier: "optional",
    })
    if (out.length >= MAX_PRODUCT_SPECIFICATIONS) break
  }
  return out
}

/**
 * Resolve product specifications for a subcategory name/slug.
 * Empty when the subcategory has no managed catalog.
 */
export function productSpecsForSubcategory(
  subcategoryNameOrSlug: string | null | undefined
): AttributeCatalogItem[] {
  const key = resolveSubcategorySpecKey(subcategoryNameOrSlug)
  if (!key) return []
  return normalizeProductSpecs(SUBCATEGORY_PRODUCT_SPEC_CATALOGS[key] || [])
}

/**
 * Prefer the most specific category name that has a catalog (typically the child).
 */
export function productSpecsForCategoryNames(
  names: Array<string | null | undefined>
): AttributeCatalogItem[] {
  const cleaned = names.map((n) => String(n || "").trim()).filter(Boolean)
  // Try from last to first (child often last in UI joins)
  for (let i = cleaned.length - 1; i >= 0; i--) {
    const specs = productSpecsForSubcategory(cleaned[i])
    if (specs.length) return specs
  }
  for (const name of cleaned) {
    const specs = productSpecsForSubcategory(name)
    if (specs.length) return specs
  }
  return []
}

export function listedSubcategorySpecKeys(): string[] {
  return Object.keys(SUBCATEGORY_PRODUCT_SPEC_CATALOGS).sort()
}

/** Excel-safe named-range key for SpecDeps columns. */
export function subcategorySpecExcelKey(nameOrSlug: string): string {
  const key = resolveSubcategorySpecKey(nameOrSlug) || slugifyCategoryName(nameOrSlug)
  const cleaned = key.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return `spec_${cleaned || "unknown"}`.slice(0, 40)
}

/**
 * Values that belong to codes no longer in the new subcategory catalog.
 */
export function orphanedSpecCodes(
  existing: Array<{ code?: string | null; value?: string | null }>,
  nextSpecs: AttributeCatalogItem[]
): string[] {
  const allowed = new Set(nextSpecs.map((s) => s.code))
  const orphans: string[] = []
  for (const row of existing) {
    const code = String(row.code || "").trim()
    if (!code || VARIANT_BOUND_SPEC_CODES.has(code)) continue
    if (!String(row.value || "").trim()) continue
    // Only warn for codes that look like product specs we manage
    const known = Object.values(SUBCATEGORY_PRODUCT_SPEC_CATALOGS).some((list) =>
      list.some((item) => item.code === code)
    )
    if (known && !allowed.has(code)) orphans.push(code)
  }
  return [...new Set(orphans)]
}

export function formatSpecDisplayValue(
  item: Pick<AttributeCatalogItem, "unit">,
  value: string
): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  const unit = sanitizeAttributeUnit(item.unit)
  if (unit && !trimmed.includes(unit)) {
    return `${trimmed} ${unit}`
  }
  return trimmed
}

/** All managed product-spec attribute codes across catalogs. */
let managedProductSpecCodesCache: Set<string> | null = null

export function allManagedProductSpecCodes(): Set<string> {
  if (managedProductSpecCodesCache) return managedProductSpecCodesCache
  const codes = new Set<string>()
  for (const list of Object.values(SUBCATEGORY_PRODUCT_SPEC_CATALOGS)) {
    for (const item of list) {
      if (!VARIANT_BOUND_SPEC_CODES.has(item.code)) codes.add(item.code)
    }
  }
  managedProductSpecCodesCache = codes
  return codes
}

export function isManagedProductSpecCode(code: string | null | undefined): boolean {
  const c = String(code || "").trim()
  if (!c || VARIANT_BOUND_SPEC_CODES.has(c)) return false
  try {
    return allManagedProductSpecCodes().has(c)
  } catch {
    return false
  }
}

function normalizeSpecLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * Map Spec 1–10 label/value slots from an import row onto attribute codes.
 * Empty values are skipped (no clear). Invalid label/value pairs become errors.
 */
export function mergeProductSpecSlotsIntoValues(
  values: Record<string, string>,
  opts: { maxSlots?: number } = {}
): {
  values: Record<string, string>
  errors: string[]
  applied: Array<{ slot: number; code: string; label: string; value: string }>
} {
  const maxSlots = opts.maxSlots ?? MAX_PRODUCT_SPECIFICATIONS
  const next = { ...values }
  const errors: string[] = []
  const applied: Array<{
    slot: number
    code: string
    label: string
    value: string
  }> = []

  const categoryRaw = String(values.category || "").trim()
  const subcategoryRaw = String(values.subcategory || "").trim()
  const subcategoryL3Raw = String(values.subcategory_l3 || "").trim()
  // English Seller template category labels → NL source names for catalog lookup.
  const category =
    resolveNlFromSellerTemplateLabel(categoryRaw) || categoryRaw
  const subcategory =
    resolveNlFromSellerTemplateLabel(subcategoryRaw) || subcategoryRaw
  const subcategoryL3 =
    resolveNlFromSellerTemplateLabel(subcategoryL3Raw) || subcategoryL3Raw
  const pathKey = [category, subcategory, subcategoryL3]
    .filter(Boolean)
    .join(" > ")
  const pathKeyRaw = [categoryRaw, subcategoryRaw, subcategoryL3Raw]
    .filter(Boolean)
    .join(" > ")
  const categoryLabel =
    subcategoryL3Raw ||
    subcategoryRaw ||
    categoryRaw ||
    subcategoryL3 ||
    subcategory ||
    category ||
    pathKey
  // Definitive tree is L1>L2>L3: when L1+L2 are set but L3 is missing, do not
  // fall back to legacy L2 catalogs (would wrongly accept specs on incomplete paths).
  // When only L2 (legacy rows) or a full L3 path is present, resolve normally.
  const incompleteThreeLevel = Boolean(category && subcategory && !subcategoryL3)
  const catalog = incompleteThreeLevel
    ? []
    : subcategoryL3
      ? productSpecsForCategoryNames([
          pathKey,
          pathKeyRaw,
          subcategoryL3,
          subcategoryL3Raw,
        ])
      : productSpecsForCategoryNames([
          subcategory,
          subcategoryRaw,
          category,
          categoryRaw,
        ])
  const byLabel = new Map(
    catalog.map((item) => [normalizeSpecLabel(item.name), item])
  )
  const byCode = new Map(catalog.map((item) => [item.code, item]))

  for (let i = 1; i <= maxSlots; i++) {
    const labelKey = `spec_label_${i}`
    const valueKey = `spec_value_${i}`
    const labelRaw = String(next[labelKey] || "").trim()
    const valueRaw = String(next[valueKey] || "").trim()
    delete next[labelKey]
    delete next[valueKey]

    if (!valueRaw) continue

    if (!categoryLabel) {
      errors.push(
        `Waarde ${i} is ingevuld zonder categoriepad; productspecificaties volgen L1 > L2 > L3.`
      )
      continue
    }
    if (!catalog.length) {
      errors.push(
        `Categorie "${categoryLabel}" heeft geen productspecificaties; Waarde ${i} wordt geweigerd.`
      )
      continue
    }

    let item: AttributeCatalogItem | undefined
    if (labelRaw) {
      // English Seller template labels → NL source names (catalog names stay NL).
      const resolvedLabel =
        resolveNlFromSellerTemplateLabel(labelRaw) || labelRaw
      item =
        byLabel.get(normalizeSpecLabel(resolvedLabel)) ||
        byLabel.get(normalizeSpecLabel(labelRaw)) ||
        byCode.get(labelRaw.toLowerCase())
      const expected = catalog[i - 1]
      if (
        item &&
        expected &&
        item.code !== expected.code &&
        normalizeSpecLabel(resolvedLabel) !== normalizeSpecLabel(expected.name) &&
        normalizeSpecLabel(labelRaw) !== normalizeSpecLabel(expected.name)
      ) {
        // Label matches a different slot in this subcategory — still accept by name.
      }
      if (!item) {
        errors.push(
          `Specificatie ${i} "${labelRaw}" hoort niet bij categorie "${categoryLabel}".`
        )
        continue
      }
    } else {
      item = catalog[i - 1]
      if (!item) {
        errors.push(
          `Waarde ${i} is ingevuld maar categorie "${categoryLabel}" heeft geen specificatie op slot ${i}.`
        )
        continue
      }
    }

    if (item.option_values?.length) {
      const allowed = new Set(
        item.option_values.map((o) => normalizeSpecLabel(o))
      )
      if (!allowed.has(normalizeSpecLabel(valueRaw))) {
        errors.push(
          `Waarde ${i} ("${valueRaw}") is niet toegestaan voor ${item.name}. Toegestaan: ${item.option_values.join(", ")}.`
        )
        continue
      }
    }

    next[item.code] = valueRaw
    applied.push({
      slot: i,
      code: item.code,
      label: item.name,
      value: valueRaw,
    })
  }

  return { values: next, errors, applied }
}

export type SpecDepsColumn = {
  key: string
  displayName: string
  labels: string[]
  /** Per-slot managed choice lists; null/empty means free-text/numeric entry. */
  optionLists: Array<string[] | null>
}

function specDepsColumnFromSpecs(
  key: string,
  displayName: string,
  specs: AttributeCatalogItem[]
): SpecDepsColumn {
  return {
    key,
    displayName,
    labels: specs.map((s) => s.name),
    optionLists: specs.map((s) =>
      s.data_type === "Keuzelijst" && s.option_values?.length
        ? [...s.option_values]
        : null
    ),
  }
}

/** SpecDeps columns for Excel: display subcategory name → labels (max 10). */
export function buildSpecDepsColumns(
  categories: Array<{ name: string; slug?: string | null; parent_id?: string | null }>
): SpecDepsColumn[] {
  const out: SpecDepsColumn[] = []
  const seenKeys = new Set<string>()
  const candidates = categories.length
    ? categories.filter((c) => c.parent_id)
    : Object.keys(SUBCATEGORY_PRODUCT_SPEC_CATALOGS).map((slug) => ({
        name: slug,
        slug,
        parent_id: "x",
      }))

  for (const cat of candidates) {
    const specs = productSpecsForSubcategory(cat.slug || cat.name)
    if (!specs.length) continue
    const key = subcategorySpecExcelKey(cat.slug || cat.name)
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    out.push(specDepsColumnFromSpecs(key, cat.name, specs))
  }

  // Ensure managed catalogs appear even when the live category tree is incomplete.
  for (const catalogKey of listedSubcategorySpecKeys()) {
    const key = subcategorySpecExcelKey(catalogKey)
    if (seenKeys.has(key)) continue
    const specs = productSpecsForSubcategory(catalogKey)
    if (!specs.length) continue
    seenKeys.add(key)
    out.push(specDepsColumnFromSpecs(key, catalogKey, specs))
  }

  return out.sort((a, b) => a.displayName.localeCompare(b.displayName, "nl"))
}

/** Excel-safe named-range key for a Keuzelijst value list of SpecDeps slot N. */
export function specValueExcelKey(specDepsKey: string, slot: number): string {
  return `${specDepsKey}_s${slot}`.slice(0, 40)
}
