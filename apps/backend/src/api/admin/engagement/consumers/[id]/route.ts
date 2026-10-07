import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { cmsService } from "../../cms-request"
import { presentConsumer, type ConsumerRow } from "../../consumer-present"

const STATUS_LABELS: Record<string, string> = {
  queued: "In wachtrij",
  sent: "Verzonden",
  failed: "Mislukt",
  bounced: "Teruggekomen",
  stopped: "Gestopt",
}

function consumerId(req: AuthenticatedMedusaRequest): string {
  const id = req.params.id?.trim() ?? ""
  if (!id) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Consument vereist een id.")
  return id
}

/** GET /admin/engagement/consumers/:id */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const id = consumerId(req)
  const service = cmsService(req.scope)
  let row: ConsumerRow & { customer_id?: string | null }
  try {
    row = (await service.retrieveEngagementConsumer(id)) as ConsumerRow & {
      customer_id?: string | null
    }
  } catch {
    res.status(404).json({ message: "Consument niet gevonden." })
    return
  }
  const communication = row.customer_id
    ? await listCommunication(service, row.customer_id)
    : []
  res.status(200).json({ consumer: presentConsumer(row), communication })
}

async function listCommunication(
  service: ReturnType<typeof cmsService>,
  customerId: string
) {
  const rows = (await service.listEngagementCommunicationEvents(
    { customer_id: customerId },
    { take: 20, order: { created_at: "DESC" } }
  )) as Array<{ status?: string; created_at?: unknown; template_id?: string | null }>
  return rows.map((row) => ({
    status: STATUS_LABELS[row.status ?? ""] ?? "Onbekend",
    at: row.created_at ? new Date(String(row.created_at)).toISOString() : null,
  }))
}
