import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EU_MARKET_CODES } from "@europmade/types"
import { MEDIA_REQUIREMENTS } from "@europmade/utils"

/**
 * GET /admin/cms/meta — markets + media requirements for Admin UI.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.status(200).json({
    markets: EU_MARKET_CODES,
    media_requirements: MEDIA_REQUIREMENTS,
    note: "Locale (taal) en market (land) zijn afzonderlijke instellingen.",
  })
}
