import type { MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../../modules/cms/service"
import {
  actorId,
  sendCategoryPd,
  sendPdError,
  slugOf,
  type CatSlugReq,
} from "../../../category-pd-http"
import { requireCategoryProfile } from "../../../resolve-category-profile"

/**
 * POST /admin/cms/categories/:slug/draft/rebase
 * Body: {
 *   mode: "keep_draft_content" | "replace_with_live",
 *   expected_draft_revision,
 *   acknowledge_unmerged_live?: boolean,
 *   confirm_destroy_draft_changes?: boolean
 * }
 */
export async function POST(req: CatSlugReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req)
  const body = (req.body ?? {}) as Record<string, unknown>
  const mode =
    body.mode === "replace_with_live" ? "replace_with_live" : "keep_draft_content"
  try {
    const profile = await requireCategoryProfile(req.scope, slug)
    const row = await cms.rebaseCategoryDraft({
      slug,
      mode,
      expectedDraftRevision: body.expected_draft_revision,
      acknowledgeUnmergedLive: body.acknowledge_unmerged_live === true,
      confirmDestroyDraftChanges: body.confirm_destroy_draft_changes === true,
      actorId: actorId(req),
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
