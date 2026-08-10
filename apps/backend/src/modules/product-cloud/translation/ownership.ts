/**
 * Pure ownership check used by seller translation routes.
 * Integration uses resolveApprovedSeller + current_owner_seller_id.
 */
export function sellerOwnsProduct(
  productOwnerSellerId: string | null | undefined,
  actorSellerId: string
): boolean {
  return (
    typeof productOwnerSellerId === "string" &&
    productOwnerSellerId.length > 0 &&
    productOwnerSellerId === actorSellerId
  )
}
