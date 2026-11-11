/**
 * L1 + optional L2 + optional L3 category assignment for Product Cloud (pc_category).
 * IDs only — names are display labels, not the primary key.
 * Backwards compatible: 2-level selections still resolve (parent + child).
 */

import { canonicalCategoryGroupKey } from "./admin-category-choices.ts"

export type CategoryTreeNode = {
  id: string
  name?: string
  slug?: string | null
  parent_id?: string | null
  parent_category_id?: string | null
  link_count?: number
}

function parentOf(row: CategoryTreeNode): string | null {
  return row.parent_id ?? row.parent_category_id ?? null
}

function depthOf(
  row: CategoryTreeNode,
  byId: Map<string, CategoryTreeNode>
): number {
  let depth = 1
  let pid = parentOf(row)
  const seen = new Set<string>()
  while (pid && !seen.has(pid)) {
    seen.add(pid)
    depth++
    const parent = byId.get(pid)
    if (!parent) break
    pid = parentOf(parent)
  }
  return depth
}

/**
 * Derive L1 / L2 / L3 from existing product category link IDs.
 * Prefers the deepest selected node and walks parents for the path.
 */
export function resolveCategorySelection(
  categories: CategoryTreeNode[],
  selectedIds: string[]
): {
  parentId: string
  childId: string
  l3Id: string
  categoryIds: string[]
} {
  const byId = new Map(categories.map((row) => [row.id, row]))
  const selected = [...new Set(selectedIds.filter(Boolean))]
  const selectedRows = selected
    .map((id) => byId.get(id))
    .filter((row): row is CategoryTreeNode => Boolean(row))

  if (!selectedRows.length) {
    return { parentId: "", childId: "", l3Id: "", categoryIds: [] }
  }

  // Deepest selected node wins as the leaf of the path.
  const ranked = [...selectedRows].sort(
    (a, b) => depthOf(b, byId) - depthOf(a, byId)
  )
  const leaf = ranked[0]
  const chain: CategoryTreeNode[] = [leaf]
  let pid = parentOf(leaf)
  const seen = new Set<string>([leaf.id])
  while (pid && !seen.has(pid)) {
    seen.add(pid)
    const parent = byId.get(pid)
    if (!parent) break
    chain.unshift(parent)
    pid = parentOf(parent)
  }

  const parentId = chain[0]?.id || ""
  const childId = chain[1]?.id || ""
  const l3Id = chain[2]?.id || ""
  const categoryIds = [parentId, childId, l3Id].filter(Boolean)
  return {
    parentId,
    childId,
    l3Id,
    categoryIds: [...new Set(categoryIds)],
  }
}

/**
 * Normalize and validate an L1 (+ optional L2 + optional L3) assignment.
 * Returns canonical category_ids to persist, or an error message.
 */
