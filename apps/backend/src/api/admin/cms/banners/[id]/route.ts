import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { persistMediaReference } from "@europmade/utils"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { requestBackendOrigin } from "../../../../request-backend-origin"
import {
  asLocalized,
  parseMarketScope,
  parseMarkets,
  serializeBanner,
} from "../../../../cms/serialize"

type BannerReq = MedusaRequest & { params: { id: string } }

/**
 * GET/PUT/DELETE /admin/cms/banners/:id
 */
export async function GET(req: BannerReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const row = await cms.retrieveCmsBanner(req.params.id).catch(() => null)
  if (!row) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Banner niet gevonden.")
  }
  res.status(200).json({
    banner: serializeBanner(
      row as unknown as Record<string, unknown>,
      requestBackendOrigin(req)
    ),
  })
}

export async function PUT(req: BannerReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const existing = await cms.retrieveCmsBanner(req.params.id).catch(() => null)
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Banner niet gevonden.")
  }
  const body = (req.body ?? {}) as Record<string, unknown>
  const patch: Record<string, unknown> = { id: req.params.id }

  if (body.position != null) patch.position = Number(body.position) === 2 ? 2 : 1
  if (typeof body.location === "string") patch.location = body.location
  if (body.title != null) patch.title = asLocalized(body.title)
  if (body.subtitle != null) patch.subtitle = asLocalized(body.subtitle)
  if (body.cta_label != null) patch.cta_label = asLocalized(body.cta_label)
  if (typeof body.destination_url === "string") {
    patch.destination_url = body.destination_url.trim()
  }
  if (typeof body.link_type === "string") patch.link_type = body.link_type
  if (body.image_url !== undefined) {
    patch.image_url =
      typeof body.image_url === "string"
        ? persistMediaReference(body.image_url)
        : null
  }
  if (body.image_alt != null) patch.image_alt = asLocalized(body.image_alt)
  if (body.background !== undefined) {
    patch.background =
      typeof body.background === "string" ? body.background : null
  }
  if (body.presentation !== undefined) {
    patch.presentation =
      body.presentation && typeof body.presentation === "object"
        ? body.presentation
        : null
  }
  if (body.logo_url !== undefined) {
    patch.logo_url =
      typeof body.logo_url === "string"
        ? persistMediaReference(body.logo_url)
        : null
  }
  if (body.market_scope != null) {
    patch.market_scope = parseMarketScope(body.market_scope)
  }
  if (body.markets != null) patch.markets = parseMarkets(body.markets)
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
  if (body.published != null) patch.published = Boolean(body.published)
  if (body.asset_id !== undefined) {
    patch.asset_id = typeof body.asset_id === "string" ? body.asset_id : null
  }
  if (body.i18n_meta !== undefined) {
    patch.i18n_meta =
      body.i18n_meta && typeof body.i18n_meta === "object"
        ? body.i18n_meta
        : null
  }

  const row = await cms.updateCmsBanners(patch)
  res.status(200).json({
    banner: serializeBanner(
      row as unknown as Record<string, unknown>,
      requestBackendOrigin(req)
    ),
  })
}

export async function DELETE(req: BannerReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const existing = await cms.retrieveCmsBanner(req.params.id).catch(() => null)
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Banner niet gevonden.")
  }
  await cms.deleteCmsBanners(req.params.id)
  res.status(200).json({ id: req.params.id, deleted: true })
}
