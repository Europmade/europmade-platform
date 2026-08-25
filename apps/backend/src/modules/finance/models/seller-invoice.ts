import { model } from "@medusajs/framework/utils"

/**
 * P2.17 — Monthly invoice from EuropMade to a seller.
 * Immutable once status leaves "draft". Corrections via credit/debit notes only.
 */
const SellerInvoice = model
  .define("seller_invoice", {
    id: model.id({ prefix: "sinv" }).primaryKey(),
    seller_id: model.text(),
    invoice_number: model.text().unique(),
    invoice_date: model.dateTime(),
    period_start: model.dateTime(),
    period_end: model.dateTime(),
    due_date: model.dateTime(),
    currency: model.text().default("EUR"),
    subtotal: model.bigNumber().default(0),
    vat_amount: model.bigNumber().default(0),
    total: model.bigNumber().default(0),
    vat_regime: model.text().default("VAT_STANDARD_NL"),
    status: model
      .enum([
        "draft",
        "issued",
        "due",
        "paid",
        "overdue",
        "credited",
        "cancelled",
      ])
      .default("draft"),
    pdf_url: model.text().nullable(),
    specification_url: model.text().nullable(),
    credit_of_invoice_id: model.text().nullable(),
    settlement_id: model.text().nullable(),
    /** Full historical snapshot of seller + EuropMade details at finalization. */
    snapshot: model.json().nullable(),
  })
  .indexes([
    { on: ["seller_id"] },
    { on: ["status"] },
    { on: ["invoice_number"] },
    { on: ["period_start", "period_end"] },
    { on: ["credit_of_invoice_id"] },
    { on: ["settlement_id"] },
  ])

export default SellerInvoice
