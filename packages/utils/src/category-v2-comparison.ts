/**
 * Category CMS V2 product comparison.
 * The document stores product ids and attribute codes only.
 * Values stay in Product Cloud and are never invented here.
 */

const RELIABLE_DATA_TYPES = new Set(["Numeriek", "Keuzelijst", "Tekst-met-eenheid"])

const NON_UNIT_TOKENS = new Set([
  "",
  "-",
  "nee",
  "ja",
  "no",
  "yes",
  "true",
  "false",
  "0",
  "1",
  "n",
  "y",
  "null",
  "none",
  "n/a",
  "na",
])

export type ComparisonProductRef = {
  id: string
  specs?: Array<{ code: string; value: string }>
}

export type ComparisonAttributeDef = {
  code: string
  name: string
  dataType?: string | null
  unit?: string | null
  comparable?: boolean
}

export type ComparisonSpecRow = {
  code: string
  label: string
  unit: string | null
  values: Array<string | null>
  hasValue: boolean
}

export function reliableAttributeUnit(unit: string | null | undefined): string | null {
  const trimmed = String(unit ?? "").trim()
  if (!trimmed || NON_UNIT_TOKENS.has(trimmed.toLowerCase())) return null
  return trimmed
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

/** Products in the stored order. Unknown ids are dropped. Nothing is chosen automatically. */
export function orderedComparisonProducts<T extends ComparisonProductRef>(
  products: T[],
  productIds: string[]
): T[] {
  const byId = new Map<string, T>()
  for (const product of products) {
    const id = product.id.trim()
    if (id && !byId.has(id)) byId.set(id, product)
  }
  const seen = new Set<string>()
  const selected: T[] = []
  for (const raw of productIds) {
    const id = raw.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const product = byId.get(id)
    if (product) selected.push(product)
  }
  return selected
}

function specValue(product: ComparisonProductRef, code: string): string | null {
  const wanted = norm(code)
  for (const spec of product.specs ?? []) {
    if (norm(spec.code) !== wanted) continue
    const value = spec.value.trim()
    if (value) return value
  }
  return null
}

function usableAttribute(
  attributes: ComparisonAttributeDef[],
  code: string
): ComparisonAttributeDef | null {
  const wanted = norm(code)
  const attribute = attributes.find((row) => norm(row.code) === wanted)
  if (!attribute || attribute.comparable === false) return null
  const label = attribute.name.trim()
  const dataType = attribute.dataType?.trim() ?? ""
  if (!label || !attribute.code.trim() || !RELIABLE_DATA_TYPES.has(dataType)) return null
  return attribute
}

export type FactualComparisonProduct = ComparisonProductRef & {
  slug?: string
  testCatalog?: boolean
}

/**
 * Display-only comparison when the CMS selection is empty.
 * Returns nothing unless at least two products share a comparable value.
 * Sellable products come before test products. The order is the product slug.
 */
export function factualCategoryComparison<T extends FactualComparisonProduct>(
  products: readonly T[],
  attributes: readonly ComparisonAttributeDef[],
  limit = 3
): { products: T[]; specCodes: string[] } | null {
  const usable = attributes.flatMap((attribute) => {
    const row = usableAttribute([...attributes], attribute.code)
    return row ? [row] : []
  })
  if (usable.length === 0) return null
  const scored = products
    .map((product) => ({
      product,
      codes: usable
        .filter((attribute) => specValue(product, attribute.code))
        .map((attribute) => norm(attribute.code)),
    }))
    .filter((row) => row.codes.length > 0)
    .sort((a, b) => {
      const test = Number(a.product.testCatalog === true) - Number(b.product.testCatalog === true)
      if (test !== 0) return test
      const left = (a.product.slug || a.product.id).trim()
      const right = (b.product.slug || b.product.id).trim()
      return left.localeCompare(right, "nl")
    })
  const chosen = scored.slice(0, Math.max(2, limit))
  if (chosen.length < 2) return null
  const specCodes = usable.flatMap((attribute) => {
    const key = norm(attribute.code)
    const count = chosen.filter((row) => row.codes.includes(key)).length
    return count >= 2 ? [attribute.code.trim()] : []
  })
  if (specCodes.length === 0) return null
  const contributing = chosen.filter((row) =>
    specCodes.some((code) => row.codes.includes(norm(code)))
  )
  if (contributing.length < 2) return null
  return { products: contributing.map((row) => row.product), specCodes }
}

/** Spec rows in the stored order. A missing value stays null and is not removed. */
export function comparisonSpecRows(
  specCodes: string[],
  attributes: ComparisonAttributeDef[],
  products: ComparisonProductRef[]
): ComparisonSpecRow[] {
  const seen = new Set<string>()
  const rows: ComparisonSpecRow[] = []
  for (const raw of specCodes) {
    const attribute = usableAttribute(attributes, raw)
    if (!attribute) continue
    const key = norm(attribute.code)
    if (seen.has(key)) continue
    seen.add(key)
    const values = products.map((product) => specValue(product, attribute.code))
    rows.push({
      code: attribute.code.trim(),
      label: attribute.name.trim(),
      unit: reliableAttributeUnit(attribute.unit),
      values,
      hasValue: values.some((value) => value != null),
    })
  }
  return rows
}
