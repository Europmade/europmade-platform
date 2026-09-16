import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  COMMERCIAL_NAV_GROUPS,
  pickCommercialNavLabel,
} from "@europmade/utils"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { parentIdOf } from "../../../../modules/product-cloud/category-admin"
import { toCanonicalCategorySlug } from "../../../../modules/product-cloud/category-attributes"
import { normalizeLanguageCode } from "../../../../modules/product-cloud/languages"
import {
  loadCommercialNavIcons,
  resolveCommercialNavSort,
} from "../commercial-nav-enrich"

function readQueryString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value
  if (Array.isArray(value) && typeof value[0] === "string" && value[0]) {
    return value[0]
  }
  return null
}

function linkProductId(link: {
  product_id?: string
  product?: { id?: string } | string | null
}): string | null {
  if (typeof link.product_id === "string" && link.product_id) return link.product_id
  if (typeof link.product === "string" && link.product) return link.product
  if (link.product && typeof link.product === "object" && typeof link.product.id === "string") {
    return link.product.id
  }
  return null
}

function linkCategoryId(link: {
  category_id?: string
  category?: { id?: string } | string | null
}): string | null {
  if (typeof link.category_id === "string" && link.category_id) return link.category_id
  if (typeof link.category === "string" && link.category) return link.category
  if (
    link.category &&
    typeof link.category === "object" &&
    typeof link.category.id === "string"
  ) {
    return link.category.id
  }
  return null
}

/**
 * GET /store/catalog/category-nav
 * Flat pc_category rows with rolled-up published product counts (descendants included).
 * Storefront builds hoofd → sub → sub/sub; empty filtering happens client-side.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const localeRaw = readQueryString(req.query.locale)
  const locale = localeRaw ? normalizeLanguageCode(localeRaw) : null

  const categories = await productCloud.listCategories(
    {},
    { take: 4000, relations: ["parent_category"] }
  )
  const versions = (await productCloud.listProductVersions(
    { publication_status: "Gepubliceerd" },
    { take: 8000 }
  )) as Array<{ id: string; product_id: string }>
  const publishedIds = new Set<string>()
  for (const v of versions) {
    if (typeof v.product_id === "string" && v.product_id) {
      publishedIds.add(v.product_id)
    }
  }

  const links = (await productCloud.listProductCategories(
    {},
    { take: 20000 }
  )) as Array<{
    product_id?: string
    category_id?: string
    product?: { id?: string } | string | null
    category?: { id?: string } | string | null
  }>

  const parentById = new Map<string, string | null>()
  for (const category of categories) {
    parentById.set(category.id, parentIdOf(category))
  }

  const productsByCategory = new Map<string, Set<string>>()
  for (const link of links) {
    const productId = linkProductId(link)
    const categoryId = linkCategoryId(link)
    if (!productId || !categoryId) continue
    if (!publishedIds.has(productId)) continue
    let set = productsByCategory.get(categoryId)
    if (!set) {
      set = new Set()
      productsByCategory.set(categoryId, set)
    }
    set.add(productId)
  }

  const rolled = new Map<string, Set<string>>()
  function rolledSet(categoryId: string): Set<string> {
    const cached = rolled.get(categoryId)
    if (cached) return cached
    const acc = new Set(productsByCategory.get(categoryId) ?? [])
    rolled.set(categoryId, acc)
    for (const [id, parentId] of parentById) {
      if (parentId === categoryId) {
        for (const pid of rolledSet(id)) acc.add(pid)
      }
    }
    return acc
  }
  for (const category of categories) {
    rolledSet(category.id)
  }

  const commercialSlugs = new Set(
    COMMERCIAL_NAV_GROUPS.flatMap((group) => group.pcSlugs)
  )

  const rows = (await Promise.all(
    categories.map(async (category) => {
      const slug =
        typeof category.slug === "string" && category.slug.trim()
          ? category.slug.trim()
          : null
      if (!slug) return null

      let name = category.name
      if (locale && commercialSlugs.has(slug)) {
        try {
          const resolved = await productCloud.resolveLocalizedEntityFields({
            entity_type: "category",
            entity_id: category.id,
            locale,
            source_language_code: null,
            source_fields: { name: category.name },
          })
          const nameField = resolved.find((r) => r.field_name === "name")
          if (nameField?.value) name = nameField.value
        } catch {
          /* source name */
        }
      }

      return {
        id: category.id,
        slug,
        name,
        parent_category_id: parentIdOf(category),
        product_count: rolledSet(category.id).size,
      }
    })
  )).filter((row): row is NonNullable<typeof row> => row != null)

  const bySlug = new Map(rows.map((row) => [row.slug, row]))
  const childrenByParent = new Map<string, typeof rows>()
  for (const row of rows) {
    const parentId = row.parent_category_id
    if (!parentId) continue
    const list = childrenByParent.get(parentId) ?? []
    list.push(row)
    childrenByParent.set(parentId, list)
  }

  type MemberNode = (typeof rows)[number] & { children: MemberNode[] }
  function memberTree(row: (typeof rows)[number]): MemberNode {
    const kids = (childrenByParent.get(row.id) ?? []).map(memberTree)
    return { ...row, children: kids }
  }

  const commercialDraft = COMMERCIAL_NAV_GROUPS.map((group) => {
    const members = group.pcSlugs
      .map((slug) => bySlug.get(slug))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
    const seenCanon = new Map<string, (typeof members)[number]>()
    for (const member of members) {
      const canon = toCanonicalCategorySlug(member.slug)
      const prev = seenCanon.get(canon)
      if (!prev || member.product_count >= prev.product_count) {
        seenCanon.set(canon, member)
      }
    }
    const uniqueMembers = [...seenCanon.values()]
    const union = new Set<string>()
    for (const member of members) {
      for (const pid of rolledSet(member.id)) union.add(pid)
    }
    return {
      key: group.key,
      href: `/categorie/${group.key}`,
      name: pickCommercialNavLabel(group, locale),
      product_count: union.size,
      members: uniqueMembers.map(memberTree),
      productIds: [...union],
    }
  })

  let cms: CmsModuleService | null = null
  try {
    cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  } catch {
    cms = null
  }

  const sorted = await resolveCommercialNavSort(cms, commercialDraft)
  const icons = await loadCommercialNavIcons(cms)

  const commercial = sorted.rows.map((row) => {
    const icon_url = icons.get(row.key) ?? null
    return {
      key: row.key,
      href: row.href,
      name: row.name,
      product_count: row.product_count,
      members: row.members,
      image_url: icon_url,
      icon_url,
      image_product_id: null,
    }
  })

  res.setHeader("Cache-Control", "no-store")
  res.status(200).json({
    categories: rows,
    commercial,
    sort: sorted.sort,
  })
}
