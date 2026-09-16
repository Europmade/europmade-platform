import { model } from "@medusajs/framework/utils"

/**
 * Made in Europe — product-linked production evidence.
 * Designed so a future AI/document check can attach verification_method + notes.
 */
const ProductOriginEvidence = model
  .define("product_origin_evidence", {
    id: model.id({ prefix: "poev" }).primaryKey(),
    product_id: model.text(),
    product_origin_id: model.text().nullable(),
    product_version_id: model.text().nullable(),
    /** photo | pdf | other */
    document_type: model.text(),
    /** made_in_europe | ce_marking | data_usage */
    evidence_kind: model.text().default("made_in_europe"),
    storage_reference: model.text(),
    file_name: model.text().nullable(),
    mime_type: model.text().nullable(),
    file_size_bytes: model.number().nullable(),
    /** pending | pending_review | needs_info | approved | rejected | superseded */
    verification_status: model.text().default("pending"),
    verification_notes: model.text().nullable(),
    verification_result: model.text().nullable(),
    verification_method: model.text().nullable(),
    verified_at: model.dateTime().nullable(),
    verified_by: model.text().nullable(),
    uploaded_by_customer_id: model.text().nullable(),
  })
  .indexes([
    { on: ["product_id"] },
    { on: ["product_origin_id"] },
    { on: ["verification_status"] },
  ])

export default ProductOriginEvidence
