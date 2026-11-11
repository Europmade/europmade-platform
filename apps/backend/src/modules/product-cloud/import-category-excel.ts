/**
 * Shared Excel helpers for dependent category / subcategory / L3 dropdowns.
 */

import { slugifyCategoryName } from "./category-attributes"
import {
  partitionImportCategories,
  uniqueImportCategoryCatalog,
  type ImportCategoryCatalogEntry,
} from "./import-category"

/**
 * Seller/Admin Excel template visibility (not a DB delete).
 * Aligns with adminParentCategoryOptions technical roots where applicable.
 *
 * Robotstofzuiger is hidden as a wrong-level L2 under Huishouden: robot vacuums
 * belong under Huishouden > Schoonmaak > Stofzuigers & stoomreinigers.
 * Existing DB rows/product links are preserved; only template/UI choice is hidden.
 */
const HIDDEN_EXCEL_ROOT_KEYS = new Set(["mode", "duurzaam", "algemeen"])
const HIDDEN_EXCEL_CHILD_SLUGS = new Set([
  "robotstofzuiger",
  "alles-in-robotstofzuiger",
])

export function filterCategoriesForSellerImportTemplate<
  T extends {
    id: string
    name: string
    slug?: string | null
    parent_id?: string | null
    parent_category_id?: string | null
  },
>(rows: T[]): T[] {
  const catalog = uniqueImportCategoryCatalog(rows)
  const hiddenRootIds = new Set<string>()
  for (const row of catalog) {
    if (row.parent_id) continue
    const key = slugifyCategoryName(row.slug || row.name)
    if (HIDDEN_EXCEL_ROOT_KEYS.has(key) || /^e2e\b/i.test(row.name.trim())) {
      hiddenRootIds.add(row.id)
    }
  }
  return rows.filter((row) => {
    const parent = row.parent_id ?? row.parent_category_id ?? null
    const slug = slugifyCategoryName(row.slug || row.name)
    if (!parent) {
      if (hiddenRootIds.has(row.id)) return false
      if (HIDDEN_EXCEL_ROOT_KEYS.has(slug) || /^e2e\b/i.test(row.name.trim())) {
        return false
      }
      return true
    }
    if (HIDDEN_EXCEL_CHILD_SLUGS.has(slug)) return false
    if (hiddenRootIds.has(parent)) return false
    return true
  })
}

export type CategoryExcelLists = {
  roots: ImportCategoryCatalogEntry[]
  children: ImportCategoryCatalogEntry[]
  grandchildren: ImportCategoryCatalogEntry[]
  /** Display root name → L2 display names (sorted). */
  childrenByRootName: Map<string, string[]>
  /** Display L2 name → L3 display names (sorted). */
  l3ByL2Name: Map<string, string[]>
  /** Display root name → Excel defined-name key (cat_…). */
  keyByRootName: Map<string, string>
  /** Display L2 name → Excel defined-name key (cat2_…). */
  keyByL2Name: Map<string, string>
}

/** Excel defined names: letters, digits, underscore; start with letter/underscore. */
export function excelDefinedNameForCategory(name: string, prefix = "cat"): string {
  const slug = slugifyCategoryName(name)
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/g, "")
  const base = slug || "cat"
  const key = `${prefix}_${base}`
  return key.slice(0, 240)
}

function parentIdOf(row: ImportCategoryCatalogEntry): string | null {
  return row.parent_id ?? null
}

export function buildCategoryExcelLists(
  rows: Array<{
    id: string
    name: string
    slug?: string | null
    parent_id?: string | null
    parent_category_id?: string | null
  }>,
  options: { skipVisibilityFilter?: boolean } = {}
): CategoryExcelLists {
  const visible = options.skipVisibilityFilter
    ? rows
    : filterCategoriesForSellerImportTemplate(rows)
  const catalog = uniqueImportCategoryCatalog(visible)
  const byId = new Map(catalog.map((r) => [r.id, r]))
  const roots = catalog.filter((r) => !parentIdOf(r))
  const children = catalog.filter((r) => {
    const pid = parentIdOf(r)
    if (!pid) return false
    const parent = byId.get(pid)
    return Boolean(parent && !parentIdOf(parent))
  })
  const grandchildren = catalog.filter((r) => {
    const pid = parentIdOf(r)
    if (!pid) return false
    const parent = byId.get(pid)
    if (!parent) return false
    const gp = parentIdOf(parent) ? byId.get(parentIdOf(parent)!) : null
    return Boolean(gp && !parentIdOf(gp))
  })

  const keyByRootName = new Map<string, string>()
  const usedKeys = new Set<string>()
  for (const root of roots) {
    let key = excelDefinedNameForCategory(root.name, "cat")
    if (usedKeys.has(key)) {
      key = `${key}_${root.id.slice(-6).replace(/[^a-z0-9]/gi, "")}`
    }
    usedKeys.add(key)
    keyByRootName.set(root.name, key)
  }

  const keyByL2Name = new Map<string, string>()
  for (const l2 of children) {
    let key = excelDefinedNameForCategory(l2.name, "cat2")
    if (usedKeys.has(key)) {
      key = `${key}_${l2.id.slice(-6).replace(/[^a-z0-9]/gi, "")}`
    }
    usedKeys.add(key)
    keyByL2Name.set(l2.name, key)
  }

  const childrenByRootName = new Map<string, string[]>()
  for (const root of roots) {
    childrenByRootName.set(
      root.name,
      children
        .filter((c) => c.parent_id === root.id)
        .map((c) => c.name)
        .sort((a, b) => a.localeCompare(b, "nl"))
    )
  }

  const l3ByL2Name = new Map<string, string[]>()
  for (const l2 of children) {
    l3ByL2Name.set(
      l2.name,
      grandchildren
        .filter((c) => c.parent_id === l2.id)
        .map((c) => c.name)
        .sort((a, b) => a.localeCompare(b, "nl"))
    )
  }

  return {
    roots,
    children,
    grandchildren,
    childrenByRootName,
    l3ByL2Name,
    keyByRootName,
    keyByL2Name,
  }
}

export function dependentSubcategoryFormula(
  categoryCell: string,
  mapSheet: string,
  mapStartRow: number,
  mapEndRow: number,
  nameCol: string,
  keyCol: string
): string {
  // VLOOKUP display name → defined-name key, then INDIRECT to that named range.
  return `INDIRECT(VLOOKUP(${categoryCell},${mapSheet}!$${nameCol}$${mapStartRow}:$${keyCol}$${mapEndRow},2,FALSE))`
}

/** @deprecated Prefer buildCategoryExcelLists roots/children split. */
export function partitionVisibleCategories(catalog: ImportCategoryCatalogEntry[]) {
  return partitionImportCategories(catalog)
}
