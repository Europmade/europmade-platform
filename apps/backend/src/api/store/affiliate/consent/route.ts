import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { executeRecordConsent } from "../../../../workflows/affiliate/workflows"
import type { StoreAffiliateConsentBodyInput } from "../validators"

/**
 * POST /store/affiliate/consent — ADR-0029 ConsentRecord.
 */
export async function POST(
  req: MedusaRequest<StoreAffiliateConsentBodyInput>,
  res: MedusaResponse
) {
  const body = req.validatedBody
  const result = await executeRecordConsent(req.scope, {
    visitor_key: body.visitor_key,
    consent_given: body.consent_given,
  })
  res.status(201).json({
    consent_id: result.consent.id,
    consent_given: result.consent.consent_given,
  })
}
