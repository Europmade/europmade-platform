import { model } from "@medusajs/framework/utils"
import Product from "./product"
import Identifier from "./identifier"

/**
 * ProductVariant — Blueprint `02-database-model.md` Deel B.4.
 */
const ProductVariant = model
  .define("pc_product_variant", {
    id: model.id({ prefix: "pvar" }).primaryKey(),
    product: model.belongsTo(() => Product, {
      mappedBy: "variants",
      foreignKeyName: "product_id",
    }),
    variant_type: model.enum([
      "Kleur",
      "Maat",
      "Inhoud",
      "Vermogen",
      "Spanning",
      "Materiaal",
      "Uitvoering",
      "Bundel",
    ]),
    variant_value: model.text(),
    identifiers: model.hasMany(() => Identifier, { mappedBy: "product_variant" }),
  })
  .indexes([{ on: ["product_id"] }])

export default ProductVariant
