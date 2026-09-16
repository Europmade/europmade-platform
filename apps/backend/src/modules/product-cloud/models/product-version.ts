import { model } from "@medusajs/framework/utils"
import Product from "./product"
import AttributeValue from "./attribute-value"
import ProductMedia from "./media"
import ProductDocument from "./document"
import ProductFieldChange from "./product-field-change"
import ProductSectionReview from "./product-section-review"

/**
 * ProductVersion — Blueprint `02-database-model.md` Deel B.3 + ADR-0037.
 * Append-only redactionele versie van een product.
 */
const ProductVersion = model
  .define("product_version", {
    id: model.id({ prefix: "pver" }).primaryKey(),
    product: model.belongsTo(() => Product, {
      mappedBy: "versions",
      foreignKeyName: "product_id",
    }),
    version_number: model.number(),
    title: model.text(),
    description: model.text(),
    /**
     * JSON array of use-case / audience tags for later toplists
     * (e.g. ["student","budget","family"]) — ADR-0037, no ranking logic.
     */
    use_case_tags: model.text().nullable(),
    /** ISO-639 of the original editorial language (seller input). */
    source_language_code: model.text().nullable(),
    publication_status: model.enum([
      "Concept",
      "In review",
      "Goedgekeurd",
      "Gepubliceerd",
      "Gearchiveerd",
      "Verwijderd",
    ]),
    approval_requested_at: model.dateTime().nullable(),
    approval_rejection_reason: model.text().nullable(),
    approval_decided_at: model.dateTime().nullable(),
    approval_decided_by: model.text().nullable(),
    /**
     * Product-level admin review outcome (orthogonal to publication_status).
     * needs_info = aanvulling gevraagd; rejected/approved = eindbeslissing.
     */
    admin_review_outcome: model
      .enum(["needs_info", "rejected", "approved"])
      .nullable(),
    created_by_seller_id: model.text(),
    attribute_values: model.hasMany(() => AttributeValue, {
      mappedBy: "product_version",
    }),
    media_items: model.hasMany(() => ProductMedia, {
      mappedBy: "product_version",
    }),
    documents: model.hasMany(() => ProductDocument, {
      mappedBy: "product_version",
    }),
    field_changes: model.hasMany(() => ProductFieldChange, {
      mappedBy: "product_version",
    }),
    section_reviews: model.hasMany(() => ProductSectionReview, {
      mappedBy: "product_version",
    }),
  })
  .indexes([
    {
      on: ["product_id", "version_number"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["product_id"] },
    { on: ["publication_status"] },
  ])

export default ProductVersion
