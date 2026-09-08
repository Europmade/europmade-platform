import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { serializeCmsCategory } from "../../../cms/serialize"

/**
 * GET /admin/cms/categories — editorial CMS rows (not pc_category taxonomy).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  try {
    const rows = await cms.listCmsCategories(
      {},
      { order: { category_slug: "ASC" }, take: 200 }
    )
    res.status(200).json({
      categories: rows.map((r) =>
        serializeCmsCategory(r as unknown as Record<string, unknown>)
      ),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("cms_category") && msg.includes("does not exist")) {
      res.status(200).json({ categories: [] })
      return
    }
    throw err
  }
}
