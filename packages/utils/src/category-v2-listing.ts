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

export function productMatchesCategoryV2Filters(
  product: { specs?: CategoryV2Spec[] },
  facets: Array<Pick<CategoryV2FilterFacet, "attributeKey" | "type">>,
  selection: Record<string, CategoryV2FilterSelection | undefined>
): boolean {
  for (const facet of facets) {
    const chosen = selection[facet.attributeKey]
    if (!chosen) continue
    const rows = specsFor(product, facet.attributeKey)
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
        else values.set(key, { label: row.value.trim(), count: 1 })
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
}
