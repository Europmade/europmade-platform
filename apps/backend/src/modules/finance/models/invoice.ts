import { model } from "@medusajs/framework/utils"

/**
 * G.7 Invoice — Klant-factuur / Seller-commissiefactuur / creditnota (ADR-0034).
 */
const Invoice = model
  .define("invoice", {
    id: model.id({ prefix: "inv" }).primaryKey(),
    invoice_type: model.enum(["Klant-factuur", "Seller-commissiefactuur"]),
    order_id: model.text().nullable(),
    seller_id: model.text().nullable(),
    vat_breakdown: model.json(),
    /** Soft: excl. BTW-grondslag voor overzichten. */
    amount_excl_vat: model.bigNumber(),
    /** Soft: factuurtotaal incl. BTW. */
    total_amount: model.bigNumber(),
    pdf_url: model.text().nullable(),
    issued_at: model.dateTime(),
    /** Soft: creditnota → originele factuur; nooit muteer issued rows. */
    credit_of_invoice_id: model.text().nullable(),
    /** Soft: Seller-commissiefactuur periode (MVP: order:<order_id>). */
    period: model.text().nullable(),
  })
  .indexes([
    { on: ["order_id"] },
    { on: ["seller_id"] },
    { on: ["invoice_type"] },
    { on: ["credit_of_invoice_id"] },
  ])

export default Invoice
