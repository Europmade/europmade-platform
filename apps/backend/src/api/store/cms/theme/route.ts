import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { serializeHomepage } from "../../../cms/serialize"

/**
 * GET /store/cms/theme — published design tokens only.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const rows = await cms.listCmsHomepages(
    { document_key: "theme", published: true },
    { take: 1 }
  )
  const row = rows[0] ?? null
  res.status(200).json({
    theme: row ? serializeHomepage(row as unknown as Record<string, unknown>) : null,
  })
}
