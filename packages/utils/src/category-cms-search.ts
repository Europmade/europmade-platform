/**
 * In-memory search over the category tree already loaded by CMS category admin.
 * A query does not read or write category data.
 */

export type CategoryCmsSearchRow = {
  id: string
  name: string
  slug: string | null
  parentId: string | null
}

function clean(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

export function categoryCmsSearchAncestors(
  row: CategoryCmsSearchRow,
  byId: ReadonlyMap<string, CategoryCmsSearchRow>
): CategoryCmsSearchRow[] {
  const chain: CategoryCmsSearchRow[] = []
  const seen = new Set<string>([row.id])
  let parentId = row.parentId
  while (parentId && !seen.has(parentId)) {
    const parent = byId.get(parentId)
    if (!parent) break
    seen.add(parent.id)
    chain.unshift(parent)
    parentId = parent.parentId
  }
  return chain
}

export function categoryCmsSearchRoute(
  row: CategoryCmsSearchRow,
  byId: ReadonlyMap<string, CategoryCmsSearchRow>
): string {
  return [...categoryCmsSearchAncestors(row, byId), row]
    .map((item) => item.name.trim() || item.slug?.trim() || item.id)
    .join(" / ")
}

/** 0 = level 1. */
export function categoryCmsSearchDepth(
  row: CategoryCmsSearchRow,
  byId: ReadonlyMap<string, CategoryCmsSearchRow>
): number {
  return categoryCmsSearchAncestors(row, byId).length
}

/**
 * null means the query is empty and the full tree stays visible.
 * A matching category also keeps its ancestors and descendants visible.
 */
export function categoryCmsSearchVisibleIds(
  rows: readonly CategoryCmsSearchRow[],
  query: string
): Set<string> | null {
  const needle = clean(query)
  if (!needle) return null
  const byId = new Map(rows.map((row) => [row.id, row]))
  const direct = new Set<string>()
  for (const row of rows) {
    if (clean(row.name).includes(needle) || clean(row.slug).includes(needle)) {
      direct.add(row.id)
    }
  }
  const visible = new Set<string>()
  for (const row of rows) {
    const chain = [...categoryCmsSearchAncestors(row, byId), row]
    if (!chain.some((item) => direct.has(item.id))) continue
    for (const item of chain) visible.add(item.id)
  }
  return visible
}
