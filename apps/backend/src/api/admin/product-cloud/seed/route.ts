import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { AdminSeedProductWithEanBodyInput } from "../validators"

/**
 * Minimale seed-route voor S3-03-03 E2E — géén volledige Product-CRUD
 * (dat is S3-03-04). Maakt product + versie + variant + identifier + category.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminSeedProductWithEanBodyInput>,
  res: MedusaResponse
) {
  const body = req.validatedBody
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const product = await productCloud.createProducts({
    brand_id: body.brand_id,
    manufacturer_id: body.manufacturer_id,
    current_owner_seller_id: body.current_owner_seller_id,
    lifecycle_status: "Retailer Created",
  })

  await productCloud.createOwnershipRecords({
    product_id: product.id,
    seller_id: body.current_owner_seller_id,
    valid_from: new Date(),
    valid_until: null,
  })

  const version = await productCloud.createProductVersions({
    product_id: product.id,
    version_number: 1,
    title: body.title,
    description: body.description ?? body.title,
    publication_status: "Concept",
    created_by_seller_id: body.current_owner_seller_id,
  })

  const variant = await productCloud.createProductVariants({
    product_id: product.id,
    variant_type: body.variant_type,
    variant_value: body.variant_value,
  })

  const identifier = await productCloud.createIdentifiers({
    product_variant_id: variant.id,
    identifier_type: body.identifier_type,
    identifier_value: body.identifier_value,
    country_scope: body.country_scope ?? null,
  })

  let category = (
    await productCloud.listCategories({ name: body.category_name })
  )[0]
  if (!category) {
    category = await productCloud.createCategories({
      name: body.category_name,
    })
  }

  await productCloud.createProductCategories({
    product_id: product.id,
    category_id: category.id,
  })

  res.status(201).json({
    product,
    version,
    variant,
    identifier,
    category,
  })
}
