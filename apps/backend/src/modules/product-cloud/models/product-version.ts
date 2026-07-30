import { model } from "@medusajs/framework/utils"
import Product from "./product"
import AttributeValue from "./attribute-value"
import ProductMedia from "./media"

/**
 * ProductVersion — Blueprint `02-database-model.md` Deel B.3.
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
    publication_status: model.enum([
      "Concept",
      "In review",
      "Goedgekeurd",
      "Gepubliceerd",
      "Gearchiveerd",
      "Verwijderd",
    ]),
    created_by_seller_id: model.text(),
    attribute_values: model.hasMany(() => AttributeValue, {
      mappedBy: "product_version",
    }),
    media_items: model.hasMany(() => ProductMedia, {
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
