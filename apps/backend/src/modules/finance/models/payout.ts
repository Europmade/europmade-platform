import { model } from "@medusajs/framework/utils"

/**
 * G.8 Payout — ledger; nooit binnen retourtermijn (ADR-0034).
 */
const Payout = model
  .define("payout", {
    id: model.id({ prefix: "pay" }).primaryKey(),
    recipient_type: model.enum(["Seller", "Affiliate"]),
    seller_id: model.text().nullable(),
    affiliate_id: model.text().nullable(),
    amount: model.bigNumber(),
    period: model.text(),
    status: model
      .enum(["Gepland", "In behandeling", "Voltooid", "Geannuleerd"])
      .default("Gepland"),
    currency: model.text().default("EUR"),
    /** Soft: uitbetaling pas na 14 dagen retourtermijn. */
    eligible_at: model.dateTime(),
    processed_at: model.dateTime().nullable(),
    stripe_transfer_id: model.text().nullable(),
    order_id: model.text().nullable(),
  })
  .indexes([
    { on: ["seller_id"] },
    { on: ["affiliate_id"] },
    { on: ["recipient_type"] },
    { on: ["status"] },
    { on: ["order_id"] },
  ])

export default Payout
