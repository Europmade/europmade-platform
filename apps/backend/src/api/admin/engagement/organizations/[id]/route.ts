import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { loadEngagementOrganization } from "../../admin-engagement-query"
import { cmsService, optionalString, recordBody } from "../../cms-request"
import {
  classificationFrom,
  guardConversion,
  paramId,
  respondOrganization,
} from "../../prospect-request"

/** GET /admin/engagement/organizations/:id — organisatiedetail. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = req.params.id?.trim() ?? ""
  if (!id) {
    res.status(400).json({ message: "Organization vereist een id." })
    return
  }
  const organization = await loadEngagementOrganization(req.scope, id)
  if (!organization) {
    res.status(404).json({ message: "Organization niet gevonden." })
    return
  }
  res.status(200).json({ organization })
}

/** POST — CRM-velden. Conversierefs wijzigen hier niet. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = paramId(req.params.id, "Organization")
  const body = recordBody(req.body)
  guardConversion(body)
  const classification = classificationFrom(body)
  await cmsService(req.scope).updateOrganization({
    id,
    company_name: optionalString(body, "company_name"),
    website: optionalString(body, "website"),
    category: optionalString(body, "category"),
    sales_model: optionalString(body, "sales_model"),
    outreach_status: optionalString(body, "outreach_status"),
    source: optionalString(body, "source"),
    outreach_purpose: optionalString(body, "outreach_purpose"),
    self_classification_payload: classification,
  })
  res.status(200).json({
    organization: await respondOrganization(req.scope, id),
  })
}
