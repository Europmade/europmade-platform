import type { MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../modules/cms/service"
import { slugOf, type CatSlugReq } from "../../category-pd-http"

/**
 * GET /admin/cms/categories/:slug/revisions
 */
export async function GET(req: CatSlugReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req)
  const rows = await cms.listCmsCategoryRevisions(
    { category_slug: slug },
    { order: { version: "DESC" }, take: 200 }
  )
  res.status(200).json({
    revisions: rows.map((r) => {
      const row = r as unknown as Record<string, unknown>
      return {
        version: Number(row.version ?? 0),
        published_at: row.published_at ?? null,
        published_by: row.published_by ?? null,
        note: row.note ?? null,
        source: row.source ?? null,
        restored_from_version:
          row.restored_from_version == null
            ? null
            : Number(row.restored_from_version),
        kind: row.kind ?? null,
      }
    }),
  })
}
