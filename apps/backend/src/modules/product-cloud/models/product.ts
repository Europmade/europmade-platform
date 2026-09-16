import { model } from "@medusajs/framework/utils"
import ProductFamily from "./product-family"
import ProductVersion from "./product-version"
import ProductVariant from "./product-variant"
import ProductCategory from "./product-category"
import OwnershipRecord from "./ownership-record"
import Claim from "./claim"
import Dispute from "./dispute"
import MatchCandidate from "./match-candidate"
import MergeRecord from "./merge-record"
import SplitRecord from "./split-record"
import ChangeProposal from "./change-proposal"
import ProductRelation from "./product-relation"
import ProductFieldChange from "./product-field-change"
import ProductSectionReview from "./product-section-review"

/**
 * Product — Blueprint `02-database-model.md` Deel B.2.
 * Centrale, onveranderlijke productidentiteit. Cross-module refs naar
 * Partner (`brand`/`manufacturer`/`seller`) als tekst-ID (ADR-0008).
 */
const Product = model
  .define("pc_product", {
    id: model.id({ prefix: "prod" }).primaryKey(),
    product_family: model
      .belongsTo(() => ProductFamily, {
        mappedBy: "products",
        foreignKeyName: "product_family_id",
      })
      .nullable(),
    brand_id: model.text(),
    manufacturer_id: model.text(),
    current_owner_seller_id: model.text(),
    /**
     * Centrale reguliere klantprijs (excl. verzending) — gelijk voor alle markten.
     * Offer.base_price is een sync-kopie; verzendkosten/actie blijven markt-specifiek.
     */
    regular_customer_price: model.bigNumber().nullable(),
    /** Seller shipping profile — all offers sync from this profile. */
    shipping_profile_id: model.text().nullable(),
    lifecycle_status: model.enum([
      "Retailer Created",
      "Concept gecontroleerd",
      "Actief",
      "Verified™",
      "Uitlopend",
      "Niet meer leverbaar",
      "Gearchiveerd",
    ]),
    versions: model.hasMany(() => ProductVersion, { mappedBy: "product" }),
    variants: model.hasMany(() => ProductVariant, { mappedBy: "product" }),
    product_categories: model.hasMany(() => ProductCategory, {
      mappedBy: "product",
    }),
    ownership_records: model.hasMany(() => OwnershipRecord, {
      mappedBy: "product",
    }),
    claims: model.hasMany(() => Claim, { mappedBy: "product" }),
    disputes: model.hasMany(() => Dispute, { mappedBy: "product" }),
    change_proposals: model.hasMany(() => ChangeProposal, {
      mappedBy: "product",
    }),
    match_candidates_a: model.hasMany(() => MatchCandidate, {
      mappedBy: "product_a",
    }),
    match_candidates_b: model.hasMany(() => MatchCandidate, {
      mappedBy: "product_b",
    }),
    merge_records_surviving: model.hasMany(() => MergeRecord, {
      mappedBy: "surviving_product",
    }),
    merge_records_merged: model.hasMany(() => MergeRecord, {
      mappedBy: "merged_product",
    }),
    split_records_original: model.hasMany(() => SplitRecord, {
      mappedBy: "original_product",
    }),
    split_records_new: model.hasMany(() => SplitRecord, {
      mappedBy: "new_product",
    }),
    relations_from: model.hasMany(() => ProductRelation, {
      mappedBy: "from_product",
    }),
    relations_to: model.hasMany(() => ProductRelation, {
      mappedBy: "to_product",
    }),
    field_changes: model.hasMany(() => ProductFieldChange, {
      mappedBy: "product",
    }),
    section_reviews: model.hasMany(() => ProductSectionReview, {
      mappedBy: "product",
    }),
  })
  .indexes([
    { on: ["brand_id"] },
    { on: ["manufacturer_id"] },
    { on: ["current_owner_seller_id"] },
    { on: ["shipping_profile_id"] },
  ])

export default Product
