import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { executeTrackClick } from "../../../../workflows/affiliate/workflows"
import type { StoreAffiliateClickBodyInput } from "../validators"

/**
 * POST /store/affiliate/clicks — server-side click (vereist consent).
 */
export async function POST(
  req: MedusaRequest<StoreAffiliateClickBodyInput>,
  res: MedusaResponse
) {
  const body = req.validatedBody
  const result = await executeTrackClick(req.scope, {
    tracking_param: body.tracking_param,
    visitor_key: body.visitor_key,
  })
  res.status(201).json({
    click_id: result.click.id,
    attribution_expires_at: result.click.attribution_expires_at,
    attribution_days: result.attribution_days,
  })
}
