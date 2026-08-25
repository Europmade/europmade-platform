import { model } from "@medusajs/framework/utils"

/**
 * G3 — Periodieke seller-settlement (snapshot). Geen tweede ledger:
 * bedragen zijn aggregaties van orders, returns, commissions en ads.
 * payout_id blijft leeg tot G5.
 */
const SellerSettlement = model
  .define("seller_settlement", {
    id: model.id({ prefix: "sset" }).primaryKey(),
    seller_id: model.text(),
    period_start: model.dateTime(),
    period_end: model.dateTime(),
    status: model.enum(["open", "closed"]).default("closed"),
    closed_at: model.dateTime().nullable(),
    invoice_id: model.text().nullable(),
    payout_id: model.text().nullable(),
    currency: model.text().default("EUR"),
    gross_sales: model.bigNumber().default(0),
    refunds: model.bigNumber().default(0),
    net_sales: model.bigNumber().default(0),
    platform_commission: model.bigNumber().default(0),
    advertising_amount: model.bigNumber().default(0),
    banner_amount: model.bigNumber().default(0),
    other_services_amount: model.bigNumber().default(0),
    credits_amount: model.bigNumber().default(0),
    invoice_total: model.bigNumber().default(0),
    amount_before_payout: model.bigNumber().default(0),
    net_settlement: model.bigNumber().default(0),
    snapshot: model.json().nullable(),
  })
  .indexes([
    { on: ["seller_id"] },
    { on: ["status"] },
    { on: ["invoice_id"] },
    { on: ["seller_id", "period_start", "period_end"], unique: true },
  ])

export default SellerSettlement
