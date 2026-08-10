import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { getTranslationProvider } from "../../../../../modules/product-cloud/translation/provider"

/**
 * Admin overview: products with per-language translation coverage.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const limitRaw =
    typeof req.query.limit === "string" ? Number(req.query.limit) : 50
  const result = await productCloud.listTranslationProductOverview({
    limit: Number.isFinite(limitRaw) ? limitRaw : 50,
  })

  const provider = getTranslationProvider()
  res.status(200).json({
    ...result,
    provider_id: provider.id,
    machine_translation_active: provider.id !== "none",
    provider_message:
      provider.id === "none"
        ? "Automatische vertaling nog niet geactiveerd"
        : null,
  })
}
