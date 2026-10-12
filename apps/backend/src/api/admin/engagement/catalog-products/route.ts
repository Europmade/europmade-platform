import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import { catalogIdentifierValues, presentCatalogProduct } from "../../../../modules/engagement/catalog-search"
import { listPublishedCatalogProducts } from "../../../store/catalog/catalog-helpers"

type VersionRow = {
  title?: string
  description?: string
  product_id?: string
  product?: { id?: string }
  media_items?: Array<{ storage_reference?: string; media_type?: string }>
}

/**
 * GET /admin/engagement/catalog-products?q=
 * Zoekt gepubliceerde Product Cloud-producten. Geen tweede productdatabase.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : ""
  if (q.length < 2) {
    res.status(200).json({ products: [] })
    return
  }
  const products = await searchPublishedProducts(req, q)
  const catalog =
    products.length > 0
      ? await listPublishedCatalogProducts(req.scope, {
          ids: products.map((product) => product.id),
          limit: products.length,
          region_code: "NL",
        })
      : { products: [] }
  const commissionById = new Map(
    catalog.products.map((product) => [
      product.id,
      product.affiliate_commission_label,
    ])
  )
  const catalogById = new Map(catalog.products.map((product) => [product.id, product]))
  res.status(200).json({
    products: products.map((product) => {
      const row = catalogById.get(product.id)
      return {
        ...product,
        commission_label: commissionById.get(product.id) ?? null,
        brand_name: row?.brand_name ?? null,
        category_names: row?.category_names ?? [],
      }
    }),
  })
}

async function searchPublishedProducts(req: AuthenticatedMedusaRequest, q: string) {
  try {
    const cloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as {
      listProductVersions: (
        filters: { publication_status?: string; product_id?: string },
        config: { take: number; relations?: string[] }
      ) => Promise<VersionRow[]>
      listIdentifiers?: (
        filters: { identifier_value: string },
        config: { take: number; relations?: string[] }
      ) => Promise<Array<{ product_variant?: { product_id?: string } }>>
    }
    const needle = q.toLowerCase()
    const identified = await versionsForIdentifiers(cloud, q)
    const rows = await cloud.listProductVersions(
      { publication_status: "Gepubliceerd" },
      { take: 500, relations: ["media_items", "product"] }
    )
    const matched = rows.filter((row) => (row.title?.toLowerCase() ?? "").includes(needle))
    const byId = new Map<string, ReturnType<typeof presentProduct>>()
    for (const row of [...identified, ...matched]) {
      const presented = presentCatalogProduct(row)
      if (presented && !byId.has(presented.id)) byId.set(presented.id, presented)
    }
    return [...byId.values()].slice(0, 12)
  } catch {
    return []
  }
}

async function versionsForIdentifiers(
  cloud: {
    listProductVersions: (
      filters: { publication_status?: string; product_id?: string },
      config: { take: number; relations?: string[] }
    ) => Promise<VersionRow[]>
    listIdentifiers?: (
      filters: { identifier_value: string },
      config: { take: number }
    ) => Promise<Array<{ product_variant_id?: string }>>
    retrieveProductVariant?: (id: string) => Promise<{ product_id?: string }>
  },
  query: string
): Promise<VersionRow[]> {
  if (!cloud.listIdentifiers) return []
  const values = catalogIdentifierValues(query)
  const productIds = new Set<string>()
  for (const value of values) {
    const identifiers = await cloud.listIdentifiers({ identifier_value: value }, { take: 8 })
    for (const item of identifiers) {
      const variantId = item.product_variant_id?.trim()
      if (!variantId || !cloud.retrieveProductVariant) continue
      const variant = await cloud.retrieveProductVariant(variantId)
      const id = variant.product_id?.trim()
      if (id) productIds.add(id)
    }
  }
  const rows: VersionRow[] = []
  for (const productId of productIds) {
    const versions = await cloud.listProductVersions(
      { product_id: productId, publication_status: "Gepubliceerd" },
      { take: 3, relations: ["media_items", "product"] }
    )
    rows.push(...versions)
  }
  return rows
}

