import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../../modules/cms/service"
import { rewriteMediaStrings } from "@europmade/utils"

type Req = MedusaRequest & { params: { slug: string; version: string } }

/**
 * GET /admin/cms/categories/:slug/revisions/:version — view historical document.
 */
export async function GET(req: Req, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = decodeURIComponent(req.params.slug ?? "").trim().toLowerCase()
  const version = Number(req.params.version)
  if (!Number.isFinite(version) || version < 1) {
    res.status(400).json({ type: "invalid_version", message: "Invalid version" })
    return
  }
  const rows = await cms.listCmsCategoryRevisions(
    { category_slug: slug, version },
    { take: 1 }
  )
  const row = rows[0] as unknown as Record<string, unknown> | undefined
  if (!row) {
    res.status(404).json({
      type: "revision_not_found",
      message: `Revision v${version} not found`,
    })
    return
  }
  res.status(200).json({
    revision: {
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
      document: rewriteMediaStrings(row.document ?? {}, "http://localhost:9000"),
      superseded_document:
        row.superseded_document == null
          ? null
          : rewriteMediaStrings(
              row.superseded_document,
              "http://localhost:9000"
            ),
    },
  })
}
