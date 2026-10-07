import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { loadEngagementOverview } from "../admin-engagement-query"

/** GET /admin/engagement/overview — tellingen uit bestaande engagement-data. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const overview = await loadEngagementOverview(req.scope)
  res.status(200).json(overview)
}
