import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import { VERIFICATION_MODULE } from "../../../../modules/verification"
import type VerificationModuleService from "../../../../modules/verification/service"

type ListRow = {
  id: string
  title: string | null
  brand_id: string
  brand_name: string | null
  manufacturer_id: string
  lifecycle_status: string
  current_owner_seller_id: string
  seller_id: string
  seller_name: string | null
  publication_status: string | null
  identifier_value: string | null
  sku_hint: string | null
  category_names: string[]
  primary_image_url: string | null
  made_in_europe_status: string | null
  completeness: {
    compliance_review_status: string | null
  }
  created_at: string | Date
  updated_at: string | Date
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length || 1) },
    () => worker()
  )
  await Promise.all(workers)
  return out
}

/**
 * GET /admin/product-cloud/products
 * Lightweight enriched list for Admin Product Management (P2.20).
 * Query: seller_id, q, publication_status, lifecycle_status, limit, offset
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  let verification: VerificationModuleService | null = null
  try {
    verification = req.scope.resolve(
      VERIFICATION_MODULE
    ) as VerificationModuleService
  } catch {
    verification = null
  }

  const sellerId =
    typeof req.query.seller_id === "string"
      ? req.query.seller_id.trim()
      : ""
  const q =
    typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : ""
  const publicationStatus =
    typeof req.query.publication_status === "string"
      ? req.query.publication_status.trim()
      : ""
  const lifecycleStatus =
    typeof req.query.lifecycle_status === "string"
      ? req.query.lifecycle_status.trim()
      : ""
  const limitRaw = Number(req.query.limit)
  const offsetRaw = Number(req.query.offset)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200)
    : 100
  const offset = Number.isFinite(offsetRaw)
    ? Math.max(Math.trunc(offsetRaw), 0)
    : 0

  const filter: Record<string, string> = {}
  if (sellerId) filter.current_owner_seller_id = sellerId
  if (lifecycleStatus) filter.lifecycle_status = lifecycleStatus

  const products = await productCloud.listProducts(filter, {
    order: { updated_at: "DESC" },
    take: 500,
  })

  const sellerNameCache = new Map<string, string>()
  const brandNameCache = new Map<string, string | null>()

  async function sellerName(sid: string): Promise<string> {
    if (sellerNameCache.has(sid)) return sellerNameCache.get(sid)!
    try {
      const seller = await partner.retrieveSeller(sid, {
        relations: ["company"],
      })
      const company = seller.company as { legal_name?: string } | undefined
      const name = company?.legal_name?.trim() || sid
      sellerNameCache.set(sid, name)
      return name
    } catch {
      sellerNameCache.set(sid, sid)
      return sid
    }
  }

  async function brandName(brandId: string): Promise<string | null> {
    if (brandNameCache.has(brandId)) return brandNameCache.get(brandId)!
    try {
      const brand = await partner.retrieveBrand(brandId)
      const name = (brand as { name?: string }).name?.trim() || null
      brandNameCache.set(brandId, name)
      return name
    } catch {
      if (brandId && !brandId.startsWith("brand_")) {
        brandNameCache.set(brandId, brandId)
        return brandId
      }
      brandNameCache.set(brandId, null)
      return null
    }
  }

  const enriched = await mapPool(products, 8, async (product) => {
    const sid = product.current_owner_seller_id
    const versions = await productCloud.listProductVersions({
      product_id: product.id,
    })
    const working =
      versions.find((v: { publication_status: string }) =>
        ["In review", "Concept", "Goedgekeurd", "Gepubliceerd"].includes(
          v.publication_status
        )
      ) || versions[0]

    let identifier_value: string | null = null
    let sku_hint: string | null = null
    try {
      const variants = await productCloud.listProductVariants({
        product_id: product.id,
      })
      if (variants[0]) {
        sku_hint =
          (variants[0] as { sku?: string | null }).sku?.trim() ||
          (variants[0] as { variant_value?: string }).variant_value ||
          null
        const ids = await productCloud.listIdentifiers({
          product_variant_id: variants[0].id,
        })
        const gtin = ids.find(
          (i: { identifier_type: string }) => i.identifier_type === "GTIN"
        )
        identifier_value =
          gtin?.identifier_value ?? ids[0]?.identifier_value ?? null
      }
    } catch {
      /* keep null */
    }

    let category_names: string[] = []
    try {
      const links = await productCloud.listProductCategories({
        product_id: product.id,
      })
      const categoryIds = links.map((l: { category_id: string }) => l.category_id)
      if (categoryIds.length) {
        const cats = await productCloud.listCategories({ id: categoryIds })
        category_names = cats.map((c: { name: string }) => c.name)
      }
    } catch {
      category_names = []
    }

    let primary_image_url: string | null = null
    if (working) {
      try {
        const media = await productCloud.listProductMedias(
          { product_version_id: working.id },
          { order: { sort_order: "ASC" }, take: 5 }
        )
        const primary =
          media.find(
            (m: { media_type: string }) => m.media_type === "Hoofdafbeelding"
          ) || media[0]
        primary_image_url = primary?.storage_reference ?? null
      } catch {
        primary_image_url = null
      }
    }

    let made_in_europe_status: string | null = "—"
    let compliance_review_status: string | null = null
    if (verification) {
      try {
        const evidence = await verification.listProductOriginEvidences({
          product_id: product.id,
        })
        const live = evidence.filter(
          (e: { verification_status?: string }) =>
            e.verification_status !== "superseded"
        )
        if (!live.length) {
          made_in_europe_status = "niet aanwezig"
          compliance_review_status = "missing"
        } else if (
          live.some((e: { verification_status?: string }) =>
            ["pending", "pending_review"].includes(
              String(e.verification_status || "")
            )
          )
        ) {
          made_in_europe_status = "in beoordeling"
          compliance_review_status = "pending_review"
        } else if (
          live.every(
            (e: { verification_status?: string }) =>
              e.verification_status === "approved"
          )
        ) {
          made_in_europe_status = "goedgekeurd"
          compliance_review_status = "approved"
        } else if (
          live.some(
            (e: { verification_status?: string }) =>
              e.verification_status === "rejected"
          )
        ) {
          made_in_europe_status = "afgekeurd"
          compliance_review_status = "rejected"
        }
      } catch {
        /* keep defaults */
      }
    }

    const row: ListRow = {
      id: product.id,
      title: working?.title ?? null,
      brand_id: product.brand_id,
      brand_name: await brandName(product.brand_id),
      manufacturer_id: product.manufacturer_id,
      lifecycle_status: product.lifecycle_status,
      current_owner_seller_id: sid,
      seller_id: sid,
      seller_name: await sellerName(sid),
      publication_status: working?.publication_status ?? null,
      identifier_value,
      sku_hint,
      category_names,
      primary_image_url,
      made_in_europe_status,
      completeness: { compliance_review_status },
      created_at: product.created_at,
      updated_at: product.updated_at,
    }
    return row
  })

  const filtered = enriched.filter((row) => {
    if (publicationStatus && row.publication_status !== publicationStatus) {
      return false
    }
    if (q) {
      const hay = [
        row.title,
        row.brand_name,
        row.identifier_value,
        row.sku_hint,
        ...(Array.isArray(row.category_names) ? row.category_names : []),
        row.seller_name,
        row.seller_id,
        row.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      const tokens = q
        .split(/\s+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
      if (!tokens.every((token) => hay.includes(token))) return false
    }
    return true
  })

  const count = filtered.length
  const page = filtered.slice(offset, offset + limit)
  res.json({ products: page, count, limit, offset })
}
