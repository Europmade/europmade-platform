import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { persistMediaReference } from "@europmade/utils"
import { z } from "zod"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import { serializePartnerAccess } from "../../../../modules/partner/permissions"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"
import { listManageableBrands } from "../../brands/brand-helpers"
import { planSellerCommunicationPreferences } from "../../../../modules/partner/communication-preferences"
import { appendPreferenceAudits, planPreferenceAudits } from "../../../../modules/engagement/preference-audit"

const StorePatchPartnerBrandingBody = z.object({
  logo_url: z.string().trim().max(800).optional().nullable(),
  banner_url: z.string().trim().max(800).optional().nullable(),
  communication_preferences: z
    .object({
      platform_updates: z.boolean(),
      seller_tips: z.boolean(),
      product_opportunities: z.boolean(),
      seller_campaigns: z.boolean(),
      europmade_news: z.boolean(),
    })
    .optional(),
  locale: z.string().trim().max(12).optional(),
})

type SellerRow = {
  id: string
  customer_id: string
  company_id?: string | null
  is_retailer: boolean
  is_producer_or_brand_owner: boolean
  is_brand_owner?: boolean
  is_producer?: boolean
  is_distributor: boolean
  onboarding_status: string
  logo_url?: string | null
  banner_url?: string | null
  communication_preferences?: Record<string, boolean> | null
  locale?: string | null
  company?: Record<string, unknown> | null
}

function brandingPayload(full: SellerRow) {
  const access = serializePartnerAccess(full)
  return {
    id: full.id,
    customer_id: full.customer_id,
    onboarding_status: full.onboarding_status,
    company: full.company ?? null,
    logo_url: persistMediaReference(full.logo_url) ?? full.logo_url ?? null,
    banner_url: persistMediaReference(full.banner_url) ?? full.banner_url ?? null,
    communication_preferences: full.communication_preferences ?? null,
    locale: full.locale ?? null,
    ...access,
  }
}

/**
 * GET /store/partner/account — Partner-instellingen: bedrijf, rollen, gebruikers, rechten.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const full = (await partner.retrieveSeller(seller.id, {
    relations: ["company"],
  })) as SellerRow

  const access = serializePartnerAccess(full)
  const brands = await listManageableBrands(req.scope, {
    ...seller,
    ...full,
  })

  const users: Array<{
    id: string
    customer_id: string
    email: string | null
    is_current: boolean
    roles: string[]
  }> = []

  if (full.company_id || full.company) {
    const companyId =
      full.company_id ||
      (full.company as { id?: string } | null | undefined)?.id
    if (companyId) {
      const siblings = (await partner.listSellers(
        { company_id: companyId },
        { take: 20 }
      )) as Array<{
        id: string
        customer_id: string
        is_retailer?: boolean
        is_brand_owner?: boolean
        is_producer?: boolean
        is_producer_or_brand_owner?: boolean
        is_distributor?: boolean
      }>
      let customerModule: {
        retrieveCustomer?: (id: string) => Promise<{ email?: string }>
      } | null = null
      try {
        customerModule = req.scope.resolve(Modules.CUSTOMER) as {
          retrieveCustomer?: (id: string) => Promise<{ email?: string }>
        }
      } catch {
        customerModule = null
      }
      for (const row of siblings) {
        let email: string | null = null
        try {
          const customer = await customerModule?.retrieveCustomer?.(
            row.customer_id
          )
          email = customer?.email ?? null
        } catch {
          email = null
        }
        users.push({
          id: row.id,
          customer_id: row.customer_id,
          email,
          is_current: row.id === seller.id,
          roles: serializePartnerAccess(row).roles,
        })
      }
    }
  }

  if (users.length === 0) {
    users.push({
      id: seller.id,
      customer_id: seller.customer_id,
      email: null,
      is_current: true,
      roles: access.roles,
    })
  }

  res.status(200).json({
    partner: brandingPayload(full),
    users,
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      product_count: b.product_count,
      facility_count: b.facility_count,
    })),
  })
}

/**
 * PATCH /store/partner/account — persist this seller's logo/banner only.
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const body = StorePatchPartnerBrandingBody.parse(req.body ?? {})
  if (
    body.logo_url === undefined &&
    body.banner_url === undefined &&
    body.communication_preferences === undefined &&
    body.locale === undefined
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "logo_url, banner_url, communication_preferences of locale is verplicht."
    )
  }
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const patch: {
    id: string
    logo_url?: string | null
    banner_url?: string | null
    communication_preferences?: Record<string, boolean>
    locale?: string | null
  } = { id: seller.id }
  if (body.logo_url !== undefined) {
    patch.logo_url = persistMediaReference(body.logo_url)
  }
  if (body.banner_url !== undefined) {
    patch.banner_url = persistMediaReference(body.banner_url)
  }
  if (body.communication_preferences !== undefined) {
    patch.communication_preferences = planSellerCommunicationPreferences(
      body.communication_preferences
    )
  }
  if (body.locale !== undefined) {
    patch.locale = body.locale.trim().toLowerCase().slice(0, 2) || null
  }
  await partner.updateSellers(patch)
  if (patch.communication_preferences) {
    await appendPreferenceAudits(
      req.scope,
      planPreferenceAudits({
        audience: "sellers",
        entityId: seller.id,
        actorCustomerId: req.auth_context.actor_id,
        before: (seller as { communication_preferences?: unknown }).communication_preferences,
        after: patch.communication_preferences,
      })
    )
  }
  const full = (await partner.retrieveSeller(seller.id, {
    relations: ["company"],
  })) as SellerRow
  res.status(200).json({ partner: brandingPayload(full) })
}
