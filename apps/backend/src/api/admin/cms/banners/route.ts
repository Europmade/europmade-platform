import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { persistMediaReference } from "@europmade/utils"
import { EU_MARKET_CODES } from "@europmade/types"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import {
  asLocalized,
  emptyLocalized,
  parseMarketScope,
  parseMarkets,
  serializeBanner,
} from "../../../cms/serialize"

/**
 * GET /admin/cms/banners
 * POST /admin/cms/banners
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const location =
    typeof req.query?.location === "string" ? req.query.location.trim() : ""
  const filters: Record<string, string> = {}
  if (location) filters.location = location

  const rows = await cms.listCmsBanners(filters, {
    order: { sort_order: "ASC", created_at: "DESC" },
    take: 200,
  })

  res.status(200).json({
    banners: rows.map((r) =>
      serializeBanner(
        r as unknown as Record<string, unknown>,
        requestBackendOrigin(req)
      )
    ),
    markets: EU_MARKET_CODES,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const body = (req.body ?? {}) as Record<string, unknown>

  const destination_url =
    typeof body.destination_url === "string" ? body.destination_url.trim() : ""
  if (!destination_url) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "destination_url is verplicht."
    )
  }

  const row = await cms.createCmsBanners({
    position: Number(body.position ?? 1) === 2 ? 2 : 1,
    location:
      typeof body.location === "string" && body.location
        ? body.location
        : "homepage",
    title: asLocalized(body.title ?? emptyLocalized()),
    subtitle: asLocalized(body.subtitle ?? emptyLocalized()),
    cta_label: asLocalized(body.cta_label ?? emptyLocalized()),
    destination_url,
    link_type:
      typeof body.link_type === "string" ? body.link_type : "category",
    image_url:
      typeof body.image_url === "string"
        ? persistMediaReference(body.image_url)
        : null,
    image_alt: asLocalized(body.image_alt ?? emptyLocalized()),
    background:
      typeof body.background === "string" ? body.background : null,
    presentation:
      body.presentation && typeof body.presentation === "object"
        ? body.presentation
        : null,
    logo_url:
      typeof body.logo_url === "string"
        ? persistMediaReference(body.logo_url)
        : null,
    market_scope: parseMarketScope(body.market_scope),
    markets: parseMarkets(body.markets),
    visible: body.visible !== false,
    sort_order: Number(body.sort_order ?? 0) || 0,
    publish_at: body.publish_at ? new Date(String(body.publish_at)) : null,
    expires_at: body.expires_at ? new Date(String(body.expires_at)) : null,
    published: Boolean(body.published),
    asset_id: typeof body.asset_id === "string" ? body.asset_id : null,
    i18n_meta:
      body.i18n_meta && typeof body.i18n_meta === "object"
        ? body.i18n_meta
        : null,
  })

  res.status(201).json({
    banner: serializeBanner(
      row as unknown as Record<string, unknown>,
      requestBackendOrigin(req)
    ),
  })
}
