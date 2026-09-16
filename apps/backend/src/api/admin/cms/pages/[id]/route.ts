import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { persistMediaReference } from "@europmade/utils"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { requestBackendOrigin } from "../../../../request-backend-origin"
import {
  asLocalized,
  persistCmsPageDocument,
  serializePage,
} from "../../../../cms/serialize"

type PageReq = MedusaRequest & { params: { id: string } }

export async function GET(req: PageReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const row = await cms.retrieveCmsPage(req.params.id).catch(() => null)
  if (!row) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Pagina niet gevonden.")
  }
  res.status(200).json({
    page: serializePage(
      row as unknown as Record<string, unknown>,
      requestBackendOrigin(req)
    ),
  })
}

export async function PUT(req: PageReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const existing = await cms.retrieveCmsPage(req.params.id).catch(() => null)
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Pagina niet gevonden.")
  }
  const body = (req.body ?? {}) as Record<string, unknown>
  const patch: Record<string, unknown> = { id: req.params.id }
  if (typeof body.slug === "string" && body.slug.trim()) {
    patch.slug = body.slug.trim().toLowerCase()
  }
  if (body.title != null) patch.title = asLocalized(body.title)
  if (body.body != null) patch.body = asLocalized(body.body)
  if (body.seo_title !== undefined) {
    patch.seo_title =
      body.seo_title != null ? asLocalized(body.seo_title) : null
  }
  if (body.seo_description !== undefined) {
    patch.seo_description =
      body.seo_description != null ? asLocalized(body.seo_description) : null
  }
  if (body.seo_canonical !== undefined) {
    patch.seo_canonical =
      typeof body.seo_canonical === "string" ? body.seo_canonical : null
  }
  if (body.published != null) patch.published = Boolean(body.published)
  if (body.visible != null) patch.visible = Boolean(body.visible)
  if (body.sort_order != null) patch.sort_order = Number(body.sort_order) || 0
  if (body.publish_at !== undefined) {
    patch.publish_at = body.publish_at
      ? new Date(String(body.publish_at))
      : null
  }
  if (body.expires_at !== undefined) {
    patch.expires_at = body.expires_at
      ? new Date(String(body.expires_at))
      : null
  }
  if (body.cover_url !== undefined) {
    patch.cover_url =
      typeof body.cover_url === "string"
        ? persistMediaReference(body.cover_url)
        : null
  }
  if (body.document !== undefined) {
    patch.document =
      body.document && typeof body.document === "object"
        ? persistCmsPageDocument(body.document)
        : {}
  }
  if (body.i18n_meta !== undefined) {
    patch.i18n_meta =
      body.i18n_meta && typeof body.i18n_meta === "object"
        ? body.i18n_meta
        : null
  }

  const row = await cms.updateCmsPages(patch)
  res.status(200).json({
    page: serializePage(
      row as unknown as Record<string, unknown>,
      requestBackendOrigin(req)
    ),
  })
}

export async function DELETE(req: PageReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const existing = await cms.retrieveCmsPage(req.params.id).catch(() => null)
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Pagina niet gevonden.")
  }
  await cms.deleteCmsPages(req.params.id)
  res.status(200).json({ id: req.params.id, deleted: true })
}
