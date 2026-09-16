import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { resolveApprovedSeller } from "../resolve-seller"
import {
  getRequiredProductCloudTargetLanguages,
  listActiveProductCloudLanguageOptions,
} from "../../../../modules/product-cloud/languages"

/**
 * GET /store/product-cloud/languages
 * Active source-language options from central Product Cloud config.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  res.json({
    languages: listActiveProductCloudLanguageOptions(),
    required_target_languages: getRequiredProductCloudTargetLanguages(),
  })
}
