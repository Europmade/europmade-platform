import { model } from "@medusajs/framework/utils"
import Product from "./product"

/**
 * ProductFamily — Blueprint `02-database-model.md` Deel B.1.
 * Navigatie-/samenhangconcept; geen eigendoms- of verkoopimplicatie.
 */
const ProductFamily = model
  .define("product_family", {
    id: model.id({ prefix: "pfam" }).primaryKey(),
    name: model.text(),
    products: model.hasMany(() => Product, { mappedBy: "product_family" }),
  })

export default ProductFamily
