import { model } from "@medusajs/framework/utils"

/**
 * P2.17 — Individual line item on a seller invoice.
 * Types: "commission", "advertising", "service", "credit", "debit".
 */
const SellerInvoiceLine = model
  .define("seller_invoice_line", {
    id: model.id({ prefix: "sinvl" }).primaryKey(),
    invoice_id: model.text(),
    line_type: model.text(),
    description: model.text(),
    /** Source reference for traceability (order_id, campaign_id, etc.) */
    source_ref: model.text().nullable(),
    source_type: model.text().nullable(),
    quantity: model.float().default(1),
    unit_price: model.bigNumber().default(0),
    commission_pct: model.float().nullable(),
    net_amount: model.bigNumber().default(0),
    vat_rate: model.float().default(0),
    vat_amount: model.bigNumber().default(0),
    gross_amount: model.bigNumber().default(0),
  })
  .indexes([
    { on: ["invoice_id"] },
    { on: ["line_type"] },
    { on: ["source_ref"] },
  ])

export default SellerInvoiceLine
