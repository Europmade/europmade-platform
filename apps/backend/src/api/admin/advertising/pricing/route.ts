import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"

/**
 * GET /admin/advertising/pricing — list all pricing rules.
 * POST /admin/advertising/pricing — create/upsert a pricing rule.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const rules = await cms.listAdPricings(
    {},
    { order: { placement: "ASC" }, take: 200 }
  )
  res.json({ pricing: rules })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const body = (req.body ?? {}) as Record<string, unknown>

  const placement = typeof body.placement === "string" ? body.placement : ""
  const weekly_price = Number(body.weekly_price)
  if (!placement || !Number.isFinite(weekly_price) || weekly_price < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "placement and valid weekly_price are required."
    )
  }

  const market_code =
    typeof body.market_code === "string" ? body.market_code : "*"
  const target_type =
    typeof body.target_type === "string" ? body.target_type : "*"

  const rule = await cms.createAdPricings({
    placement,
    market_code,
    target_type,
    weekly_price,
    currency_code:
      typeof body.currency_code === "string" ? body.currency_code : "EUR",
    is_active: body.is_active !== false,
  })

  res.status(201).json({ pricing: rule })
}
