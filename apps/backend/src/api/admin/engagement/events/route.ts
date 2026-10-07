import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { loadEngagementEvents } from "../admin-engagement-query"

function historyError(err: unknown): string | null {
  const message = err instanceof Error ? err.message : ""
  if (
    message.startsWith("Onbekende communication-event-status") ||
    message.startsWith("Datumfilter")
  ) {
    return message
  }
  return null
}

/** GET /admin/engagement/events — read-only communication history. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const result = await loadEngagementEvents(
      req.scope,
      req.query as Record<string, unknown>
    )
    res.status(200).json(result)
  } catch (err) {
    const message = historyError(err)
    if (message) {
      res.status(400).json({ message })
      return
    }
    throw err
  }
}
