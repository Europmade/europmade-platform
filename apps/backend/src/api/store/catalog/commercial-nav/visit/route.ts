import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isCommercialNavKey } from "@europmade/utils"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { recordCommercialNavVisit } from "../../commercial-nav-enrich"

type VisitBody = {
  category_key?: unknown
  session_id?: unknown
}

/**
 * POST /store/catalog/commercial-nav/visit
 * Anonymous hashed session + commercial key. No IP/UA. Deduped per day.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as VisitBody
  const categoryKey =
    typeof body.category_key === "string" ? body.category_key.trim().toLowerCase() : ""
  const sessionId = typeof body.session_id === "string" ? body.session_id : ""
  if (!isCommercialNavKey(categoryKey)) {
    res.status(400).json({ message: "Ongeldige commerciële categorie." })
    return
  }
  try {
    const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
    const result = await recordCommercialNavVisit(cms, sessionId, categoryKey)
    res.status(200).json({ ok: true, recorded: result.recorded })
  } catch {
    res.status(200).json({ ok: true, recorded: false })
  }
}
