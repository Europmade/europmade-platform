import { model } from "@medusajs/framework/utils"

/**
 * European ownership claim for a manufacturer/company (not product production).
 * Soft-refs to partner manufacturer/company (ADR-0008 / ADR-0044).
 */
const EuropeanOwnershipClaim = model
  .define("european_ownership_claim", {
    id: model.id({ prefix: "euown" }).primaryKey(),
    /** Soft-ref partner.manufacturer (manu_*). Primary attachment. */
    manufacturer_id: model.text(),
    /** Soft-ref partner.company when known. */
    company_id: model.text().nullable(),
    /** Seller who last submitted/updated the claim. */
    seller_id: model.text(),
    ownership_band: model.enum([
      "eu_0",
      "eu_1_25",
      "eu_26_50",
      "eu_51_75",
      "eu_76_99",
      "eu_100",
      "unknown",
    ]),
    source: model.enum([
      "brand_producer",
      "factory",
      "reseller",
      "other",
    ]),
    status: model.enum([
      "Niet opgegeven",
      "Opgegeven door aanbieder",
      "Bewijs aangeleverd",
      "Geverifieerd door EuropMade",
      "Bewijs opgevraagd",
      "Afgewezen",
    ]),
    /** Optional evidence file id / storage reference (same pattern as brand claim). */
    evidence_file_id: model.text().nullable(),
    evidence_note: model.text().nullable(),
    /** Seller-facing admin note (approve / request_info / reject). */
    review_note: model.text().nullable(),
    reviewed_by: model.text().nullable(),
    reviewed_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      on: ["manufacturer_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["company_id"], where: "deleted_at IS NULL" },
    { on: ["seller_id"], where: "deleted_at IS NULL" },
    { on: ["status"], where: "deleted_at IS NULL" },
  ])

export default EuropeanOwnershipClaim
