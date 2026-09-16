import { medusaBackendUrl } from "./medusa-backend-url"
import type { StorefrontLocale } from "./i18n/locales"

export const EMPTY_NAV_COOKIE = "em_show_empty_nav"

export type CategoryNavRow = {
  id: string
  slug: string
  name: string
  parent_category_id: string | null
  product_count: number
}

export type CategoryNavNode = CategoryNavRow & {
  children: CategoryNavNode[]
}

export type CommercialNavGroupDto = {
  key: string
  href: string
  name: string
  product_count: number
  image_url: string | null
  icon_url?: string | null
  image_product_id: string | null
  members: CategoryNavNode[]
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export function envShowsEmptyCategories(): boolean {
  const v = process.env.NEXT_PUBLIC_STOREFRONT_SHOW_EMPTY_CATEGORIES
  return v === "1" || v === "true"
}

export function applyEmptyNavQueryFromLocation(): void {
  if (typeof document === "undefined") return
  const params = new URLSearchParams(window.location.search)
  const q = params.get("show_empty_nav")
  if (q === "1") {
    document.cookie = `${EMPTY_NAV_COOKIE}=1;path=/;max-age=31536000;samesite=lax`
  } else if (q === "0") {
    document.cookie = `${EMPTY_NAV_COOKIE}=;path=/;max-age=0;samesite=lax`
  }
}

export function cookieShowsEmptyCategories(): boolean {
  if (typeof document === "undefined") return false
  return document.cookie
    .split(";")
    .some((part) => part.trim() === `${EMPTY_NAV_COOKIE}=1`)
}

export function storefrontShowsEmptyCategories(): boolean {
  return envShowsEmptyCategories() || cookieShowsEmptyCategories()
}

function pruneNodes(
  nodes: CategoryNavNode[],
  includeEmpty: boolean
): CategoryNavNode[] {
  const out: CategoryNavNode[] = []
  for (const node of nodes) {
    const children = pruneNodes(node.children ?? [], includeEmpty)
    if (includeEmpty || node.product_count > 0) {
      out.push({ ...node, children })
    }
  }
  return out
}

export function filterCommercialNav(
  groups: CommercialNavGroupDto[],
  includeEmpty: boolean
): CommercialNavGroupDto[] {
  const out: CommercialNavGroupDto[] = []
  for (const group of groups) {
    const members = pruneNodes(group.members ?? [], includeEmpty)
    if (includeEmpty || group.product_count > 0) {
      out.push({ ...group, members })
    }
  }
  return out
}

/**
 * Do not repeat the commercial group itself as a "subcategory" when it is a
 * 1:1 pc_category with no children. Composite groups keep their member PCs.
 */
export function commercialMembersForMenu(
  group: CommercialNavGroupDto
): CategoryNavNode[] {
  return (group.members ?? []).filter(
    (member) =>
      member.slug !== group.key || (member.children?.length ?? 0) > 0
  )
}

export async function fetchCommercialNav(
  locale: StorefrontLocale
): Promise<CommercialNavGroupDto[]> {
  try {
    const qs = new URLSearchParams({ locale })
    const res = await fetch(
      `${medusaBackendUrl()}/store/catalog/category-nav?${qs.toString()}`,
      {
        cache: "no-store",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          ...(PUBLISHABLE_KEY
            ? { "x-publishable-api-key": PUBLISHABLE_KEY }
            : {}),
        },
      }
    )
    if (!res.ok) return []
    const body = (await res.json()) as {
      commercial?: CommercialNavGroupDto[]
    }
    return Array.isArray(body.commercial)
      ? body.commercial.map((row) => ({
          ...row,
          image_url: row.image_url ?? null,
          icon_url: row.icon_url ?? row.image_url ?? null,
          image_product_id: null,
          members: row.members ?? [],
        }))
      : []
  } catch {
    return []
  }
}

/** @deprecated use fetchCommercialNav */
export async function fetchCategoryNav(
  locale: StorefrontLocale
): Promise<CategoryNavRow[]> {
  try {
    const qs = new URLSearchParams({ locale })
    const res = await fetch(
      `${medusaBackendUrl()}/store/catalog/category-nav?${qs.toString()}`,
      {
        cache: "no-store",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          ...(PUBLISHABLE_KEY
            ? { "x-publishable-api-key": PUBLISHABLE_KEY }
            : {}),
        },
      }
    )
    if (!res.ok) return []
    const body = (await res.json()) as { categories?: CategoryNavRow[] }
    return Array.isArray(body.categories) ? body.categories : []
  } catch {
    return []
  }
}
