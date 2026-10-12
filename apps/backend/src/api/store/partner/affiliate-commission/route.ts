import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { EUROPMADE_AFFILIATE_CONTRIBUTION_PERCENT } from "@europmade/utils"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import { normalizeSellerCommissionSettings } from "../../../../modules/affiliate/offer-commission"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"

const CommissionBody = z.object({
  default_commission_percent: z.number().min(0).max(100),
  product_commissions: z
    .array(
      z.object({
        product_id: z.string().trim().min(1).max(128),
        product_title: z.string().trim().max(300).optional().default(""),
        commission_percent: z.number().min(0).max(100),
      })
    )
    .max(200),
})

function present(raw: unknown) {
  const settings = normalizeSellerCommissionSettings(raw)
  return {
    ...settings,
    europmade_contribution_percent: EUROPMADE_AFFILIATE_CONTRIBUTION_PERCENT,
  }
}

/** GET /store/partner/affiliate-commission — instellingen van deze seller. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const seller = await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const row = await partner.retrieveSeller(seller.id)
  res.status(200).json({
    settings: present(
      (row as { affiliate_commission_settings?: unknown }).affiliate_commission_settings
    ),
  })
}

/** PUT /store/partner/affiliate-commission — zelfde bron als de affiliatecatalogus. */
export async function PUT(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const seller = await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  const parsed = CommissionBody.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Standaardcommissie en productcommissies zijn ongeldig."
    )
  }
  const stored = {
    default_commission_percent: parsed.data.default_commission_percent,
    product_commissions: parsed.data.product_commissions.map((row) => ({
      product_id: row.product_id,
      product_title: row.product_title,
      commission_percent: row.commission_percent,
    })),
  }
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  await partner.updateSellers({
    id: seller.id,
    affiliate_commission_settings: stored,
  })
  res.status(200).json({ settings: present(stored) })
}
