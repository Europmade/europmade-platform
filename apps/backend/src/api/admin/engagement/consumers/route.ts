import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cmsService } from "../cms-request"
import { presentConsumer, type ConsumerRow } from "../consumer-present"

/** GET /admin/engagement/consumers — eindklanten en nieuwsbriefinschrijvers. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : ""
  const rows = (await cmsService(req.scope).listEngagementConsumers(
    {},
    { take: 200, order: { updated_at: "DESC" } }
  )) as ConsumerRow[]
  const consumers = rows
    .map(presentConsumer)
    .filter((row) => {
      if (!q) return true
      return `${row.name} ${row.email}`.toLowerCase().includes(q)
    })
  res.status(200).json({ consumers })
}
