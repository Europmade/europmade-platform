/**
 * Direct Product Cloud catalog edit rights (canonical data).
 *
 * ADR-0046 — Productbeheerder:
 * - At most one explicit central Productbeheerder per PC product.
 * - Kind: seller | brand_owner | none.
 * - current_owner_seller_id alone does NOT grant edit rights.
 * - Offer/Commerce Cloud data stays seller-specific (not gated here).
 */

import type ProductCloudModuleService from "./service"
import type CommerceCloudModuleService from "../commerce-cloud/service"

export const PRODUCT_MANAGER_KINDS = ["seller", "brand_owner", "none"] as const
export type ProductManagerKind = (typeof PRODUCT_MANAGER_KINDS)[number]

export type CatalogEditReason =
  | "product_manager_seller"
  | "product_manager_brand_owner"
  | "denied_no_manager"
  | "denied_not_manager"

export function normalizeProductManagerKind(
  value: string | null | undefined
): ProductManagerKind {
  if (value === "seller" || value === "brand_owner" || value === "none") {
    return value
  }
  return "none"
}

export function evaluateCatalogDirectEditAccess(input: {
  actorSellerId: string
  productManagerKind?: string | null
  productManagerSellerId?: string | null
  /** @deprecated Use productManager* — kept only for gradual call-site migration. */
  currentOwnerSellerId?: string | null
  /** @deprecated Ignored for direct-edit decisions (ADR-0046). */
  offerSellerIds?: string[]
  isBrandOwner: boolean
}): { allowed: boolean; reason: CatalogEditReason } {
  const kind = normalizeProductManagerKind(input.productManagerKind)
  const actor = (input.actorSellerId || "").trim()

  if (kind === "seller") {
    const manager = (input.productManagerSellerId || "").trim()
    if (manager && actor && manager === actor) {
      return { allowed: true, reason: "product_manager_seller" }
    }
    return { allowed: false, reason: "denied_not_manager" }
  }

  if (kind === "brand_owner") {
    if (input.isBrandOwner) {
      return { allowed: true, reason: "product_manager_brand_owner" }
    }
    return { allowed: false, reason: "denied_not_manager" }
  }

  return { allowed: false, reason: "denied_no_manager" }
}

export function isRealBrandId(brandId: string | null | undefined): boolean {
  return typeof brandId === "string" && brandId.startsWith("brand_")
}

export async function resolveOfferSellerIdsForProduct(
  productCloud: ProductCloudModuleService,
  commerce: CommerceCloudModuleService | null,
  productId: string
): Promise<string[]> {
  if (!commerce) return []
  const variants = (await productCloud.listProductVariants(
    { product_id: productId },
    { take: 500 }
  )) as Array<{ id: string }>
  if (!variants.length) return []
  const identifiers = (await productCloud.listIdentifiers(
    { product_variant_id: variants.map((v) => v.id) },
    { take: 2000 }
  )) as Array<{ id: string }>
  if (!identifiers.length) return []
  const offers = (await commerce.listOffers(
    { identifier_id: identifiers.map((i) => i.id) },
    { take: 5000 }
  )) as Array<{ seller_id?: string }>
  return [
    ...new Set(
      offers
        .map((o) => (o.seller_id || "").trim())
        .filter((id) => id.length > 0)
    ),
  ]
}

export function catalogEditDeniedMessage(reason: CatalogEditReason): string {
  if (reason === "denied_no_manager") {
    return "Er is geen Productbeheerder toegewezen voor dit Product Cloud-product. Je kunt een wijzigingsvoorstel indienen of ontbrekende velden aanvullen als je een aanbod hebt."
  }
  return "Je mag de centrale Product Cloud-gegevens van dit product niet wijzigen. Alleen de aangewezen Productbeheerder kan centrale gegevens rechtstreeks bewerken."
}

export function formatProductManagerLabel(kind: ProductManagerKind): string {
  if (kind === "seller") return "Seller"
  if (kind === "brand_owner") return "Merkeigenaar"
  return "Geen beheerder"
}
