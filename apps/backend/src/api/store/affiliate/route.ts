import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../modules/affiliate"
import type AffiliateModuleService from "../../../modules/affiliate/service"
import { executeRegisterAffiliate } from "../../../workflows/affiliate/workflows"
import type { StoreRegisterAffiliateBodyInput } from "./validators"
import { toAdminAffiliate } from "../../admin/affiliates/serialize"
import {
  AFFILIATE_PREFERENCE_KEYS,
  AFFILIATE_PREFERENCE_LABELS,
  planAffiliatePreferences,
} from "../../../modules/affiliate/affiliate-profile"
import { appendPreferenceAudits, planPreferenceAudits } from "../../../modules/engagement/preference-audit"
import { MedusaError } from "@medusajs/framework/utils"

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
    preferences: presentAffiliatePreferences(
      (row as { communication_preferences?: unknown }).communication_preferences
    ),
  })
}

/** PATCH — eigen marketingvoorkeuren. Geen status, commissie of verzending. */
export async function PATCH(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const aff = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const rows = await aff.listAffiliates(
    { customer_id: req.auth_context.actor_id },
    { take: 1 }
  )
  const row = rows[0]
  if (!row) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Affiliatepartner niet gevonden.")
  }
  const body = (req.body ?? {}) as { communication_preferences?: unknown }
  let next
  try {
    next = planAffiliatePreferences(body.communication_preferences)
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      err instanceof Error ? err.message : "Communicatievoorkeuren zijn onvolledig."
    )
  }
  await aff.updateAffiliateProfile(row.id, { communication_preferences: next })
  await appendPreferenceAudits(
    req.scope,
    planPreferenceAudits({
      audience: "affiliates",
      entityId: row.id,
      actorCustomerId: req.auth_context.actor_id,
      before: (row as { communication_preferences?: unknown }).communication_preferences,
      after: next,
    })
  )
  res.status(200).json({ preferences: presentAffiliatePreferences(next) })
}

function presentAffiliatePreferences(stored: unknown) {
  const row =
    stored && typeof stored === "object" && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {}
  return AFFILIATE_PREFERENCE_KEYS.map((key) => ({
    key,
    label: AFFILIATE_PREFERENCE_LABELS[key],
    enabled: row[key] === true,
  }))
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
