import type { MedusaResponse } from "@medusajs/framework/http"
import {
  commercialCatalogCategoryParam,
  expandCategorySlugsWithDescendants,
} from "@europmade/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { parentIdOf } from "../../../../../../modules/product-cloud/category-admin"
import { listPublishedCatalogProducts } from "../../../../../store/catalog/catalog-helpers"
import { slugOf, type CatSlugReq } from "../../category-pd-http"

/**
 * GET /admin/cms/categories/:slug/listing-products
 * Same published, category-scoped catalog selection as the storefront listing.
 */
export async function GET(req: CatSlugReq, res: MedusaResponse) {
  const slug = slugOf(req)
  const productCloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const categories = await productCloud.listCategories(
    {},
    { take: 2000, order: { name: "ASC" }, relations: ["parent_category"] }
  )
  const nodes = categories.flatMap((category) => {
    const id = category.id?.trim()
    if (!id) return []
    return [
      {
        id,
        slug: category.slug ?? null,
        name: category.name,
        parent_category_id: parentIdOf(category),
      },
    ]
  })
  const category = expandCategorySlugsWithDescendants(
    commercialCatalogCategoryParam(slug) ?? slug,
    nodes
  )
  const pageSize = 48
  const products: Array<{
    id: string
    title: string
    brand_name: string | null
    image_url: string | null
    from_price: number | null
    attributes: Array<{ code: string; value: string }>
  }> = []
  const seen = new Set<string>()
  let offset = 0
  let count = Number.POSITIVE_INFINITY
  while (offset < count && offset < 2000) {
    const page = await listPublishedCatalogProducts(req.scope, {
      category,
      include_attributes: true,
      limit: pageSize,
      offset,
      region_code: "NL",
      sort: "popularity",
    })
    count = page.count
    if (page.products.length === 0) break
    for (const item of page.products) {
      if (!(item.offer_count > 0 && item.from_price != null && item.from_price > 0)) continue
      if (seen.has(item.id)) continue
      seen.add(item.id)
      products.push({
        id: item.id,
        title: item.title,
        brand_name: item.brand_name?.trim() || null,
        image_url: item.image_url,
        from_price: item.from_price,
        attributes: (item.attributes ?? []).flatMap((attribute) => {
          const code = attribute.code?.trim() || ""
          const value = attribute.value.trim()
          if (!code || !value) return []
          return [{ code, value }]
        }),
      })
    }
    offset += pageSize
  }
  res.status(200).json({ products })
}
