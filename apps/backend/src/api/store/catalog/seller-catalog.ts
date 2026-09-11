import type { MedusaContainer } from "@medusajs/framework/types"
import { COMMERCE_CLOUD_MODULE } from "../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { resolveSellerContact } from "../../admin/partner-onboarding/seller-enrichment"
import { persistMediaReference } from "@europmade/utils"
import {
  listPublishedCatalogProducts,
  sellerPublicSlug,
  type CatalogListItem,
} from "./catalog-helpers"

export type CatalogSellerProfile = {
  id: string
  slug: string
  name: string
  country_code: string | null
  contact_email: string | null
  website_url: string | null
  logo_url: string | null
  banner_url: string | null
  product_count: number
}

export async function loadSellerCatalogPage(
  scope: MedusaContainer,
  slug: string,
  opts: { region_code?: string } = {}
): Promise<{ seller: CatalogSellerProfile; products: CatalogListItem[] } | null> {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return null

  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const sellers = (await partner.listSellers(
    { onboarding_status: "Goedgekeurd" },
    { take: 300, relations: ["company"] }
  )) as Array<{
    id: string
    customer_id: string
    company_id?: string | null
    logo_url?: string | null
    banner_url?: string | null
    company?: {
      legal_name?: string
      country_code?: string
      vat_number?: string | null
    } | null
  }>

  const match = sellers.find((row) => {
    const name = row.company?.legal_name?.trim() || ""
    const nameSlug = sellerPublicSlug(row.id, name)
    return (
      row.id.toLowerCase() === normalized ||
      nameSlug === normalized
    )
  })
  if (!match) return null

  const name = match.company?.legal_name?.trim() || `Seller ${match.id.slice(-6)}`
  const contact = await resolveSellerContact(scope, match.customer_id)

  const commerce = scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const offers = (await commerce.listOffers(
    { seller_id: match.id, sales_status: "active" },
    { take: 200 }
  )) as Array<{ identifier_id?: string }>

  const productIds = new Set<string>()
  for (const offer of offers) {
    const identifierId = offer.identifier_id?.trim()
    if (!identifierId) continue
    try {
      const identifier = (await productCloud.retrieveIdentifier(identifierId)) as {
        product_variant_id?: string
      }
      if (!identifier.product_variant_id) continue
      const variant = (await productCloud.retrieveProductVariant(
        identifier.product_variant_id
      )) as { product_id?: string }
      if (variant.product_id) productIds.add(variant.product_id)
    } catch {
      continue
    }
  }

  const region_code = opts.region_code ?? "NL"
  const { products: published } = await listPublishedCatalogProducts(scope, {
    region_code,
    take: 400,
  })
  const products = published.filter((p) => productIds.has(p.id))

  return {
    seller: {
      id: match.id,
      slug: sellerPublicSlug(match.id, name),
      name,
      country_code: match.company?.country_code ?? null,
      contact_email: contact.email,
      website_url: null,
      logo_url: persistMediaReference(match.logo_url) ?? match.logo_url ?? null,
      banner_url:
        persistMediaReference(match.banner_url) ?? match.banner_url ?? null,
      product_count: products.length,
    },
    products,
  }
}
