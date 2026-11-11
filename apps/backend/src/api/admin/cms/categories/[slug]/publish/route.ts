import type { MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../modules/cms/service"
import {
  actorId,
  sendCategoryPd,
  sendPdError,
  slugOf,
  type CatSlugReq,
} from "../../category-pd-http"
import { requireCategoryProfile } from "../../resolve-category-profile"

/**
 * POST /admin/cms/categories/:slug/publish
 * Body: { confirm: true, expected_draft_revision, note? }
 */
export async function POST(req: CatSlugReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req)
  const body = (req.body ?? {}) as Record<string, unknown>
  try {
    const profile = await requireCategoryProfile(req.scope, slug)
    const row = await cms.publishCategoryDraft({
      slug,
      confirm: body.confirm === true,
      expectedDraftRevision: body.expected_draft_revision,
      note: typeof body.note === "string" ? body.note : null,
      actorId: actorId(req),
      source: "editor_publish",
      __testFaultAfterRevision:
        body.__test_fault_after_revision === true && slug.startsWith("__pd_"),
      profile,
    })
    await sendCategoryPd(res, row as unknown as Record<string, unknown>, {
      scope: req.scope,
      slug,
      req,
    })
  } catch (err) {
    if (sendPdError(res, err)) return
    throw err
  }
}
