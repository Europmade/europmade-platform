import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { defaultCanonicalForSlug, persistMediaReference } from "@europmade/utils"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { requestBackendOrigin } from "../../../request-backend-origin"
import {
  asLocalized,
  emptyLocalized,
  persistCmsPageDocument,
  serializePage,
} from "../../../cms/serialize"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const rows = await cms.listCmsPages(
    {},
    { order: { sort_order: "ASC", created_at: "DESC" }, take: 200 }
  )
  res.status(200).json({
    pages: rows.map((r) =>
      serializePage(
        r as unknown as Record<string, unknown>,
        requestBackendOrigin(req)
      )
    ),
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const body = (req.body ?? {}) as Record<string, unknown>
  const slug =
    typeof body.slug === "string"
      ? body.slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-/]/g, "-")
      : ""
  if (!slug) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "slug is verplicht.")
  }

  const row = await cms.createCmsPages({
    slug,
    title: asLocalized(body.title ?? emptyLocalized()),
    body: asLocalized(body.body ?? emptyLocalized()),
    seo_title: body.seo_title != null ? asLocalized(body.seo_title) : null,
    seo_description:
      body.seo_description != null ? asLocalized(body.seo_description) : null,
    seo_canonical:
      typeof body.seo_canonical === "string" && body.seo_canonical.trim()
        ? body.seo_canonical.trim()
        : defaultCanonicalForSlug(slug),
    published: Boolean(body.published),
    visible: body.visible !== false,
    sort_order: Number(body.sort_order ?? 0) || 0,
    publish_at: body.publish_at ? new Date(String(body.publish_at)) : null,
    expires_at: body.expires_at ? new Date(String(body.expires_at)) : null,
    cover_url:
      typeof body.cover_url === "string"
        ? persistMediaReference(body.cover_url)
        : null,
    document:
      body.document && typeof body.document === "object"
        ? persistCmsPageDocument(body.document)
        : {},
    i18n_meta:
      body.i18n_meta && typeof body.i18n_meta === "object"
        ? body.i18n_meta
        : null,
  })

  res.status(201).json({
    page: serializePage(
      row as unknown as Record<string, unknown>,
      requestBackendOrigin(req)
    ),
  })
}
