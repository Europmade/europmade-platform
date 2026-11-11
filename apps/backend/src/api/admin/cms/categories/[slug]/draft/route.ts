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
 * POST /admin/cms/categories/:slug/draft
 * Body: { from?: "published" | "empty", overwrite?: boolean }
 */
export async function POST(req: CatSlugReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req)
  const body = (req.body ?? {}) as Record<string, unknown>
  const from = body.from === "published" ? "published" : "empty"
  try {
    const profile = await requireCategoryProfile(req.scope, slug)
    const row = await cms.createCategoryDraft({
      slug,
      from,
      overwrite: body.overwrite === true,
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

/**
 * PATCH /admin/cms/categories/:slug/draft
 * Body: { document, expected_draft_revision }
 */
export async function PATCH(req: CatSlugReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req)
  const body = (req.body ?? {}) as Record<string, unknown>
  try {
    const profile = await requireCategoryProfile(req.scope, slug)
    const row = await cms.saveCategoryDraft({
      slug,
      document: body.document,
      expectedDraftRevision: body.expected_draft_revision,
      actorId: actorId(req),
      i18nMeta: "i18n_meta" in body ? body.i18n_meta : undefined,
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

/**
 * DELETE /admin/cms/categories/:slug/draft
 */
export async function DELETE(req: CatSlugReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req)
  try {
    const row = await cms.deleteCategoryDraft(slug)
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
