/**
 * Seller import: resolve Excel category text to canonical pc_category.
 * Auto-link only on exact/normalized equality — never invent a category.
 */

import {
  slugifyCategoryName,
  toCanonicalCategorySlug,
} from "./category-attributes"

export type ImportCategoryCatalogEntry = {
  id: string
  name: string
  slug: string
}

export type ImportCategoryStatus = "linked" | "suggested" | "pending"

export type ImportCategoryResolution = {
  status: ImportCategoryStatus
  raw: string
  matched: ImportCategoryCatalogEntry | null
  suggestions: ImportCategoryCatalogEntry[]
}

const STOP = new Set(["en", "de", "het", "and", "of", "voor", "the", "a"])

export function normalizeCategoryKey(value: string): string {
  return String(value || "")
    .replace(/[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/&/g, " en ")
    .replace(/[_./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export function uniqueImportCategoryCatalog(
  rows: Array<{ id: string; name: string; slug?: string | null }>
): ImportCategoryCatalogEntry[] {
  const byKey = new Map<string, ImportCategoryCatalogEntry>()
  for (const row of rows) {
    const name = String(row.name || "").trim()
    if (!name) continue
    const slug = String(row.slug || slugifyCategoryName(name)).trim()
    const key = normalizeCategoryKey(name)
    const canonical = toCanonicalCategorySlug(name)
    const next = { id: row.id, name, slug }
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, next)
      continue
    }
    if (slug === canonical && existing.slug !== canonical) {
      byKey.set(key, next)
    }
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "nl"))
}

function significantTokens(value: string): string[] {
  return normalizeCategoryKey(value)
    .split(" ")
    .filter((t) => t.length >= 4 && !STOP.has(t))
}

export function resolveImportCategory(
  rawInput: string,
  catalog: ImportCategoryCatalogEntry[]
): ImportCategoryResolution {
  const raw = String(rawInput || "")
    .replace(/[\u00a0]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!raw) {
    return { status: "pending", raw: "", matched: null, suggestions: [] }
  }

  const key = normalizeCategoryKey(raw)
  const slugs = new Set(
    [
      raw.toLowerCase(),
      slugifyCategoryName(raw),
      toCanonicalCategorySlug(raw),
    ].filter(Boolean)
  )

  const byExact = catalog.find((c) => c.id === raw)
  if (byExact) {
    return { status: "linked", raw, matched: byExact, suggestions: [] }
  }

  const linked = catalog.find((c) => {
    if (slugs.has(c.slug.toLowerCase())) return true
    if (normalizeCategoryKey(c.name) === key) return true
    if (c.name.trim().toLowerCase() === raw.toLowerCase()) return true
    if (toCanonicalCategorySlug(c.name) === toCanonicalCategorySlug(raw)) {
      return true
    }
    return false
  })
  if (linked) {
    return { status: "linked", raw, matched: linked, suggestions: [] }
  }

  const inputTokens = significantTokens(raw)
  const scored = catalog
    .map((c) => {
      const catTokens = significantTokens(c.name)
      const overlap = inputTokens.filter((t) => catTokens.includes(t)).length
      return { c, overlap }
    })
    .filter((row) => row.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.c.name.localeCompare(b.c.name, "nl"))
    .slice(0, 3)
    .map((row) => row.c)

  if (scored.length) {
    return { status: "suggested", raw, matched: null, suggestions: scored }
  }
  return { status: "pending", raw, matched: null, suggestions: [] }
}

export function applyCategoryResolution(
  values: Record<string, string>,
  catalog: ImportCategoryCatalogEntry[]
): { values: Record<string, string>; resolution: ImportCategoryResolution } {
  const overlay = String(
    values.category_override || values.category_id || ""
  ).trim()
  const originalRaw = String(values.category_raw || values.category || "")
    .replace(/[\u00a0]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const lookup = overlay || originalRaw
  const resolved = resolveImportCategory(lookup, catalog)
  const resolution: ImportCategoryResolution = {
    ...resolved,
    raw: originalRaw || resolved.raw,
  }
  const next = { ...values }
  next.category_raw = resolution.raw
  next.category_status = resolution.status
  next.category_id = resolution.matched?.id || ""
  next.category_slug = resolution.matched?.slug || ""
  next.category_suggestions = resolution.suggestions.map((s) => s.name).join("|")
  next.category = resolution.matched?.name || resolution.raw
  return { values: next, resolution }
}