export function normalizeCategoryAssignment(
  categories: CategoryTreeNode[],
  input: {
    parentId?: string | null
    childId?: string | null
    l3Id?: string | null
    categoryIds?: string[]
  }
):
  | {
      ok: true
      categoryIds: string[]
      parentId: string
      childId: string
      l3Id: string
    }
  | { ok: false; message: string } {
  const byId = new Map(categories.map((row) => [row.id, row]))
  let parentId = (input.parentId || "").trim()
  let childId = (input.childId || "").trim()
  let l3Id = (input.l3Id || "").trim()
  const rawIds = [
    ...new Set((input.categoryIds || []).map((id) => id.trim()).filter(Boolean)),
  ]

  if (!parentId && !childId && !l3Id && rawIds.length) {
    const resolved = resolveCategorySelection(categories, rawIds)
    parentId = resolved.parentId
    childId = resolved.childId
    l3Id = resolved.l3Id
    for (const id of rawIds) {
      if (id !== parentId && id !== childId && id !== l3Id) {
        return {
          ok: false,
          message: "De gekozen categorieën horen niet bij elkaar.",
        }
      }
    }
  }

  if (!parentId) {
    return { ok: false, message: "Kies een hoofdcategorie." }
  }

  const parent = byId.get(parentId)
  if (!parent) {
    return { ok: false, message: "De gekozen hoofdcategorie bestaat niet." }
  }
  if (parentOf(parent)) {
    return {
      ok: false,
      message: "De hoofdcategorie mag geen subcategorie zijn.",
    }
  }

  if (!childId) {
    if (l3Id) {
      return {
        ok: false,
        message: "Kies eerst een subcategorie (niveau 2) vóór niveau 3.",
      }
    }
    return {
      ok: true,
      categoryIds: [parentId],
      parentId,
      childId: "",
      l3Id: "",
    }
  }

  const child = byId.get(childId)
  if (!child) {
    return { ok: false, message: "De gekozen subcategorie bestaat niet." }
  }
  if (parentOf(child) !== parentId) {
    return {
      ok: false,
      message: "De subcategorie hoort niet bij de gekozen hoofdcategorie.",
    }
  }

  if (!l3Id) {
    return {
      ok: true,
      categoryIds: [parentId, childId],
      parentId,
      childId,
      l3Id: "",
    }
  }

  const l3 = byId.get(l3Id)
  if (!l3) {
    return { ok: false, message: "De gekozen categorie op niveau 3 bestaat niet." }
  }
  if (parentOf(l3) !== childId) {
    return {
      ok: false,
      message: "Niveau 3 hoort niet bij de gekozen subcategorie.",
    }
  }

  return {
    ok: true,
    categoryIds: [parentId, childId, l3Id],
    parentId,
    childId,
    l3Id,
  }
}

/** Root categories for seller/admin parent dropdowns (Mode stays selectable if already linked). */
export function sellerParentCategoryOptions(
  categories: CategoryTreeNode[],
  selectedIds: string[] = []
): CategoryTreeNode[] {
  const selected = new Set(selectedIds.filter(Boolean))
  const hiddenUnlessSelected = new Set([
    "mode",
    "duurzaam",
    "algemeen",
    "robotstofzuiger",
    "heggenscharen",
  ])
  const roots = categories.filter((row) => {
    if (parentOf(row)) return false
    const slug = (row.slug || "").trim().toLowerCase()
    if (hiddenUnlessSelected.has(slug) && !selected.has(row.id)) return false
    if (/^e2e\b/i.test((row.name || "").trim()) && !selected.has(row.id)) return false
    return true
  })

  // One option per canonical name/slug group — never show synonym duplicates.
  const groups = new Map<string, CategoryTreeNode[]>()
  for (const row of roots) {
    const key = canonicalCategoryGroupKey(row)
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  const out: CategoryTreeNode[] = []
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
      if (bCanon !== aCanon) return bCanon - aCanon
      return (a.name || "").localeCompare(b.name || "", "nl")
    })
    out.push(ranked[0])
  }
  return out.sort((a, b) => (a.name || "").localeCompare(b.name || "", "nl"))
}

/** Wrong-level / legacy L2–L3 choices: hide unless already on the product. */
const HIDDEN_CHILD_SLUGS_UNLESS_SELECTED = new Set([
  "robotstofzuiger",
  "alles-in-robotstofzuiger",
])

export function sellerChildCategoryOptions(
  categories: CategoryTreeNode[],
  parentId: string,
  selectedIds: string[] = []
): CategoryTreeNode[] {
  if (!parentId) return []
  const selected = new Set(selectedIds.filter(Boolean))
  return categories
    .filter((row) => parentOf(row) === parentId)
    .filter((row) => {
      const slug = (row.slug || "").trim().toLowerCase()
      if (!HIDDEN_CHILD_SLUGS_UNLESS_SELECTED.has(slug)) return true
      return selected.has(row.id)
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "nl"))
}

/** L3 options under a selected L2. */
export function sellerL3CategoryOptions(
  categories: CategoryTreeNode[],
  l2Id: string,
  selectedIds: string[] = []
): CategoryTreeNode[] {
  return sellerChildCategoryOptions(categories, l2Id, selectedIds)
}
