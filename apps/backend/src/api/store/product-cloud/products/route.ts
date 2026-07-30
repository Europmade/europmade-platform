import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { createProductCloudWorkflow } from "../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../resolve-seller"
import type { StoreCreateProductBodyInput } from "../validators"
import { buildProductCloudPreview } from "../product-preview"

/** Eigen catalogus (eigenaarschap) — PM §8/§9 + ADR-0013 preview-velden. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const products = await productCloud.listProducts({
    current_owner_seller_id: seller.id,
  })

  const enriched = []
  for (const product of products) {
    const preview = await buildProductCloudPreview(productCloud, product.id)
    enriched.push({
      ...product,
      title: preview.title,
      category_names: preview.category_names,
      identifier_id: preview.identifier_id,
      identifier_type: preview.identifier_type,
      identifier_value: preview.identifier_value,
    })
  }

  res.json({ products: enriched, count: enriched.length })
}

/**
 * Nieuw Product Cloud-record — Retailer Created of Concept gecontroleerd.
 * Exacte EAN-match → geen duplicaat (marketplace-core §16).
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreCreateProductBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const body = req.validatedBody

  const { result } = await createProductCloudWorkflow(req.scope).run({
    input: {
      seller_id: seller.id,
      is_retailer: seller.is_retailer,
      is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
      create_as_retailer: body.create_as_retailer,
      brand_id: body.brand_id,
      manufacturer_id: body.manufacturer_id,
      title: body.title,
      description: body.description,
      category_name: body.category_name,
      identifier_type: body.identifier_type,
      identifier_value: body.identifier_value,
      country_scope: body.country_scope,
      variant_type: body.variant_type,
      variant_value: body.variant_value,
      media: body.media,
    },
  })

  if (!result.created && result.exact_match_existing) {
    res.status(200).json({
      created: false,
      exact_match_existing: true,
      product_id: result.product_id,
      identifier_id: result.identifier_id,
      message:
        "Exacte EAN-match: koppel een Offer aan het bestaande product (Commerce Cloud), maak geen duplicaat.",
    })
    return
  }

  res.status(201).json(result)
}
