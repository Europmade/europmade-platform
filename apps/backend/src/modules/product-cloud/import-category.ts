/**
 * Seller import: resolve Excel category text to canonical pc_category.
 * Auto-link only on exact/normalized equality — never invent a category.
 */

import {
  slugifyCategoryName,
  toCanonicalCategorySlug,
} from "./category-attributes"
import { resolveNlDisplayName } from "./import-template-display-i18n"
import { resolveNlFromSellerTemplateLabel } from "./seller-template-en-catalog"

export type ImportCategoryCatalogEntry = {
  id: string
  name: string
  slug: string
  parent_id?: string | null
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
  rows: Array<{
    id: string
    name: string
    slug?: string | null
    parent_category_id?: string | null
    parent_id?: string | null
  }>
): ImportCategoryCatalogEntry[] {
  const byKey = new Map<string, ImportCategoryCatalogEntry>()
  for (const row of rows) {
    const name = String(row.name || "").trim()
    if (!name) continue
    const slug = String(row.slug || slugifyCategoryName(name)).trim()
    const key = (slug || normalizeCategoryKey(name)).toLowerCase()
    const canonical = toCanonicalCategorySlug(name)
    const parent_id = row.parent_id ?? row.parent_category_id ?? null
    const next: ImportCategoryCatalogEntry = { id: row.id, name, slug, parent_id }
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

export function partitionImportCategories(catalog: ImportCategoryCatalogEntry[]): {
  roots: ImportCategoryCatalogEntry[]
  children: ImportCategoryCatalogEntry[]
} {
  const roots = catalog.filter((row) => !row.parent_id)
  const children = catalog.filter((row) => Boolean(row.parent_id))
  return { roots, children }
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

  const nlResolved =
    resolveNlFromSellerTemplateLabel(raw) || resolveNlDisplayName(raw)
  const key = normalizeCategoryKey(raw)
  const nlKey = normalizeCategoryKey(nlResolved)
  const slugs = new Set(
    [
      raw.toLowerCase(),
      nlResolved.toLowerCase(),
      slugifyCategoryName(raw),
      slugifyCategoryName(nlResolved),
      toCanonicalCategorySlug(raw),
      toCanonicalCategorySlug(nlResolved),
    ].filter(Boolean)
  )

  const byExact = catalog.find((c) => c.id === raw)
  if (byExact) {
    return { status: "linked", raw, matched: byExact, suggestions: [] }
  }

  const linked = catalog.filter((c) => {
    if (slugs.has(c.slug.toLowerCase())) return true
    if (normalizeCategoryKey(c.name) === key) return true
    if (normalizeCategoryKey(c.name) === nlKey) return true
    if (c.name.trim().toLowerCase() === raw.toLowerCase()) return true
    if (c.name.trim().toLowerCase() === nlResolved.toLowerCase()) return true
    if (toCanonicalCategorySlug(c.name) === toCanonicalCategorySlug(raw)) {
      return true
    }
    if (
      toCanonicalCategorySlug(c.name) === toCanonicalCategorySlug(nlResolved)
    ) {
      return true
    }
    return false
  })
  if (linked.length === 1) {
    return { status: "linked", raw, matched: linked[0]!, suggestions: [] }
  }
  if (linked.length > 1) {
    return { status: "suggested", raw, matched: null, suggestions: linked }
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

function cleanCategoryText(value: string | undefined | null): string {
  return String(value || "")
    .replace(/[\u00a0]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function applyCategoryResolution(
  values: Record<string, string>,
  catalog: ImportCategoryCatalogEntry[]
): { values: Record<string, string>; resolution: ImportCategoryResolution } {
  const overlay = String(
    values.category_override || values.category_id || ""
  ).trim()
  const originalRaw = cleanCategoryText(values.category_raw || values.category)
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

/**
 * Koppelt een apparaat aan één productgroep. Een was-droogcombinatie wordt
 * niet tegelijk wasmachine en wasdroger. Zonder eenduidig kenmerk blijft het leeg.
 */
export function applianceGroupSlug(input: {
  title?: string
  installation?: string
  productType?: string
}): string | null {
  const text = `${input.title || ""} ${input.productType || ""}`.toLowerCase()
  const place = `${input.installation || ""} ${text}`
  const combo = /was-droogcombinatie|wasdroogcombinatie|washer[- ]dryer|wash-dry|droogcombinatie/.test(text)
  const dishwasher = /vaatwasser|dishwasher/.test(text)
  const washer = /wasmachine|washing machine/.test(text)
  const dryer = /wasdroger|droogkast|tumble dryer|\bdryer\b/.test(text)
  if (combo || (washer && dryer)) return "was-droogcombinaties"
  if (dishwasher && washer) return null
  if (dishwasher) {
    const freestanding = /vrijstaand|freestanding/.test(place)
    const builtin = /inbouw|geïntegreerd|geintegreerd|integrated|built-in/.test(place)
    if (freestanding && !builtin) return "vrijstaande-vaatwassers"
    if (builtin && !freestanding) return "vaatwassers"
    return null
  }
  if (washer) return "wasmachines"
  if (dryer) return "wasdrogers"
  return null
}

function ancestorChain(
  leaf: ImportCategoryCatalogEntry,
  byId: Map<string, ImportCategoryCatalogEntry>
): ImportCategoryCatalogEntry[] {
  const chain = [leaf]
  const seen = new Set([leaf.id])
  let cursor = leaf.parent_id ? byId.get(leaf.parent_id) ?? null : null
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id)
    chain.push(cursor)
    cursor = cursor.parent_id ? byId.get(cursor.parent_id) ?? null : null
  }
  return chain
}

/**
 * Resolve L1 + optional L2 + optional L3 and produce link ids
 * matching Seller/Admin category assignment.
 */
/** "Home → Home Textiles → Cushions & Throws" becomes three levels. */
export function splitCategoryBreadcrumb(raw: string): {
  category: string
  subcategory: string
  subcategory_l3: string
} | null {
  const parts = String(raw || "")
    .split(/\s*(?:→|->|›|>)\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return null
  return {
    category: parts[0] || "",
    subcategory: parts[1] || "",
    subcategory_l3: parts[2] || "",
  }
}

export function applyCategoryHierarchyResolution(
  values: Record<string, string>,
  catalog: ImportCategoryCatalogEntry[]
): {
  values: Record<string, string>
  resolution: ImportCategoryResolution
  subcategory_resolution: ImportCategoryResolution
  subcategory_l3_resolution: ImportCategoryResolution
  link_ids: string[]
} {
  const byId = new Map(catalog.map((row) => [row.id, row]))
  const roots = catalog.filter((row) => !row.parent_id)
  const l2Nodes = catalog.filter((row) => {
    if (!row.parent_id) return false
    const parent = byId.get(row.parent_id)
    return Boolean(parent && !parent.parent_id)
  })
  const l3Nodes = catalog.filter((row) => {
    if (!row.parent_id) return false
    const parent = byId.get(row.parent_id)
    if (!parent?.parent_id) return false
    const gp = byId.get(parent.parent_id)
    return Boolean(gp && !gp.parent_id)
  })
  const hasHierarchy = roots.length > 0 && l2Nodes.length > 0

  const overlay = String(
    values.category_override || values.category_id || ""
  ).trim()
  const breadcrumb = splitCategoryBreadcrumb(
    cleanCategoryText(values.category_raw || values.category)
  )
  const originalRaw = breadcrumb
    ? breadcrumb.category
    : cleanCategoryText(values.category_raw || values.category)
  const subcategoryRaw = cleanCategoryText(
    values.subcategory_override ||
      values.subcategory ||
      (breadcrumb ? breadcrumb.subcategory : "")
  )
  const subcategoryL3Raw = cleanCategoryText(
    values.subcategory_l3_override ||
      values.subcategory_l3 ||
      (breadcrumb ? breadcrumb.subcategory_l3 : "")
  )
  const lookup = overlay || originalRaw

  let categoryRes = resolveImportCategory(
    lookup,
    hasHierarchy ? roots : catalog
  )
  // Legacy files may put a leaf name in the category column.
  if (!categoryRes.matched && hasHierarchy && lookup) {
    categoryRes = resolveImportCategory(lookup, catalog)
  }

  let parent: ImportCategoryCatalogEntry | null = null
  let childFromCategory: ImportCategoryCatalogEntry | null = null
  let l3FromCategory: ImportCategoryCatalogEntry | null = null
  if (categoryRes.matched) {
    if (!categoryRes.matched.parent_id) {
      parent = categoryRes.matched
    } else {
      const matchedParent = byId.get(categoryRes.matched.parent_id) || null
      if (matchedParent && !matchedParent.parent_id) {
        childFromCategory = categoryRes.matched
        parent = matchedParent
      } else if (matchedParent?.parent_id) {
        l3FromCategory = categoryRes.matched
        childFromCategory = matchedParent
        parent = byId.get(matchedParent.parent_id) || null
      }
    }
  }

  const l2Catalog =
    parent != null ? l2Nodes.filter((row) => row.parent_id === parent!.id) : []
  let subcategoryRes = subcategoryRaw
    ? resolveImportCategory(
        subcategoryRaw,
        l2Catalog.length ? l2Catalog : l2Nodes
      )
    : { status: "pending" as const, raw: "", matched: null, suggestions: [] }

  let invalidParentChild = false
  if (subcategoryRaw && parent) {
    subcategoryRes = resolveImportCategory(subcategoryRaw, l2Catalog)
    if (!subcategoryRes.matched) {
      invalidParentChild = true
      subcategoryRes = {
        status: "pending",
        raw: subcategoryRaw,
        matched: null,
        suggestions: l2Catalog.slice(0, 3),
      }
    }
  } else if (subcategoryRaw && !parent) {
    subcategoryRes = resolveImportCategory(subcategoryRaw, l2Nodes)
    if (subcategoryRes.matched?.parent_id) {
      parent = byId.get(subcategoryRes.matched.parent_id) || null
    }
  }

  let child: ImportCategoryCatalogEntry | null =
    invalidParentChild ? null : subcategoryRes.matched || childFromCategory
  if (child?.parent_id && !parent) {
    parent = byId.get(child.parent_id) || null
  }

  let l3Catalog =
    child != null ? l3Nodes.filter((row) => row.parent_id === child!.id) : []
  let subcategoryL3Res = subcategoryL3Raw
    ? resolveImportCategory(
        subcategoryL3Raw,
        l3Catalog.length ? l3Catalog : l3Nodes
      )
    : { status: "pending" as const, raw: "", matched: null, suggestions: [] }

  let invalidL2L3 = false
  if (subcategoryL3Raw && child) {
    subcategoryL3Res = resolveImportCategory(subcategoryL3Raw, l3Catalog)
    if (!subcategoryL3Res.matched) {
      invalidL2L3 = true
      subcategoryL3Res = {
        status: "pending",
        raw: subcategoryL3Raw,
        matched: null,
        suggestions: l3Catalog.slice(0, 3),
      }
    }
  } else if (subcategoryL3Raw && !child && !parent) {
    subcategoryL3Res = resolveImportCategory(subcategoryL3Raw, l3Nodes)
    if (subcategoryL3Res.matched?.parent_id) {
      const inferredL2 = byId.get(subcategoryL3Res.matched.parent_id) || null
      if (inferredL2) {
        child = inferredL2
        l3Catalog = l3Nodes.filter((row) => row.parent_id === child!.id)
        if (inferredL2.parent_id) parent = byId.get(inferredL2.parent_id) || null
        subcategoryL3Res = resolveImportCategory(subcategoryL3Raw, l3Catalog)
      }
    }
  }

  let l3 =
    invalidL2L3 || invalidParentChild
      ? null
      : subcategoryL3Res.matched || l3FromCategory

  const placement = applianceGroupSlug({
    title: values.title,
    installation: values.inbouw_of_vrijstaand || values.installation,
    productType: values.product_type,
  })
  const placementLeaf = placement
    ? catalog.find((row) => row.slug === placement) ?? null
    : null
  if (!l3 && placementLeaf) {
    const chain = ancestorChain(placementLeaf, byId)
    const categoryOk = !categoryRes.matched || chain.some((row) => row.id === categoryRes.matched?.id)
    const childOk = !child || chain.some((row) => row.id === child?.id)
    if (categoryOk && childOk) {
      l3 = placementLeaf
      const leafParent = chain[1] ?? null
      if (leafParent?.parent_id) child = leafParent
      const root = chain.find((row) => !row.parent_id) ?? null
      if (root) parent = root
      if (!categoryRes.matched && parent) {
        categoryRes = { ...categoryRes, status: "linked", matched: parent }
      }
    }
  }

  const resolvedChild =
    child || (l3?.parent_id ? byId.get(l3.parent_id) || null : null)
  if (resolvedChild?.parent_id && !parent) {
    parent = byId.get(resolvedChild.parent_id) || null
  }

  const link_ids = [
    ...new Set(
      [parent?.id, resolvedChild?.id, l3?.id].filter(Boolean) as string[]
    ),
  ]

  const resolution: ImportCategoryResolution = {
    ...categoryRes,
    raw: originalRaw || categoryRes.raw,
    matched: parent || categoryRes.matched,
  }

  const next = { ...values }
  next.category_raw = resolution.raw
  next.category_status = resolution.matched ? "linked" : resolution.status
  next.category_id = resolution.matched?.id || ""
  next.category_slug = resolution.matched?.slug || ""
  next.category_suggestions = resolution.suggestions.map((s) => s.name).join("|")
  next.category = resolution.matched?.name || resolution.raw
  next.subcategory = resolvedChild?.name || subcategoryRaw
  next.subcategory_id = resolvedChild?.id || ""
  next.subcategory_status = invalidParentChild
    ? "invalid"
    : subcategoryRes.matched
      ? "linked"
      : subcategoryRaw
        ? subcategoryRes.status
        : ""
  next.subcategory_l3 = l3?.name || subcategoryL3Raw
  next.subcategory_l3_id = l3?.id || ""
  next.subcategory_l3_status = invalidL2L3
    ? "invalid"
    : subcategoryL3Res.matched
      ? "linked"
      : subcategoryL3Raw
        ? subcategoryL3Res.status
        : ""
  next.category_link_ids = link_ids.join("|")
  if (invalidParentChild) {
    next.subcategory_error = `Niveau 2 '${subcategoryRaw}' hoort niet bij niveau 1 '${parent?.name || ""}'.`
  }
  if (invalidL2L3) {
    next.subcategory_l3_error = `Niveau 3 '${subcategoryL3Raw}' hoort niet bij niveau 2 '${resolvedChild?.name || ""}'.`
  }

  return {
    values: next,
    resolution,
    subcategory_resolution: {
      ...subcategoryRes,
      raw: subcategoryRaw || subcategoryRes.raw,
    },
    subcategory_l3_resolution: {
      ...subcategoryL3Res,
      raw: subcategoryL3Raw || subcategoryL3Res.raw,
    },
    link_ids,
  }
}
