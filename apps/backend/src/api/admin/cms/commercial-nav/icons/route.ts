import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveMediaUrl } from "@europmade/utils"
import { requestBackendOrigin } from "../../../../request-backend-origin"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import {
  listCommercialNavIconRows,
  serializeCommercialNavIconCatalog,
} from "../icon-helpers"

/**
 * GET /admin/cms/commercial-nav/icons
 * One row per commercial hoofdcategorie (Fase 5), not pc_category.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const origin = requestBackendOrigin(req)
  const rows = await listCommercialNavIconRows(cms)
  res.status(200).json({
    icons: serializeCommercialNavIconCatalog(rows, (ref) =>
      resolveMediaUrl(ref, origin)
    ),
  })
}
