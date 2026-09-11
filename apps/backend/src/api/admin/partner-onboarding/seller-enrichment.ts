import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ONBOARDING_STATUS } from "../../../workflows/partner-onboarding"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import type VerificationModuleService from "../../../modules/verification/service"

export type SellerContact = {
  email: string | null
  first_name: string | null
  last_name: string | null
}

/** Seller/business verification — onboarding approval (Laag 1). */
export function sellerVerificationStatusLabel(onboardingStatus: string): string {
  switch (onboardingStatus) {
    case ONBOARDING_STATUS.GOEDGEKEURD:
      return "Goedgekeurd"
    case ONBOARDING_STATUS.AFGEKEURD:
      return "Afgewezen"
    case ONBOARDING_STATUS.AANVULLENDE_INFORMATIE_VEREIST:
      return "Informatie nodig"
    case ONBOARDING_STATUS.IN_BEOORDELING:
    case ONBOARDING_STATUS.INGEDIEND:
      return "In beoordeling"
    default:
      return onboardingStatus
  }
}

/** Made in Europe Laag 1 (bedrijf) — gebundeld in onboarding-goedkeuring. */
export function sellerMadeInEuropeStatusLabel(
  onboardingStatus: string,
  hasProductionProof: boolean
): string {
  if (onboardingStatus === ONBOARDING_STATUS.GOEDGEKEURD) {
    return "Geverifieerd (Laag 1)"
  }
  if (onboardingStatus === ONBOARDING_STATUS.AFGEKEURD) {
    return "Afgewezen"
  }
  if (onboardingStatus === ONBOARDING_STATUS.AANVULLENDE_INFORMATIE_VEREIST) {
    return "Informatie nodig"
  }
  if (
    onboardingStatus === ONBOARDING_STATUS.IN_BEOORDELING ||
    onboardingStatus === ONBOARDING_STATUS.INGEDIEND
  ) {
    return hasProductionProof ? "In beoordeling" : "Bewijs ontbreekt"
  }
  return "—"
}

export async function resolveSellerContact(
  container: MedusaContainer,
  customerId: string
): Promise<SellerContact> {
  try {
    const customers = container.resolve(Modules.CUSTOMER) as {
      retrieveCustomer?: (id: string) => Promise<{
        email?: string
        first_name?: string
        last_name?: string
      }>
    }
    const customer = await customers.retrieveCustomer?.(customerId)
    return {
      email: customer?.email?.trim() || null,
      first_name: customer?.first_name?.trim() || null,
      last_name: customer?.last_name?.trim() || null,
    }
  } catch {
    return { email: null, first_name: null, last_name: null }
  }
}

export function contactPersonLabel(contact: SellerContact): string | null {
  const parts = [contact.first_name, contact.last_name].filter(Boolean)
  if (parts.length) return parts.join(" ")
  return contact.email
}

export async function countProductsBySeller(
  productCloud: ProductCloudModuleService
): Promise<Map<string, number>> {
  const products = await productCloud.listProducts({})
  const counts = new Map<string, number>()
  for (const p of products) {
    const sid = p.current_owner_seller_id
    if (!sid) continue
    counts.set(sid, (counts.get(sid) ?? 0) + 1)
  }
  return counts
}

export async function loadSellerProductSummary(
  productCloud: ProductCloudModuleService,
  verification: VerificationModuleService | null,
  sellerId: string
) {
  const products = await productCloud.listProducts({
    current_owner_seller_id: sellerId,
  })

  let pendingApproval = 0
  let approved = 0
  let rejected = 0

  for (const product of products) {
    const versions = await productCloud.listProductVersions({
      product_id: product.id,
    })
    const working =
      versions.find((v: { publication_status: string }) =>
        ["Concept", "In review", "Goedgekeurd", "Gepubliceerd"].includes(
          v.publication_status
        )
      ) || versions[0]
    const ps = working?.publication_status
    if (ps === "In review") pendingApproval++
    else if (ps === "Goedgekeurd" || ps === "Gepubliceerd") approved++
    else if (ps === "Gearchiveerd" || ps === "Verwijderd") rejected++
  }

  let pendingEvidence = 0
  if (verification) {
    for (const product of products) {
      const rows = await verification.listProductOriginEvidences({
        product_id: product.id,
      })
      pendingEvidence += rows.filter((r: { verification_status?: string }) => {
        const vs = String(r.verification_status || "")
        return vs === "pending" || vs === "pending_review"
      }).length
    }
  }

  return {
    total: products.length,
    pending_approval: pendingApproval,
    approved,
    rejected,
    pending_evidence: pendingEvidence,
  }
}

export async function buildCustomerEmailIndex(
  container: MedusaContainer,
  customerIds: string[]
): Promise<Map<string, string>> {
  const index = new Map<string, string>()
  if (!customerIds.length) return index
  try {
    const customers = container.resolve(Modules.CUSTOMER) as {
      retrieveCustomer?: (id: string) => Promise<{ email?: string }>
    }
    for (const id of customerIds) {
      try {
        const c = await customers.retrieveCustomer?.(id)
        if (c?.email) index.set(id, c.email.toLowerCase())
      } catch {
        /* skip */
      }
    }
  } catch {
    /* no customer module */
  }
  return index
}
