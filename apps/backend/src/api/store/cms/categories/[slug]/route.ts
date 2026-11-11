import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { withResolvedStoreDocument } from "../../../../cms/category-asset-urls"
import { serializeCmsCategoryStore } from "../../../../cms/serialize"
import { requestBackendOrigin } from "../../../../request-backend-origin"

function isMissingCmsCategoryTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes("cms_category") && msg.includes("does not exist")
}

/**
 * GET /store/cms/categories/:slug — alleen published_document.
 * Draft lekt nooit naar deze response.
 */
export async function GET(
  req: MedusaRequest & { params: { slug: string } },
  res: MedusaResponse
) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = decodeURIComponent(req.params.slug ?? "").trim().toLowerCase()
  try {
    const rows = await cms.listCmsCategories(
      { category_slug: slug },
      { take: 1 }
    )
    const row = rows[0] as unknown as Record<string, unknown> | undefined
    if (!row) {
      res.status(200).json({ category: null })
      return
    }
    const category = serializeCmsCategoryStore(row)
    if (category) {
      category.document = await withResolvedStoreDocument(
        req.scope,
        category.document,
        requestBackendOrigin(req)
      )
    }
    res.status(200).json({ category })
  } catch (err) {
    if (isMissingCmsCategoryTable(err)) {
      res.status(200).json({ category: null })
      return
    }
    throw err
  }
}
