import { applyCategoryFilterControls } from "./storefront-presentation.ts"

export type CategoryV2Sort = "relevance" | "newest" | "price_asc" | "price_desc"

export type CategoryV2Spec = {
  code: string
  value: string
}

export type CategoryV2AttributeDef = {
  code: string
  name: string
  dataType: string
}

export type CategoryV2FilterControlInput = {
  attributeKey: string
  visible: boolean
  label: string
  sortOrder: number
}

export type CategoryV2FilterFacet = {
  attributeKey: string
  /** Codes that describe the same specification. Matching uses every code. */
  attributeKeys?: string[]
  label: string
  type: "checkbox" | "range"
  options: Array<{ value: string; label: string; count: number }>
  min: number | null
  max: number | null
}

export type CategoryV2FilterSelection = {
  values?: string[]
  min?: number | null
  max?: number | null
}

type SortableProduct = {
  title: string
  priceCents: number
  publishedAt?: string | null
  specs?: CategoryV2Spec[]
}

function norm(value: string): string {
  return value.trim().toLocaleLowerCase("nl")
}

export function specNumber(value: string): number | null {
  const match = value.trim().replace(/\s/g, "").replace(",", ".").match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function specsFor(product: { specs?: CategoryV2Spec[] }, code: string): CategoryV2Spec[] {
  const key = norm(code)
  return (product.specs ?? []).filter((spec) => spec.code.trim() && norm(spec.code) === key && spec.value.trim())
}

function facetCodes(facet: Pick<CategoryV2FilterFacet, "attributeKey" | "attributeKeys">): string[] {
  const extra = (facet.attributeKeys ?? []).map((code) => code.trim()).filter(Boolean)
  const codes = extra.length > 0 ? extra : [facet.attributeKey]
  return [...new Set(codes)]
}

function specsForFacet(
  product: { specs?: CategoryV2Spec[] },
  facet: Pick<CategoryV2FilterFacet, "attributeKey" | "attributeKeys">
): CategoryV2Spec[] {
  return facetCodes(facet).flatMap((code) => specsFor(product, code))
}

const VALUE_LABELS: Record<string, string> = {
  white: "Wit",
  black: "Zwart",
  grey: "Grijs",
  gray: "Grijs",
  silver: "Zilver",
  left: "Links",
  right: "Rechts",
  dutch: "Nederlands",
  yes: "Ja",
  no: "Nee",
  true: "Ja",
  false: "Nee",
}

/** Stored value stays the filter key. The label is the Dutch word when that word is known. */
export function consumerFilterValueLabel(value: string): string {
  const clean = value.trim()
  return VALUE_LABELS[norm(clean)] ?? clean
}

function labelKey(label: string): string {
  const key = norm(label).replace(/[^a-z0-9]+/g, "")
  if (key === "energielabel" || key === "energieklasse") return "energieklasse"
  if (key === "geluid" || key === "geluidsniveau") return "geluidsniveau"
  return key
}

/** Same label, including Energielabel/Energieklasse and Geluid/Geluidsniveau. */
export function categoryFacetLabelKey(label: string): string {
  return labelKey(label)
}

export type CategoryListingQuery = {
  filters: string[]
  mins: string[]
  maxs: string[]
}

export function categoryListingQueryFromSearch(
  raw: Record<string, string | string[] | undefined>
): CategoryListingQuery {
  const list = (key: string) => {
    const value = raw[key]
    if (!value) return []
    return (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter(Boolean)
  }
  return { filters: list("f"), mins: list("min"), maxs: list("max") }
}

export function categoryListingQueryIsEmpty(query: CategoryListingQuery): boolean {
  return query.filters.length === 0 && query.mins.length === 0 && query.maxs.length === 0
}

function splitListingQuery(raw: string): { label: string; value: string } | null {
  const index = raw.indexOf(":")
  if (index <= 0) return null
  const label = raw.slice(0, index).trim()
  const value = raw.slice(index + 1).trim()
  if (!label || !value) return null
  return { label, value }
}

/**
 * Turns `f`, `min` and `max` query parts into the existing filter selection.
 * A part is ignored when that facet or value is not on the page.
 */
export function selectionFromListingQuery(
  facets: CategoryV2FilterFacet[],
  query: CategoryListingQuery
): Record<string, CategoryV2FilterSelection> {
  const selection: Record<string, CategoryV2FilterSelection> = {}
  const facetFor = (label: string) =>
    facets.find((facet) => labelKey(facet.label) === labelKey(label))
  for (const raw of query.filters) {
    const parts = splitListingQuery(raw)
    if (!parts) continue
    const facet = facetFor(parts.label)
    if (!facet || facet.type !== "checkbox") continue
    const wanted = norm(parts.value)
    const option = facet.options.find((item) => norm(item.value) === wanted || norm(item.label) === wanted)
    if (!option) continue
    const current = selection[facet.attributeKey]?.values ?? []
    if (current.includes(option.value)) continue
    selection[facet.attributeKey] = { ...selection[facet.attributeKey], values: [...current, option.value] }
  }
  const applyRange = (raws: string[], field: "min" | "max") => {
    for (const raw of raws) {
      const parts = splitListingQuery(raw)
      if (!parts) continue
      const facet = facetFor(parts.label)
      if (!facet || facet.type !== "range") continue
      const parsed = Number(parts.value.replace(",", "."))
      if (!Number.isFinite(parsed)) continue
      selection[facet.attributeKey] = { ...selection[facet.attributeKey], [field]: parsed }
    }
  }
  applyRange(query.mins, "min")
  applyRange(query.maxs, "max")
  return selection
}

const SKIP_SPEC_CODES = new Set(["ean", "gtin", "sku", "mpn", "identifier", "id"])

function blockedSpec(code: string, name: string): boolean {
  const blob = `${code} ${name}`.toLocaleLowerCase("nl")
  return /gpsr|fabrikant|verantwoordelijke|economic operator|e-mail|email|telefoon|website|adres|postcode|straat|ce-markering|ce markering|gegevens van gebruikers|app vereist|handleiding/.test(blob)
}

function contactHeavy(values: string[]): boolean {
  if (values.length === 0) return false
  const hits = values.filter((value) => {
    const text = value.trim()
    return text.includes("@") || /^https?:/i.test(text) || /straße|straat/i.test(text) || /\bgmbh\b|\bb\.v\.|\b b\.v\b/i.test(text) || text.length > 48
  }).length
  return hits > 0 && hits * 2 >= values.length
}

function looksNumeric(value: string): boolean {
  return /^-?\d+(?:[.,]\d+)?(?:\s*[a-zA-Z%°/]+)?$/.test(value.trim())
}

/**
 * Filter definitions follow the specifications that products in this category
 * actually have. An empty attribute and an identifier are left out.
 * A stored filterable flag is not required.
 */
export function categoryV2FilterAttributes(
  definitions: Array<CategoryV2AttributeDef & { filterable?: boolean }>,
  products: Array<{ specs?: CategoryV2Spec[] }>
): CategoryV2AttributeDef[] {
  const valuesByCode = new Map<string, string[]>()
  for (const product of products) {
    const seen = new Set<string>()
    for (const spec of product.specs ?? []) {
      const code = spec.code.trim()
      const value = spec.value.trim()
      if (!code || !value) continue
      const key = norm(code)
      if (SKIP_SPEC_CODES.has(key) || seen.has(key)) continue
      seen.add(key)
      const list = valuesByCode.get(key) ?? []
      list.push(value)
      valuesByCode.set(key, list)
    }
  }

  const used = new Set<string>()
  const result: CategoryV2AttributeDef[] = []
  for (const definition of definitions) {
    const code = definition.code.trim()
    if (!code) continue
    const key = norm(code)
    if (SKIP_SPEC_CODES.has(key) || used.has(key)) continue
    const values = valuesByCode.get(key) ?? []
    used.add(key)
    if (values.length === 0) continue
    if (blockedSpec(code, definition.name) || contactHeavy(values)) continue
    result.push({
      code,
      name: definition.name.trim() || code,
      dataType: definition.dataType === "Numeriek" || values.every(looksNumeric) ? "Numeriek" : definition.dataType,
    })
  }
  for (const [key, values] of valuesByCode) {
    if (used.has(key) || values.length === 0 || contactHeavy(values)) continue
    const sample = products
      .flatMap((product) => product.specs ?? [])
      .find((spec) => norm(spec.code) === key)
    const code = sample?.code.trim() || key
    if (blockedSpec(code, code)) continue
    result.push({
      code,
      name: code,
      dataType: values.every(looksNumeric) ? "Numeriek" : "Keuzelijst",
    })
  }
  return result
}

export function productMatchesCategoryV2Filters(
  product: { specs?: CategoryV2Spec[] },
  facets: Array<Pick<CategoryV2FilterFacet, "attributeKey" | "type">>,
  selection: Record<string, CategoryV2FilterSelection | undefined>
): boolean {
  for (const facet of facets) {
    const chosen = selection[facet.attributeKey]
    if (!chosen) continue
    const rows = specsForFacet(product, facet)
    if (facet.type === "checkbox") {
      const values = (chosen.values ?? []).map(norm).filter(Boolean)
      if (values.length === 0) continue
      const hit = rows.some((row) => values.includes(norm(row.value)))
      if (!hit) return false
      continue
    }
    const min = chosen.min
    const max = chosen.max
    const hasMin = min != null && Number.isFinite(min)
    const hasMax = max != null && Number.isFinite(max)
    if (!hasMin && !hasMax) continue
    const numbers = rows
      .map((row) => specNumber(row.value))
      .filter((value): value is number => value != null)
    if (numbers.length === 0) return false
    const ok = numbers.some((value) => {
      if (hasMin && value < (min as number)) return false
      if (hasMax && value > (max as number)) return false
      return true
    })
    if (!ok) return false
  }
  return true
}

export function sortCategoryV2Products<T extends SortableProduct>(
  products: T[],
  sort: CategoryV2Sort
): T[] {
  const copy = products.slice()
  if (sort === "relevance") return copy
  if (sort === "newest") {
    return copy.sort((a, b) => {
      const at = a.publishedAt ? Date.parse(a.publishedAt) : Number.NaN
      const bt = b.publishedAt ? Date.parse(b.publishedAt) : Number.NaN
      const aOk = Number.isFinite(at)
      const bOk = Number.isFinite(bt)
      if (aOk && bOk && at !== bt) return bt - at
      if (aOk !== bOk) return aOk ? -1 : 1
      return 0
    })
  }
  return copy.sort((a, b) => {
    const aOk = Number.isFinite(a.priceCents) && a.priceCents > 0
    const bOk = Number.isFinite(b.priceCents) && b.priceCents > 0
    if (aOk && bOk && a.priceCents !== b.priceCents) {
      return sort === "price_asc" ? a.priceCents - b.priceCents : b.priceCents - a.priceCents
    }
    if (aOk !== bOk) return aOk ? -1 : 1
    return 0
  })
}

export function paginateCategoryV2Products<T>(
  products: T[],
  page: number,
  pageSize: number
): { page: number; pages: number; items: T[] } {
  const size = Math.max(1, Math.floor(pageSize) || 1)
  const pages = Math.max(1, Math.ceil(products.length / size))
  const current = Math.min(pages, Math.max(1, Math.floor(page) || 1))
  const start = (current - 1) * size
  return { page: current, pages, items: products.slice(start, start + size) }
}

export function applyCategoryV2FacetCounts(
  facets: CategoryV2FilterFacet[],
  products: Array<{ specs?: CategoryV2Spec[] }>,
  selection: Record<string, CategoryV2FilterSelection | undefined>
): CategoryV2FilterFacet[] {
  return facets.map((facet) => {
    const others = facets.filter((item) => item.attributeKey !== facet.attributeKey)
    const pool = products.filter((product) => productMatchesCategoryV2Filters(product, others, selection))
    if (facet.type === "range") return facet
    return {
      ...facet,
      options: facet.options.map((option) => ({
        ...option,
        count: pool.filter((product) =>
          productMatchesCategoryV2Filters(product, [facet], {
            [facet.attributeKey]: { values: [option.value] },
          })
        ).length,
      })),
    }
  })
}

function mergeSameFacets(facets: CategoryV2FilterFacet[]): CategoryV2FilterFacet[] {
  const order: string[] = []
  const groups = new Map<string, CategoryV2FilterFacet>()
  for (const facet of facets) {
    const key = `${facet.type}:${labelKey(facet.label)}`
    const existing = groups.get(key)
    if (!existing) {
      order.push(key)
      groups.set(key, { ...facet, attributeKeys: facetCodes(facet), options: facet.options.map((option) => ({ ...option })) })
      continue
    }
    existing.attributeKeys = [...new Set([...facetCodes(existing), ...facetCodes(facet)])]
    if (existing.type === "range" && facet.type === "range") {
      const mins = [existing.min, facet.min].filter((value): value is number => value != null)
      const maxs = [existing.max, facet.max].filter((value): value is number => value != null)
      existing.min = mins.length > 0 ? Math.min(...mins) : null
      existing.max = maxs.length > 0 ? Math.max(...maxs) : null
      continue
    }
    const byValue = new Map(existing.options.map((option) => [option.value, option]))
    for (const option of facet.options) {
      if (!byValue.has(option.value)) byValue.set(option.value, { ...option })
    }
    existing.options = [...byValue.values()].sort((left, right) => left.label.localeCompare(right.label, "nl"))
  }
  return order.map((key) => groups.get(key)!)
}

export function buildCategoryV2Facets(
  attributes: CategoryV2AttributeDef[],
  products: Array<{ specs?: CategoryV2Spec[] }>,
  controls: CategoryV2FilterControlInput[]
): CategoryV2FilterFacet[] {
  const facets: CategoryV2FilterFacet[] = []
  for (const attribute of attributes) {
    const code = attribute.code.trim()
    if (!code) continue
    const values = new Map<string, { label: string; count: number }>()
    const numbers: number[] = []
    for (const product of products) {
      const rows = specsFor(product, code)
      const seenOnProduct = new Set<string>()
      for (const row of rows) {
        const key = norm(row.value)
        if (!key || seenOnProduct.has(key)) continue
        seenOnProduct.add(key)
        const current = values.get(key)
        if (current) current.count += 1
        else values.set(key, { label: consumerFilterValueLabel(row.value), count: 1 })
        if (attribute.dataType === "Numeriek") {
          const parsed = specNumber(row.value)
          if (parsed != null) numbers.push(parsed)
        }
      }
    }
    if (attribute.dataType === "Numeriek") {
      if (numbers.length === 0) continue
      facets.push({
        attributeKey: code,
        attributeKeys: [code],
        label: attribute.name.trim() || code,
        type: "range",
        options: [],
        min: Math.min(...numbers),
        max: Math.max(...numbers),
      })
      continue
    }
    if (values.size === 0) continue
    facets.push({
      attributeKey: code,
      attributeKeys: [code],
      label: attribute.name.trim() || code,
      type: "checkbox",
      options: [...values.entries()]
        .map(([value, row]) => ({ value, label: row.label, count: row.count }))
        .sort((a, b) => a.label.localeCompare(b.label, "nl")),
      min: null,
      max: null,
    })
  }

  const active = controls.filter((control) => control.attributeKey.trim())
  const ordered = (() => {
    if (active.length === 0) return facets
    const facetKeys = new Set(facets.map((facet) => facet.attributeKey))
    const matching = active.filter((control) => facetKeys.has(control.attributeKey.trim()))
    // A stored control whose key is not a real facet must not hide the automatic filters.
    if (matching.length === 0) return facets
    const visible = new Set(
      matching.filter((control) => control.visible).map((control) => control.attributeKey.trim())
    )
    return applyCategoryFilterControls(
      facets.filter((facet) => visible.has(facet.attributeKey)),
      matching
    )
  })()
  return applyCategoryV2FacetCounts(mergeSameFacets(ordered), products, {})
}
