import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../../../modules/affiliate"
import {
  AFFILIATE_PREFERENCE_KEYS,
  AFFILIATE_PREFERENCE_LABELS,
  commissionPercentLabel,
  emptyAffiliatePreferences,
  partnerTypeLabel,
  socialChannelLabel,
  type AffiliatePreferences,
  type AffiliateSocialChannel,
} from "../../../modules/affiliate/affiliate-profile"
import type AffiliateModuleService from "../../../modules/affiliate/service"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"

type AffiliateRow = {
  id: string
  customer_id: string
  company_id?: string | null
  onboarding_status: string
  channel_url?: string | null
  partner_type?: string | null
  contact_name?: string | null
  locale?: string | null
  contacted_at?: string | null
  communication_preferences?: unknown
  social_channels?: unknown
  created_at?: string | Date | null
}

function preferencesOf(value: unknown): AffiliatePreferences {
  const next = emptyAffiliatePreferences()
  if (!value || typeof value !== "object" || Array.isArray(value)) return next
  const row = value as Record<string, unknown>
  for (const key of AFFILIATE_PREFERENCE_KEYS) {
    if (typeof row[key] === "boolean") next[key] = row[key] === true
  }
  return next
}

function channelsOf(value: unknown): AffiliateSocialChannel[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const row = item as { channel?: unknown; url?: unknown }
    if (typeof row.channel !== "string" || typeof row.url !== "string" || !row.url.trim()) return []
    return [{ channel: row.channel as AffiliateSocialChannel["channel"], url: row.url.trim() }]
  })
}

export async function presentAffiliateDossier(scope: MedusaContainer, row: AffiliateRow) {
  let organization: string | null = null
  let country: string | null = null
  if (row.company_id) {
    try {
      const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
      const company = await partner.retrieveCompany(row.company_id)
      organization = company.legal_name?.trim() || null
      country = company.country_code?.trim() || null
    } catch {
      organization = null
    }
  }
  let email: string | null = null
  let accountName: string | null = null
  try {
    const customers = scope.resolve(Modules.CUSTOMER) as {
      retrieveCustomer?: (id: string) => Promise<{
        email?: string | null
        first_name?: string | null
        last_name?: string | null
      }>
    }
    const customer = await customers.retrieveCustomer?.(row.customer_id)
    email = customer?.email?.trim() || null
    accountName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ").trim() || null
  } catch {
    email = null
  }
  const affiliate = scope.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  let commission: string | null = null
  let attributionDays: number | null = null
  try {
    const settings = await affiliate.getActiveCommissionSettings()
    commission = commissionPercentLabel(settings.percentage)
    attributionDays = settings.attribution_days
  } catch {
    commission = null
  }
  const links = (await affiliate.listAffiliateLinks({ affiliate_id: row.id }, { take: 20 })) as Array<{
    target_url?: string
    tracking_param?: string
  }>
  const preferences = preferencesOf(row.communication_preferences)
  return {
    id: row.id,
    organization: organization || accountName || "Affiliate partner",
    contact_name: row.contact_name?.trim() || accountName,
    email,
    website: row.channel_url?.trim() || null,
    partner_type: row.partner_type ?? null,
    partner_type_label: partnerTypeLabel(row.partner_type),
    status: row.onboarding_status,
    country,
    locale: row.locale ?? null,
    contacted_at: row.contacted_at ?? null,
    commission,
    attribution_days: attributionDays,
    social_channels: channelsOf(row.social_channels).map((item) => ({
      channel: item.channel,
      label: socialChannelLabel(item.channel),
      url: item.url,
    })),
    preferences: AFFILIATE_PREFERENCE_KEYS.map((key) => ({
      key,
      label: AFFILIATE_PREFERENCE_LABELS[key],
      enabled: preferences[key],
    })),
    links: links
      .filter((link) => link.target_url && link.tracking_param)
      .map((link) => ({
        target: link.target_url as string,
        url: `${link.target_url}${link.target_url!.includes("?") ? "&" : "?"}ref=${link.tracking_param}`,
      })),
    products: links
      .filter((link) => /\/product\//i.test(link.target_url ?? ""))
      .map((link) => ({
        url: `${link.target_url}${String(link.target_url).includes("?") ? "&" : "?"}ref=${link.tracking_param}`,
      })),
    history: [] as Array<{ id: string; title: string }>,
    history_note: "Er is nog geen communicatie opgeslagen. Er wordt niets verzonden.",
  }
}
