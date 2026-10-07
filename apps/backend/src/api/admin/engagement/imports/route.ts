import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { classifyImportRows, type ImportRow } from "../../../../modules/engagement/import-rules"
import { cmsService, optionalString, recordBody } from "../cms-request"

type StoredOrg = {
  id?: string
  company_name?: string
  contacts?: Array<{ email?: string }>
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asRows(value: unknown): ImportRow[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
    return {
      company_name: text(row.company_name),
      contact_name: text(row.contact_name),
      email: text(row.email),
      website: text(row.website),
      category: text(row.category),
      role: text(row.role),
      sales_model: text(row.sales_model),
    }
  })
}

/** POST /admin/engagement/imports — controleert of importeert prospects. Geen overwrite. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const body = recordBody(req.body)
  const rows = asRows(body.rows)
  if (rows.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Het bestand bevat geen regels."
    )
  }
  if (rows.length > 500) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Importeer maximaal 500 regels tegelijk."
    )
  }
  const service = cmsService(req.scope)
  const stored = (await service.listEngagementOrganizations(
    {},
    { take: 500, relations: ["contacts"] }
  )) as StoredOrg[]
  const classified = classifyImportRows(
    rows,
    stored.map((organization) => ({
      company_name: text(organization.company_name),
      emails: (organization.contacts ?? []).map((contact) => text(contact.email)),
    }))
  )
  const summary = {
    new: classified.filter((row) => row.verdict === "new").length,
    existing: classified.filter((row) => row.verdict === "existing").length,
    possible_duplicate: classified.filter((row) => row.verdict === "possible_duplicate").length,
    invalid: classified.filter((row) => row.verdict === "invalid").length,
  }
  if (body.dry_run === true) {
    res.status(200).json({ dry_run: true, summary, rows: classified })
    return
  }
  const createdBatch = await service.createImportBatch({
    source: "excel_import",
    file_name: optionalString(body, "file_name") ?? null,
  })
  const batch = Array.isArray(createdBatch) ? createdBatch[0] : createdBatch
  const batchId = batch?.id
  if (!batchId) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Importbatch ontbreekt.")
  }
  let imported = 0
  for (const row of classified) {
    if (row.verdict !== "new") continue
    const created = await service.createOrganization({
      company_name: row.company_name,
      website: row.website || null,
      category: row.category || null,
      sales_model: row.sales_model_token,
      outreach_status: "nieuw",
      source: "excel_import",
      import_batch_id: batchId,
      roles: [row.role_token],
    })
    try {
      await service.createContact({
        organization_id: created.organization.id,
        email: row.email,
        name: row.contact_name || null,
      })
    } catch (err) {
      await service.softDeleteEngagementOrganizationRoles(created.roles.map((role) => role.id))
      await service.softDeleteEngagementOrganizations([created.organization.id])
      throw err
    }
    imported += 1
  }
  res.status(201).json({
    dry_run: false,
    imported,
    summary,
    rows: classified,
  })
}
