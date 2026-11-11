import type { MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { CategoryPdError } from "../../../../../modules/cms/category-published-draft"
import { withResolvedCategoryMedia } from "../../../../cms/category-asset-urls"
import { serializeCmsCategoryPd } from "../../../../cms/serialize"
import { requestBackendOrigin } from "../../../../request-backend-origin"
import { slugOf, type CatSlugReq } from "../category-pd-http"
import { requireCategoryProfile } from "../resolve-category-profile"

async function taxonomyProfile(req: CatSlugReq, slug: string) {
  try {
    return { profile: await requireCategoryProfile(req.scope, slug), profile_error: null }
  } catch (err) {
    if (err instanceof CategoryPdError) {
      return { profile: null, profile_error: err.code }
    }
    throw err
  }
}

/**
 * GET /admin/cms/categories/:slug — published + draft metadata.
 * PUT is deprecated (use draft + publish endpoints).
 */
export async function GET(req: CatSlugReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req)
  const row = await cms.getCategoryBySlug(slug)
  const taxonomy = await taxonomyProfile(req, slug)
  if (!row) {
    res.status(200).json({
      category: {
        id: null,
        category_slug: slug,
        i18n_meta: null,
        published: null,
        draft: null,
        stale_base: false,
        ...taxonomy,
      },
    })
    return
  }
  const serialized = {
    ...serializeCmsCategoryPd(row as unknown as Record<string, unknown>),
    ...taxonomy,
  }
  const category = await withResolvedCategoryMedia(
    req.scope,
    serialized,
    requestBackendOrigin(req)
  )
  res.status(200).json({ category })
}

/** @deprecated Use POST/PATCH .../draft and POST .../publish */
export async function PUT(req: CatSlugReq, res: MedusaResponse) {
  res.status(410).json({
    type: "deprecated",
    message:
      "PUT /admin/cms/categories/:slug is deprecated. Use draft CRUD and POST .../publish.",
  })
}
