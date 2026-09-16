/**
 * Seller product list navigation: catalog owner → Product Manager,
 * non-owner with own offer → Commerce Cloud offer form.
 * Does not change Product Cloud ownership checks.
 */

export type SellerListProductRef = {
  id: string
  title?: string | null
  catalog_owner?: boolean
  identifier_id?: string | null
  offer?: { identifier_id?: string | null } | null
}

export function isSellerCatalogOwner(product: SellerListProductRef): boolean {
  return product.catalog_owner !== false
}

export function sellerListIdentifierId(
  product: SellerListProductRef
): string | null {
  return product.identifier_id || product.offer?.identifier_id || null
}

export function sellerOfferPath(identifierId: string): string {
  return `/seller/products/offer?identifier_id=${encodeURIComponent(identifierId)}`
}

/** Row click / "Beheer product": owner → manager, non-owner → offer. */
export function sellerProductHref(product: SellerListProductRef): string {
  if (!isSellerCatalogOwner(product)) {
    const identifierId = sellerListIdentifierId(product)
    if (identifierId) return sellerOfferPath(identifierId)
    return "/seller/products"
  }
  return `/seller/products/${product.id}`
}

/** "Verkoopinformatie": owner → manager offer tab, non-owner → offer form. */
export function sellerOfferHref(product: SellerListProductRef): string {
  if (!isSellerCatalogOwner(product)) {
    const identifierId = sellerListIdentifierId(product)
    if (identifierId) return sellerOfferPath(identifierId)
    return "/seller/products"
  }
  return `/seller/products/${product.id}?tab=offer`
}

export function sellerCatalogInformationHref(
  product: SellerListProductRef
): string | null {
  if (!isSellerCatalogOwner(product)) return null
  return `/seller/products/${product.id}?step=information`
}

export function sellerCatalogTabHref(
  product: SellerListProductRef,
  tab: string
): string | null {
  if (!isSellerCatalogOwner(product)) return null
  return `/seller/products/${product.id}?tab=${encodeURIComponent(tab)}`
}

export function canEditCatalogInformation(
  product: SellerListProductRef,
  actions?: Record<string, boolean>
): boolean {
  return (
    isSellerCatalogOwner(product) && actions?.edit_information !== false
  )
}

export function isManagerProductPath(href: string): boolean {
  return (
    href.startsWith("/seller/products/") &&
    !href.startsWith("/seller/products/offer") &&
    !href.startsWith("/seller/products/add") &&
    !href.startsWith("/seller/products/new") &&
    !href.startsWith("/seller/products/import")
  )
}
