import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { EU_MARKET_CODES } from "@europmade/types"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import {
  asLocalized,
  emptyLocalized,
  serializeHomepage,
} from "../../../cms/serialize"

async function getOrNull(cms: CmsModuleService) {
  const rows = await cms.listCmsHomepages(
    { document_key: "default" },
    { take: 1 }
  )
  return rows[0] ?? null
}

/**
 * GET /admin/cms/homepage
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const row = await getOrNull(cms)
  res.status(200).json({
    homepage: row
      ? serializeHomepage(
          row as unknown as Record<string, unknown>,
          requestBackendOrigin(req)
        )
      : null,
    markets: EU_MARKET_CODES,
  })
}

/**
 * PUT /admin/cms/homepage — upsert singleton + optional publish.
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const body = (req.body ?? {}) as Record<string, unknown>
  if (!body.document || typeof body.document !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "document is verplicht."
    )
  }

  const payload = {
    document_key: "default",
    document: body.document,
    seo_title: body.seo_title != null ? asLocalized(body.seo_title) : emptyLocalized(),
    seo_description:
      body.seo_description != null
        ? asLocalized(body.seo_description)
        : emptyLocalized(),
    seo_canonical:
      typeof body.seo_canonical === "string" ? body.seo_canonical : "/",
    og_title: body.og_title != null ? asLocalized(body.og_title) : emptyLocalized(),
    og_description:
      body.og_description != null
        ? asLocalized(body.og_description)
        : emptyLocalized(),
    published: Boolean(body.published),
  }

  const existing = await getOrNull(cms)
  const row = existing
    ? await cms.updateCmsHomepages({ id: existing.id, ...payload })
    : await cms.createCmsHomepages(payload)

  res.status(200).json({
    homepage: serializeHomepage(
      row as unknown as Record<string, unknown>,
      requestBackendOrigin(req)
    ),
  })
}
