import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { slugifyAdvertising } from "../../../helpers"
import { resolveSellerPublicSlug } from "../../../destination"
import { loadAdvertisingProductCards } from "../../../public-product-cards"

async function findSellerIdByPublicSlug(
  container: MedusaContainer,
  sellerSlug: string
): Promise<{ sellerId: string; displayName: string } | null> {
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const sellers = await partner.listSellers(
    {},
    { relations: ["company"], take: 2000 }
  )
  for (const s of sellers) {
    const { seller_public_slug, seller_display_name } =
      await resolveSellerPublicSlug(container, s.id)
    if (seller_public_slug === sellerSlug) {
      return { sellerId: s.id, displayName: seller_display_name }
    }
  }
  for (const s of sellers) {
    const company = (s as { company?: { legal_name?: string } }).company
    const name = company?.legal_name?.trim()
    if (name && slugifyAdvertising(name) === sellerSlug) {
      return { sellerId: s.id, displayName: name }
    }
  }
  return null
}

/**
 * GET /store/advertising/public/sellers/:sellerSlug
 * Public seller shop — published products owned by seller.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const sellerSlug = String(req.params.sellerSlug || "")
  const found = await findSellerIdByPublicSlug(req.scope, sellerSlug)
  if (!found) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Seller not found.")
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const owned = await productCloud.listProducts(
    { current_owner_seller_id: found.sellerId },
    { take: 500 }
  )

  const products = await loadAdvertisingProductCards(
    productCloud,
    owned.map((p) => p.id),
    { requirePublished: true }
  )

  res.json({
    seller: {
      id: found.sellerId,
      name: found.displayName,
      slug: sellerSlug,
      href: `/seller/${encodeURIComponent(sellerSlug)}`,
    },
    products,
  })
}
