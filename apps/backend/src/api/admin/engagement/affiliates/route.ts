import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import type AffiliateModuleService from "../../../../modules/affiliate/service"
import { presentAffiliateDossier } from "../affiliate-dossier"

/** GET /admin/engagement/affiliates — bestaande affiliates, geen tweede database. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const affiliate = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const rows = await affiliate.listAffiliates({}, { take: 200, order: { created_at: "DESC" } })
  const partners = []
  for (const row of rows) {
    partners.push(await presentAffiliateDossier(req.scope, row))
  }
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : ""
  res.status(200).json({
    partners: q
      ? partners.filter((row) =>
          `${row.organization} ${row.contact_name ?? ""} ${row.email ?? ""}`
            .toLowerCase()
            .includes(q)
        )
      : partners,
  })
}
