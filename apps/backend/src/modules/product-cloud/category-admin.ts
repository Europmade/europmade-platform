/**
 * Admin-taxonomie helpers (ADR-0042). Geen extra pc_category-kolommen.
 */

export const CATEGORY_FORMER_SLUG_FIELD = "former_slug"
export const CATEGORY_PROPOSAL_ENTITY_ID = "__category_proposal__"

export type CategoryParentRow = {
  id: string
  parent_category_id?: string | null
}

export function wouldCreateParentCycle(
  categories: CategoryParentRow[],
  categoryId: string,
  newParentId: string | null | undefined
): boolean {
  if (!newParentId) return false
  if (newParentId === categoryId) return true
  const parentById = new Map(
    categories.map((c) => [c.id, c.parent_category_id ?? null])
  )
  const seen = new Set<string>()
  let cursor: string | null = newParentId
  while (cursor) {
    if (cursor === categoryId) return true
    if (seen.has(cursor)) return true
    seen.add(cursor)
    cursor = parentById.get(cursor) ?? null
  }
  return false
}

export function parentIdOf(
  category: {
    parent_category_id?: string | null
    parent_category?: { id?: string } | string | null
  }
): string | null {
  if (typeof category.parent_category_id === "string") {
    return category.parent_category_id
  }
  if (
    category.parent_category &&
    typeof category.parent_category === "object" &&
    typeof category.parent_category.id === "string"
  ) {
    return category.parent_category.id
  }
  return null
}
