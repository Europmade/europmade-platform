/**
 * A market offer stores its own standard and promo price.
 * Editing one region must leave every other region's prices untouched.
 */
export function basePriceForThisOffer(input: {
  base_price?: number | null
  regular_customer_price?: number | null
  existing_base_price: number
}): number {
  if (input.base_price != null && Number.isFinite(Number(input.base_price))) {
    return Number(input.base_price)
  }
  if (
    input.regular_customer_price != null &&
    Number.isFinite(Number(input.regular_customer_price))
  ) {
    return Number(input.regular_customer_price)
  }
  return input.existing_base_price
}

export function pricesAfterMarketEdit<
  T extends { region: string; base: number; promo: number | null },
>(markets: T[], edit: { region: string; base: number; promo: number | null }): T[] {
  return markets.map((row) =>
    row.region === edit.region
      ? { ...row, base: edit.base, promo: edit.promo }
      : row
  )
}
