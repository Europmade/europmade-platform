import { model } from "@medusajs/framework/utils"
import ProductFamily from "./product-family"
import ProductVersion from "./product-version"
import ProductVariant from "./product-variant"
import ProductCategory from "./product-category"
import OwnershipRecord from "./ownership-record"
import Claim from "./claim"
import Dispute from "./dispute"

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
  })
  .indexes([
    { on: ["brand_id"] },
    { on: ["manufacturer_id"] },
    { on: ["current_owner_seller_id"] },
  ])

export default Product
