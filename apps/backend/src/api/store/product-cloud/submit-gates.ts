import { MedusaError } from "@medusajs/framework/utils"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { resolveCatalogGtinValue } from "../../../modules/product-cloud/concept-identifier"

const SUBMIT_GTIN_MESSAGE =
  "EAN/GTIN is vereist voordat je het product ter beoordeling kunt indienen."

/** Block submission when no valid GTIN is linked to any variant. */
export async function assertValidGtinForSubmission(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<string> {
  const variants = await productCloud.listProductVariants({ product_id: productId })
  for (const variant of variants) {
    const identifiers = await productCloud.listIdentifiers({
      product_variant_id: variant.id,
    })
    for (const row of identifiers) {
      const gtin = resolveCatalogGtinValue(
        row.identifier_type,
        row.identifier_value,
        row.country_scope
      )
      if (gtin) return gtin
    }
  }
  throw new MedusaError(MedusaError.Types.NOT_ALLOWED, SUBMIT_GTIN_MESSAGE)
}

export { SUBMIT_GTIN_MESSAGE }
