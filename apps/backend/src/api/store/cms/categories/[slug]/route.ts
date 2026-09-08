import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { serializeCmsCategory } from "../../../../cms/serialize"

function isMissingCmsCategoryTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes("cms_category") && msg.includes("does not exist")
}

/**
 * GET /store/cms/categories/:slug — alleen gepubliceerde categorie-CMS.
 */
export async function GET(
  req: MedusaRequest & { params: { slug: string } },
  res: MedusaResponse
) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = decodeURIComponent(req.params.slug ?? "").trim().toLowerCase()
  try {
    const rows = await cms.listCmsCategories(
      { category_slug: slug, published: true },
      { take: 1 }
    )
    const row = rows[0]
    if (!row) {
      res.status(200).json({ category: null })
      return
    }
    res.status(200).json({
      category: serializeCmsCategory(row as unknown as Record<string, unknown>),
    })
  } catch (err) {
    if (isMissingCmsCategoryTable(err)) {
      res.status(200).json({ category: null })
      return
    }
    throw err
  }
}
