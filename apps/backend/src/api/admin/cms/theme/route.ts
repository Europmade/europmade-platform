import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { serializeHomepage } from "../../../cms/serialize"

const THEME_KEY = "theme"

async function getOrNull(cms: CmsModuleService) {
  const rows = await cms.listCmsHomepages(
    { document_key: THEME_KEY },
    { take: 1 }
  )
  return rows[0] ?? null
}

/**
 * GET /admin/cms/theme — singleton design tokens (cms_homepage.document_key=theme).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const row = await getOrNull(cms)
  res.status(200).json({
    theme: row ? serializeHomepage(row as unknown as Record<string, unknown>) : null,
  })
}

/**
 * PUT /admin/cms/theme — upsert concept/published theme.
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const body = (req.body ?? {}) as Record<string, unknown>
  const document =
    body.document && typeof body.document === "object" ? body.document : {}

  const payload = {
    document_key: THEME_KEY,
    document,
    published: Boolean(body.published),
    seo_canonical: "/theme",
  }

  const existing = await getOrNull(cms)
  const row = existing
    ? await cms.updateCmsHomepages({ id: existing.id, ...payload })
    : await cms.createCmsHomepages(payload)

  res.status(200).json({
    theme: serializeHomepage(row as unknown as Record<string, unknown>),
  })
}
