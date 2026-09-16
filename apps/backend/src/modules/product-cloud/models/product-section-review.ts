import { model } from "@medusajs/framework/utils"
import Product from "./product"
import ProductVersion from "./product-version"

/**
 * Per-section admin product review (Goed / Aanvullen / Afwijzen).
 * Orthogonal to publication_status and evidence verification_status.
 * One current row per (product_id, section_key) — upserted on save.
 */
const ProductSectionReview = model
  .define("pc_section_review", {
    id: model.id({ prefix: "psrev" }).primaryKey(),
    product: model.belongsTo(() => Product, {
      mappedBy: "section_reviews",
      foreignKeyName: "product_id",
    }),
    product_version: model
      .belongsTo(() => ProductVersion, {
        mappedBy: "section_reviews",
        foreignKeyName: "product_version_id",
      })
      .nullable(),
    section_key: model.enum([
      "product_info",
      "seller",
      "media",
      "made_in_europe",
      "ce_compliance",
      "content",
      "claims",
      "other",
    ]),
    status: model.enum(["unreviewed", "ok", "needs_info", "rejected"]),
    comment: model.text().nullable(),
    decided_by: model.text().nullable(),
    decided_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      on: ["product_id", "section_key"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["product_id"] },
    { on: ["status"] },
  ])

export default ProductSectionReview
