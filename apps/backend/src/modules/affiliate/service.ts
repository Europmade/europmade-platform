import { createHash, randomBytes } from "node:crypto"
import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import {
  planAffiliateLocale,
  planAffiliatePreferences,
  planContactedAt,
  planPartnerType,
  planSocialChannels,
} from "./affiliate-profile"
import Affiliate from "./models/affiliate"
import AffiliateLink from "./models/affiliate-link"
import Coupon from "./models/coupon"
import ConsentRecord from "./models/consent-record"
import Click from "./models/click"
import Conversion from "./models/conversion"
import AffiliateCommissionSetting from "./models/commission-setting"

const DEFAULT_PERCENTAGE = 0.05
const DEFAULT_ATTRIBUTION_DAYS = 30

function visitorPepper(): string {
  return process.env.AFFILIATE_VISITOR_PEPPER?.trim() || "europmade-dev-aff-pepper"
}

export function hashVisitorKey(visitorKey: string): string {
  return createHash("sha256")
    .update(`${visitorKey.trim()}:${visitorPepper()}`)
    .digest("hex")
}

/**
 * Affiliate-module — Blueprint G.1–G.5, G.10 (ADR-0029/0030).
 */
class AffiliateModuleService extends MedusaService({
  Affiliate,
  AffiliateLink,
  Coupon,
  ConsentRecord,
  Click,
  Conversion,
  AffiliateCommissionSetting,
}) {
  async getActiveCommissionSettings(): Promise<{
    percentage: number
    attribution_days: number
  }> {
    const rows = await this.listAffiliateCommissionSettings(
      { is_active: true },
      { take: 1, order: { created_at: "DESC" } }
    )
    if (rows[0]) {
      return {
        percentage: Number(rows[0].percentage),
        attribution_days: Number(rows[0].attribution_days),
      }
    }
    const created = await this.createAffiliateCommissionSettings({
      percentage: DEFAULT_PERCENTAGE,
      attribution_days: DEFAULT_ATTRIBUTION_DAYS,
      is_active: true,
    })
    return {
      percentage: Number(created.percentage),
      attribution_days: Number(created.attribution_days),
    }
  }

  async requireApprovedAffiliate(customerId: string) {
    const rows = await this.listAffiliates(
      { customer_id: customerId },
      { take: 1 }
    )
    const aff = rows[0]
    if (!aff) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Geen affiliate-rol voor deze gebruiker."
      )
    }
    if (aff.onboarding_status !== "Goedgekeurd") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Affiliate is nog niet goedgekeurd."
      )
    }
    return aff
  }

  async generateTrackingParam(): Promise<string> {
    return `aff_${randomBytes(8).toString("hex")}`
  }

  async generateCouponCode(): Promise<string> {
    return `EM${randomBytes(4).toString("hex").toUpperCase()}`
  }

  async updateAffiliateProfile(
    id: string,
    input: {
      partner_type?: unknown
      contact_name?: unknown
      locale?: unknown
      contacted_at?: unknown
      communication_preferences?: unknown
      social_channels?: unknown
    }
  ) {
    await this.retrieveAffiliate(id)
    const patch: Record<string, unknown> = { id }
    try {
      if ("partner_type" in input) patch.partner_type = planPartnerType(input.partner_type)
      if ("contact_name" in input) {
        const name =
          typeof input.contact_name === "string" ? input.contact_name.trim().slice(0, 120) : ""
        patch.contact_name = name || null
      }
      if ("locale" in input) patch.locale = planAffiliateLocale(input.locale)
      if ("contacted_at" in input) patch.contacted_at = planContactedAt(input.contacted_at)
      if ("communication_preferences" in input) {
        patch.communication_preferences = planAffiliatePreferences(input.communication_preferences)
      }
      if ("social_channels" in input) patch.social_channels = planSocialChannels(input.social_channels)
    } catch (err) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        err instanceof Error ? err.message : "Het dossier kon niet worden opgeslagen."
      )
    }
    if (Object.keys(patch).length === 1) return this.retrieveAffiliate(id)
    return this.updateAffiliates(patch)
  }
}

export default AffiliateModuleService
