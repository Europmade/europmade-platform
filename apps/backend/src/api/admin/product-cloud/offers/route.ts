import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMMERCE_CLOUD_MODULE } from "../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../modules/commerce-cloud/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"

/**
 * GET /admin/product-cloud/offers
 * Seller offers only. Catalog products without an offer are not listed here.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const commerce = req.scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : ""
  const sellerId = typeof req.query.seller_id === "string" ? req.query.seller_id.trim() : ""
  const region = typeof req.query.region_code === "string" ? req.query.region_code.trim().toUpperCase() : ""
  const productIdFilter = typeof req.query.product_id === "string" ? req.query.product_id.trim() : ""
  const filter: Record<string, unknown> = {}
  if (sellerId) filter.seller_id = sellerId
  if (region) filter.region_code = region
  if (productIdFilter) {
    const variants = (await productCloud.listProductVariants(
      { product_id: productIdFilter },
      { take: 100 }
    )) as Array<{ id: string }>
    const variantIds = variants.map((row) => row.id)
    if (!variantIds.length) {
      res.json({ offers: [], count: 0, product_id: productIdFilter })
      return
    }
    const identifiers = (await productCloud.listIdentifiers(
      { product_variant_id: variantIds },
      { take: 200 }
    )) as Array<{ id: string }>
    const identifierIds = identifiers.map((row) => row.id)
    if (!identifierIds.length) {
      res.json({ offers: [], count: 0, product_id: productIdFilter })
      return
    }
    filter.identifier_id = identifierIds
  }
  const offers = await commerce.listOffers(filter, { take: 200, order: { updated_at: "DESC" } })
  const sellerNames = new Map<string, string>()
  const rows: Array<{
    id: string
    product_id: string | null
    title: string | null
    identifier_value: string | null
    seller_id: string
    seller_name: string
    region_code: string
    seller_sku: string | null
    sales_status: string
    delivery_days_max: number | null
    shipping_profile_id: string | null
    base_price: unknown
    promo_price: unknown
    shipping_cost: unknown
    quantity_available: number | null
    primary_image_url: string | null
  }> = []
  const productCache = new Map<string, { title: string | null; primary_image_url: string | null }>()
  for (const offer of offers) {
    const identifier = await productCloud
      .retrieveIdentifier(offer.identifier_id)
      .catch(() => null)
    const variant = identifier
      ? await productCloud
          .retrieveProductVariant(
            (identifier as { product_variant_id: string }).product_variant_id
          )
          .catch(() => null)
      : null
    const productId = (variant as { product_id?: string } | null)?.product_id || null
    let title: string | null = null
    let primaryImage: string | null = null
    if (productId) {
      const cached = productCache.get(productId)
      if (cached) {
        title = cached.title
        primaryImage = cached.primary_image_url
      } else {
        const versions = (await productCloud.listProductVersions({ product_id: productId })) as Array<{
          id: string
          title: string
          publication_status: string
        }>
        const working =
          versions.find((v) => v.publication_status === "Gepubliceerd") || versions[0]
        title = working?.title || null
        if (working) {
          const media = (await productCloud.listProductMedias(
            { product_version_id: working.id },
            { order: { sort_order: "ASC" }, take: 8 }
          )) as Array<{ media_type: string; storage_reference?: string | null }>
          const primary =
            media.find((item) => item.media_type === "Hoofdafbeelding") ||
            media.find((item) => item.media_type !== "Video")
          primaryImage = primary?.storage_reference || null
        }
        productCache.set(productId, { title, primary_image_url: primaryImage })
      }
    }
    let sellerName = sellerNames.get(offer.seller_id)
    if (!sellerName) {
      try {
        const seller = await partner.retrieveSeller(offer.seller_id, { relations: ["company"] })
        const company = seller.company as { legal_name?: string } | undefined
        sellerName = company?.legal_name?.trim() || offer.seller_id
      } catch {
        sellerName = offer.seller_id
      }
      sellerNames.set(offer.seller_id, sellerName)
    }
    const prices = (await commerce.listOfferPrices({ offer_id: offer.id }, { take: 1 })) as Array<{
      base_price?: unknown
      promo_price?: unknown
      shipping_cost?: unknown
    }>
    const stock = (await commerce.listOfferInventories({ offer_id: offer.id }, { take: 1 })) as Array<{
      quantity_available?: number
    }>
    const row = {
      id: offer.id,
      product_id: productId,
      title,
      identifier_value: (identifier as { identifier_value?: string } | null)?.identifier_value || null,
      seller_id: offer.seller_id,
      seller_name: sellerName,
      region_code: offer.region_code,
      seller_sku: offer.seller_sku,
      sales_status: offer.sales_status,
      delivery_days_max: offer.delivery_days_max,
      shipping_profile_id: offer.shipping_profile_id,
      base_price: prices[0]?.base_price ?? null,
      promo_price: prices[0]?.promo_price ?? null,
      shipping_cost: prices[0]?.shipping_cost ?? null,
      quantity_available: stock[0]?.quantity_available ?? null,
      primary_image_url: primaryImage,
    }
    if (q) {
      const hay = [row.title, row.identifier_value, row.seller_name, row.seller_sku, row.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!hay.includes(q)) continue
    }
    rows.push(row)
  }
  res.json({ offers: rows, count: rows.length })
}
