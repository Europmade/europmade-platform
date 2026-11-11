import {
  TEST_CATALOG_DEMO_DELIVERY_DAYS,
  TEST_CATALOG_DEMO_SHIPPING_EUR,
  TEST_CATALOG_DEMO_STOCK,
  TEST_CATALOG_DEMO_VAT_RATE,
  TEST_CATALOG_SELLER_ID,
  isTestCatalogEnabled,
  testCatalogDemoBasePrice,
} from "@europmade/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { COMMERCE_CLOUD_MODULE } from "../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"

export type TestCatalogDemoSeed = {
  productId: string
  identifierId: string
  categorySlugs: string[]
}

export type TestCatalogDemoOffer = {
  offer_id: string
  seller_id: string
  seller_name: string
  seller_slug: string
  base_price: number
  shipping_cost: number
  total_price: number
  quantity_available: number
}

const DEMO_REGION = "NL"

let pending: Promise<Map<string, TestCatalogDemoOffer>> | null = null
let pendingKey = ""

/**
 * Maakt of werkt de vaste demo-aanbieding bij voor ongepubliceerde testproducten.
 * Alleen terwijl de testcatalogus aan staat. Gepubliceerde producten komen hier niet in.
 */
export function ensureTestCatalogDemoOffers(
  scope: MedusaContainer,
  rows: TestCatalogDemoSeed[]
): Promise<Map<string, TestCatalogDemoOffer>> {
  if (!isTestCatalogEnabled() || rows.length === 0) return Promise.resolve(new Map())
  const key = rows
    .map((row) => row.productId)
    .sort()
    .join(",")
  if (!pending || pendingKey !== key) {
    pendingKey = key
    pending = writeDemoOffers(scope, rows).catch((error) => {
      pending = null
      pendingKey = ""
      throw error
    })
  }
  return pending
}

async function writeDemoOffers(
  scope: MedusaContainer,
  rows: TestCatalogDemoSeed[]
): Promise<Map<string, TestCatalogDemoOffer>> {
  const commerce = scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const sellerName = await sellerDisplayName(partner)
  const shippingProfileId = await activeShippingProfileId(commerce)
  const result = new Map<string, TestCatalogDemoOffer>()

  for (const row of rows) {
    const identifierId = row.identifierId.trim()
    if (!identifierId) continue
    const basePrice = testCatalogDemoBasePrice(row.categorySlugs)
    const graph = await commerce.upsertOfferGraph({
      seller_id: TEST_CATALOG_SELLER_ID,
      identifier_id: identifierId,
      region_code: DEMO_REGION,
      quantity_available: TEST_CATALOG_DEMO_STOCK,
      base_price: basePrice,
      shipping_cost: TEST_CATALOG_DEMO_SHIPPING_EUR,
      vat_rate: TEST_CATALOG_DEMO_VAT_RATE,
      sales_status: "active",
      delivery_days_max: TEST_CATALOG_DEMO_DELIVERY_DAYS,
      extra_delivery_cost: 0,
      shipping_profile_id: shippingProfileId,
      clear_promo: true,
    })
    const total = basePrice + TEST_CATALOG_DEMO_SHIPPING_EUR
    result.set(row.productId, {
      offer_id: graph.offer_id,
      seller_id: TEST_CATALOG_SELLER_ID,
      seller_name: sellerName,
      seller_slug: slugify(sellerName) || TEST_CATALOG_SELLER_ID.toLowerCase(),
      base_price: basePrice,
      shipping_cost: TEST_CATALOG_DEMO_SHIPPING_EUR,
      total_price: total,
      quantity_available: TEST_CATALOG_DEMO_STOCK,
    })
  }
  return result
}

async function sellerDisplayName(partner: PartnerModuleService): Promise<string> {
  try {
    const seller = await partner.retrieveSeller(TEST_CATALOG_SELLER_ID, {
      relations: ["company"],
    })
    const company = (seller as { company?: { legal_name?: string } | null }).company
    const name = company?.legal_name?.trim()
    if (name) return name
  } catch {
    /* De aanbieding blijft aan het seller-id hangen wanneer de naam niet leesbaar is. */
  }
  return "Demo-verkoper"
}

async function activeShippingProfileId(
  commerce: CommerceCloudModuleService
): Promise<string | null> {
  const offers = (await commerce.listOffers(
    { seller_id: TEST_CATALOG_SELLER_ID, sales_status: "active" },
    { take: 100 }
  )) as Array<{ shipping_profile_id?: string | null; delivery_days_max?: number | null }>
  const withDelivery = offers.find(
    (offer) => offer.shipping_profile_id && Number(offer.delivery_days_max) > 0
  )
  const profileId = (withDelivery ?? offers.find((offer) => offer.shipping_profile_id))
    ?.shipping_profile_id
  return profileId?.trim() || null
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
