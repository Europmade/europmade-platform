import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../../../modules/cms/service"
import {
  actorId,
  sendCategoryPd,
  sendPdError,
} from "../../../../category-pd-http"
import { requireCategoryProfile } from "../../../../resolve-category-profile"

type Req = MedusaRequest & { params: { slug: string; version: string } }

/**
 * POST /admin/cms/categories/:slug/revisions/:version/restore-and-publish
 * Body: { confirm: true, note?, expected_draft_revision? }
 */
export async function POST(req: Req, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = decodeURIComponent(req.params.slug ?? "").trim().toLowerCase()
  const version = Number(req.params.version)
  const body = (req.body ?? {}) as Record<string, unknown>
  if (!Number.isFinite(version) || version < 1) {
    res.status(400).json({ type: "invalid_version", message: "Invalid version" })
    return
  }
  try {
    const profile = await requireCategoryProfile(req.scope, slug)
    const row = await cms.restoreRevisionAndPublish({
      slug,
      version,
      confirm: body.confirm === true,
      note: typeof body.note === "string" ? body.note : null,
      actorId: actorId(req),
      expectedDraftRevision: body.expected_draft_revision,
      profile,
    })
    await sendCategoryPd(res, row as unknown as Record<string, unknown>, {
      restoredFromVersion: version,
      scope: req.scope,
      slug,
      req,
    })
  } catch (err) {
    if (sendPdError(res, err)) return
    throw err
  }
}
