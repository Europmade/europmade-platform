import { model } from "@medusajs/framework/utils"
import Product from "./product"

/**
 * ProductRelation — ADR-0037: soft product↔product links (no Commerce data).
 */
const ProductRelation = model
  .define("pc_product_relation", {
    id: model.id({ prefix: "prel" }).primaryKey(),
    from_product: model.belongsTo(() => Product, {
      mappedBy: "relations_from",
      foreignKeyName: "from_product_id",
    }),
    to_product: model.belongsTo(() => Product, {
      mappedBy: "relations_to",
      foreignKeyName: "to_product_id",
    }),
    relation_type: model.enum([
      "Vergelijkbaar",
      "Accessoire",
      "Gerelateerd",
      "VaakSamenGekocht",
      "Alternatief",
    ]),
  })
  .indexes([
    {
      on: ["from_product_id", "to_product_id", "relation_type"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["from_product_id"] },
    { on: ["to_product_id"] },
  ])

export default ProductRelation
