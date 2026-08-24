import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../modules/affiliate"
import type AffiliateModuleService from "../../../modules/affiliate/service"
import { executeRegisterAffiliate } from "../../../workflows/affiliate/workflows"
import type { StoreRegisterAffiliateBodyInput } from "./validators"
import { toAdminAffiliate } from "../../admin/affiliates/serialize"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const aff = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const rows = await aff.listAffiliates(
    { customer_id: req.auth_context.actor_id },
    { take: 1 }
  )
  const row = rows[0]
  if (!row) {
    res.status(200).json({ affiliate: null })
    return
  }
  res.status(200).json({
    affiliate: await toAdminAffiliate(req.scope, row),
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<StoreRegisterAffiliateBodyInput>,
  res: MedusaResponse
) {
  const body = req.validatedBody
  const result = await executeRegisterAffiliate(req.scope, {
    customer_id: req.auth_context.actor_id,
    channel_url: body.channel_url,
    legal_name: body.legal_name,
    iban: body.iban,
    country_code: body.country_code,
    chamber_of_commerce_number: body.chamber_of_commerce_number,
    vat_number: body.vat_number,
  })
  res.status(201).json({ affiliate: result.affiliate })
}
