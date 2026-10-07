import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { loadEngagementEvent } from "../../admin-engagement-query"

/** GET /admin/engagement/events/:id — read-only event detail. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = req.params.id?.trim() ?? ""
  if (!id) {
    res.status(400).json({ message: "CommunicationEvent vereist een id." })
    return
  }
  const event = await loadEngagementEvent(req.scope, id)
  if (!event) {
    res.status(404).json({ message: "CommunicationEvent niet gevonden." })
    return
  }
  res.status(200).json({ event })
}
