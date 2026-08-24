import type { MedusaContainer } from "@medusajs/framework/types"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"

type AffiliateRow = {
  id: string
  customer_id: string
  company_id: string | null
  onboarding_status: string
  approved_at: Date | string | null
  channel_url: string | null
  rejection_reason: string | null
  created_at: Date | string
}

export function maskIban(iban: string | null | undefined): string | null {
  const raw = (iban ?? "").replace(/\s+/g, "").toUpperCase()
  if (!raw) return null
  if (raw.length < 8) return "••••"
  return `${raw.slice(0, 4)}••••${raw.slice(-4)}`
}

export async function toAdminAffiliate(
  container: MedusaContainer,
  row: AffiliateRow
) {
  let legal_name: string | null = null
  let iban_masked: string | null = null
  if (row.company_id) {
    try {
      const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
      const company = await partner.retrieveCompany(row.company_id)
      legal_name = company.legal_name?.trim() || null
      iban_masked = maskIban(company.iban)
    } catch {
      // company ontbreekt — velden blijven leeg ("indien beschikbaar")
    }
  }

  return {
    id: row.id,
    customer_id: row.customer_id,
    company_id: row.company_id,
    onboarding_status: row.onboarding_status,
    approved_at: row.approved_at,
    channel_url: row.channel_url,
    rejection_reason: row.rejection_reason,
    created_at: row.created_at,
    legal_name,
    iban_masked,
  }
}
