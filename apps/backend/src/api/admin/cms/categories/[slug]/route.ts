import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { serializeCmsCategory } from "../../../../cms/serialize"

type CatReq = MedusaRequest & { params: { slug: string } }

function slugOf(req: CatReq) {
  return decodeURIComponent(req.params.slug ?? "").trim().toLowerCase()
}

export async function GET(req: CatReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req)
  const rows = await cms.listCmsCategories({ category_slug: slug }, { take: 1 })
  const row = rows[0] ?? null
  res.status(200).json({
    category: row
      ? serializeCmsCategory(row as unknown as Record<string, unknown>)
      : {
          id: null,
          category_slug: slug,
          document: {},
          published: false,
          i18n_meta: null,
        },
  })
}

export async function PUT(req: CatReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req)
  const body = (req.body ?? {}) as Record<string, unknown>
  const payload = {
    category_slug: slug,
    document:
      body.document && typeof body.document === "object" ? body.document : {},
    published: Boolean(body.published),
    i18n_meta:
      body.i18n_meta && typeof body.i18n_meta === "object"
        ? body.i18n_meta
        : null,
  }
  const existing = (
    await cms.listCmsCategories({ category_slug: slug }, { take: 1 })
  )[0]
  const row = existing
    ? await cms.updateCmsCategories({ id: existing.id, ...payload })
    : await cms.createCmsCategories(payload)
  res.status(200).json({
    category: serializeCmsCategory(row as unknown as Record<string, unknown>),
  })
}
