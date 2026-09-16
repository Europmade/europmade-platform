import { model } from "@medusajs/framework/utils"

/**
 * Claim + evidence for official brand ownership (public merkpagina).
 * Reuses partner-onboarding review statuses; not a second brand model.
 */
const BrandOwnershipClaim = model
  .define("brand_ownership_claim", {
    id: model.id({ prefix: "boclaim" }).primaryKey(),
    brand_id: model.text(),
    seller_id: model.text(),
    company_id: model.text(),
    evidence_file_id: model.text().nullable(),
    evidence_url: model.text().nullable(),
    evidence_note: model.text().nullable(),
    status: model.enum([
      "Ingediend",
      "In beoordeling",
      "Aanvullende informatie vereist",
      "Goedgekeurd",
      "Afgekeurd",
    ]),
    review_note: model.text().nullable(),
    reviewed_by: model.text().nullable(),
    reviewed_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["brand_id"] },
    { on: ["seller_id"] },
    { on: ["status"] },
    { on: ["company_id"] },
  ])

export default BrandOwnershipClaim
