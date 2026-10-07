import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { loadEngagementOrganizations } from "../admin-engagement-query"
import { cmsService, optionalString, recordBody, requiredString } from "../cms-request"
import {
  classificationFrom,
  guardConversion,
  respondOrganization,
  roleList,
} from "../prospect-request"

/** GET /admin/engagement/organizations — prospectlijst. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const result = await loadEngagementOrganizations(
    req.scope,
    req.query as Record<string, unknown>
  )
  res.status(200).json(result)
}

/** POST — nieuwe prospect. Conversierefs zijn niet instelbaar. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const body = recordBody(req.body)
  guardConversion(body)
  const created = await cmsService(req.scope).createOrganization({
    company_name: requiredString(body, "company_name", "Bedrijfsnaam"),
    website: optionalString(body, "website") ?? null,
    category: optionalString(body, "category") ?? null,
    sales_model: optionalString(body, "sales_model"),
    outreach_status: optionalString(body, "outreach_status"),
    source: optionalString(body, "source"),
    outreach_purpose: optionalString(body, "outreach_purpose") ?? null,
    self_classification_payload: classificationFrom(body) ?? null,
    roles: roleList(body),
  })
  const contactEmail = optionalString(body, "contact_email")
  if (contactEmail) {
    try {
      await cmsService(req.scope).createContact({
        organization_id: created.organization.id,
        email: contactEmail,
        name: optionalString(body, "contact_name") ?? null,
      })
    } catch (err) {
      const service = cmsService(req.scope)
      await service.softDeleteEngagementOrganizationRoles(
        created.roles.map((role) => role.id)
      )
      await service.softDeleteEngagementOrganizations([created.organization.id])
      throw err
    }
  }
  const organization = await respondOrganization(
    req.scope,
    created.organization.id
  )
  res.status(201).json({ organization })
}
