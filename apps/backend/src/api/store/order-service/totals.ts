import type { RevalidatedLine } from "../../../../workflows/order-service/place-order"

export type CheckoutTotals = {
  subtotal: number
  shipping_total: number
  vat_amount: number
  total: number
  delivery_country: string
  vat_rate: number
  vat_tooltip: string
}

/** Server-side BTW-totalen voor weergave (checkout/spec §13) — geen UI-berekening. */
export function computeCheckoutTotals(
  lines: RevalidatedLine[],
  deliveryCountry = "NL"
): CheckoutTotals {
  let subtotal = 0
  let shipping_total = 0
  let vat_amount = 0
  const rates = new Set<number>()

  const bySeller = new Map<string, RevalidatedLine[]>()
  for (const line of lines) {
    const bucket = bySeller.get(line.seller_id) ?? []
    bucket.push(line)
    bySeller.set(line.seller_id, bucket)
  }

  for (const sellerLines of bySeller.values()) {
    let sellerShipping = 0
    for (const line of sellerLines) {
      const lineGoods = line.unit_price * line.quantity
      subtotal += lineGoods
      sellerShipping = Math.max(sellerShipping, line.shipping_cost)
      rates.add(line.vat_rate)
      const lineTotal = (line.unit_price + 0) * line.quantity
      // BTW over goederen; verzending apart hieronder
      vat_amount += lineGoods * (line.vat_rate / (1 + line.vat_rate))
    }
    shipping_total += sellerShipping
    // Eenvoudige OSS-weergave: verzending belast tegen max rate in group
    const maxRate = Math.max(...sellerLines.map((l) => l.vat_rate))
    vat_amount += sellerShipping * (maxRate / (1 + maxRate))
  }

  // Prices in Commerce Cloud are treated as incl. VAT for Buy Box totals;
  // extract VAT portion for display (OSS-conform weergave).
  const total = subtotal + shipping_total
  const primaryRate = lines[0]?.vat_rate ?? 0.21
  const ratePct = Math.round(primaryRate * 100)
  const vat_tooltip =
    rates.size > 1
      ? `BTW berekend over goederen en verzending (land ${deliveryCountry}). Meerdere tarieven in deze bestelling.`
      : `BTW ${ratePct}% over goederen en verzending (land ${deliveryCountry}).`

  return {
    subtotal: round2(subtotal),
    shipping_total: round2(shipping_total),
    vat_amount: round2(vat_amount),
    total: round2(total),
    delivery_country: deliveryCountry,
    vat_rate: primaryRate,
    vat_tooltip,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
