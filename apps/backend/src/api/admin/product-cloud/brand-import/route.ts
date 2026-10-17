import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { executeBrandImport } from "./run"
import { brandImportRequest } from "./shared"

/** POST /admin/product-cloud/brand-import — brand mode. Never creates an offer. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const result = await executeBrandImport(req.scope, brandImportRequest(req))
  if (result.plan.blocked) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      result.plan.reason || "Import geblokkeerd. Er is niets weggeschreven."
    )
  }
  res.json({
    batch_id: result.batch_id,
    created: result.created,
    proposals: result.proposals,
    translations_added: result.translations_added,
    offers_created: 0,
    summary: result.preview.summary,
  })
}
