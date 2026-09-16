import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../modules/affiliate"
import type AffiliateModuleService from "../../../modules/affiliate/service"
import { toAdminAffiliate } from "./serialize"

const ONBOARDING_STATUSES = [
  "Ingediend",
  "In beoordeling",
  "Goedgekeurd",
  "Afgekeurd",
] as const

type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number]

function parseOnboardingStatus(value: unknown): OnboardingStatus | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return (ONBOARDING_STATUSES as readonly string[]).includes(trimmed)
    ? (trimmed as OnboardingStatus)
    : null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const aff = req.scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const status = parseOnboardingStatus(req.query?.status)
  const rows = await aff.listAffiliates(
    status ? { onboarding_status: status } : {},
    { order: { created_at: "DESC" }, take: 100 }
  )
  const affiliates = await Promise.all(
    rows.map((row) => toAdminAffiliate(req.scope, row))
  )
  res.status(200).json({ affiliates })
}
