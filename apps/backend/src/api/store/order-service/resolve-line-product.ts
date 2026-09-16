/**
 * Resolve human-readable product info for an order line via
 * offer → identifier → product_variant → product_version.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { COMMERCE_CLOUD_MODULE } from "../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"

export type OrderLineProductInfo = {
  product_name: string
  variant_name: string | null
  sku: string | null
  product_variant_id: string
  product_id: string | null
  offer_id: string
}

function looksLikeTechnicalId(value: string): boolean {
  return /^(offer|offr|variant|pvar|prod|pprd|oline|mord)_/i.test(value)
}

export async function resolveOrderLineProductInfo(
  container: MedusaContainer,
  line: {
    offer_id: string
    product_variant_id: string
  }
): Promise<OrderLineProductInfo> {
  const fallback: OrderLineProductInfo = {
    product_name: "",
    variant_name: null,
    sku: null,
    product_variant_id: line.product_variant_id,
    product_id: null,
    offer_id: line.offer_id,
  }

  let commerce: CommerceCloudModuleService | null = null
  let productCloud: ProductCloudModuleService | null = null
  try {
    commerce = container.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }
  try {
    productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
  } catch {
    productCloud = null
  }

  let variantId = line.product_variant_id
  let sku: string | null = null

  if (commerce && line.offer_id) {
    try {
      const offer = await commerce.retrieveOffer(line.offer_id)
      if (productCloud && offer.identifier_id) {
        try {
          const identifier = await productCloud.retrieveIdentifier(
            offer.identifier_id
          )
          variantId = identifier.product_variant_id || variantId
          if (identifier.identifier_type === "GTIN") {
            sku = identifier.identifier_value
          } else if (!sku) {
            sku = identifier.identifier_value
          }
        } catch {
          // keep variantId from line
        }
      }
    } catch {
      // offer may be seed-only / missing
    }
  }

  let productName = ""
  let variantName: string | null = null
  let productId: string | null = null

  if (productCloud && variantId) {
    try {
      const variant = await productCloud.retrieveProductVariant(variantId)
      productId = variant.product_id ? String(variant.product_id) : null
      if (variant.variant_type && variant.variant_value) {
        variantName = `${variant.variant_type}: ${variant.variant_value}`
      } else if (variant.variant_value) {
        variantName = String(variant.variant_value)
      }

      const versions = await productCloud.listProductVersions(
        { product_id: variant.product_id },
        { order: { version_number: "DESC" } }
      )
      const published = versions.find(
        (v) => v.publication_status === "Gepubliceerd"
      )
      const version = published ?? versions[0]
      if (version?.title?.trim()) {
        productName = version.title.trim()
      }

      if (!sku) {
        const identifiers = await productCloud.listIdentifiers({
          product_variant_id: variantId,
        })
        const gtin = identifiers.find((i) => i.identifier_type === "GTIN")
        sku = gtin?.identifier_value ?? identifiers[0]?.identifier_value ?? null
      }
    } catch {
      // unresolved
    }
  }

  // Never surface technical IDs as the product name
  if (!productName || looksLikeTechnicalId(productName)) {
    productName = variantName || sku || "—"
    if (looksLikeTechnicalId(productName)) {
      productName = "—"
    }
  }

  return {
    product_name: productName,
    variant_name: variantName,
    sku,
    product_variant_id: variantId,
    product_id: productId,
    offer_id: line.offer_id,
  }
}

export async function resolveOrderLinesProductInfo(
  container: MedusaContainer,
  lines: Array<{ offer_id: string; product_variant_id: string; id: string }>
): Promise<Map<string, OrderLineProductInfo>> {
  const map = new Map<string, OrderLineProductInfo>()
  for (const line of lines) {
    map.set(line.id, await resolveOrderLineProductInfo(container, line))
  }
  return map
}
