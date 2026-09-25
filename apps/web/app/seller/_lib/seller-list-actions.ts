/**
 * Seller product list navigation: shared Product Manager page for central data;
 * Commerce Cloud offer form for own commercial fields when not Productbeheerder.
 * Does not change Product Cloud ownership / write checks.
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

/** Row click / "Beheer product": always the shared Product Manager page. */
export function sellerProductHref(product: SellerListProductRef): string {
  return `/seller/products/${product.id}`
}

/** "Verkoopinformatie" / "Eigen aanbod": owner → manager offer tab, non-owner → offer form. */
export function sellerOfferHref(product: SellerListProductRef): string {
  if (!isSellerCatalogOwner(product)) {
    const identifierId = sellerListIdentifierId(product)
    if (identifierId) return sellerOfferPath(identifierId)
    return `/seller/products/${product.id}?step=offer`
  }
  return `/seller/products/${product.id}?tab=offer`
}

/**
 * Central Product Cloud info: shared manager page for all sellers.
 * Edit vs propose is decided inside the page via catalog_owner.
 */
export function sellerCatalogInformationHref(
  product: SellerListProductRef
): string | null {
  return `/seller/products/${product.id}?step=information`
}

export function sellerCatalogViewHref(product: SellerListProductRef): string {
  return `/seller/products/${product.id}?step=information`
}

export function sellerCatalogTabHref(
  product: SellerListProductRef,
  tab: string
): string | null {
  if (tab === "offer" && !isSellerCatalogOwner(product)) {
    const identifierId = sellerListIdentifierId(product)
    if (identifierId) return sellerOfferPath(identifierId)
  }
  const step = tab === "history" ? null : tab
  if (tab === "history") {
    return `/seller/products/${product.id}?tab=history`
  }
  return `/seller/products/${product.id}?step=${encodeURIComponent(step || "information")}`
}

export function canEditCatalogInformation(
  product: SellerListProductRef,
  actions?: Record<string, boolean>
): boolean {
  return (
    isSellerCatalogOwner(product) && actions?.edit_information !== false
  )
}

export function canProposeCatalogChange(
  product: SellerListProductRef
): boolean {
  return !isSellerCatalogOwner(product)
}

export function isManagerProductPath(href: string): boolean {
  return (
    href.startsWith("/seller/products/") &&
    !href.startsWith("/seller/products/offer") &&
    !href.startsWith("/seller/products/add") &&
    !href.startsWith("/seller/products/new") &&
    !href.startsWith("/seller/products/import") &&
    !href.startsWith("/seller/products/catalog")
  )
}
