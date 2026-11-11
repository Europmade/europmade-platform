/**
 * Admin productcategorie-dropdown.
 * Eén optie per canonieke hoofdcategorie. Duplicaten, test- en cataloguskeys
 * blijven in de database; ze verschijnen alleen als het product er al aan hangt.
 */

/** Alias-slug → canonieke slug (de variant met children / productlinks). */
const CANONICAL_SLUG: Record<string, string> = {
  "beauty-verzorging": "beauty-en-verzorging",
  "baby-kind": "baby-en-kind",
  "klus-gereedschap": "klus-en-gereedschap",
  "auto-en-motor": "auto-motor",
  "boeken-en-media": "boeken-media",
  "juwelen-en-horloges": "juwelen-horloges",
  "tassen-accessoires": "tassen-en-accessoires",
  "plant-bloem": "plant-en-bloem",
  "feest-en-seizoen": "feest-seizoen",
}

/** Geen storefront-hoofdcategorie. Blijft beschikbaar als het product eraan gekoppeld is. */
const HIDDEN_UNLESS_SELECTED = new Set([
  "mode",
  "duurzaam",
  "robotstofzuiger",
  "heggenscharen",
])

export type AdminCategoryChoice = {
  id: string
  name: string
  slug?: string | null
  parent_id?: string | null
  link_count?: number
}

function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function canonicalCategoryGroupKey(row: {
  name?: string | null
  slug?: string | null
}): string {
  const slug = (row.slug || "").trim().toLowerCase()
  const raw = slug || slugify(row.name || "")
  return CANONICAL_SLUG[raw] ?? raw
}

function isTechnicalRoot(row: AdminCategoryChoice, key: string): boolean {
  if (HIDDEN_UNLESS_SELECTED.has(key)) return true
  return /^e2e\b/i.test(row.name.trim())
}

/**
 * Hoofdcategorieën voor de Admin-dropdown.
 * Bij een duplicaat wint de categorie die al op het product staat, anders de
 * categorie met de meeste productkoppelingen, anders de canonieke slug.
 */
export function adminParentCategoryOptions(
  categories: AdminCategoryChoice[],
  selectedIds: string[] = []
): AdminCategoryChoice[] {
  const selected = new Set(selectedIds.filter(Boolean))
  const groups = new Map<string, AdminCategoryChoice[]>()
  const forced: AdminCategoryChoice[] = []
  for (const row of categories) {
    if (row.parent_id) continue
    const key = canonicalCategoryGroupKey(row)
    if (isTechnicalRoot(row, key)) {
      if (selected.has(row.id)) forced.push(row)
      continue
    }
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  const out = [...forced]
  for (const [key, rows] of groups) {
    const selectedRow = rows.find((row) => selected.has(row.id))
    if (selectedRow) {
      out.push(selectedRow)
      continue
    }
    const ranked = [...rows].sort((a, b) => {
      const byLinks = (b.link_count ?? 0) - (a.link_count ?? 0)
      if (byLinks !== 0) return byLinks
      const aCanon = (a.slug || "").trim().toLowerCase() === key ? 1 : 0
      const bCanon = (b.slug || "").trim().toLowerCase() === key ? 1 : 0
      return bCanon - aCanon
    })
    out.push(ranked[0])
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "nl"))
}
