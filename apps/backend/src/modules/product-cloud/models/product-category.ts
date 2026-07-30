import { model } from "@medusajs/framework/utils"
import Product from "./product"
import Category from "./category"

/**
 * ProductCategory — Blueprint `02-database-model.md` Deel B.7 (many-to-many).
 */
const ProductCategory = model
  .define("pc_product_category", {
    id: model.id({ prefix: "pctg" }).primaryKey(),
    product: model.belongsTo(() => Product, {
      mappedBy: "product_categories",
      foreignKeyName: "product_id",
    }),
    category: model.belongsTo(() => Category, {
      mappedBy: "product_categories",
      foreignKeyName: "category_id",
    }),
  })
  .indexes([
    {
      on: ["product_id", "category_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["product_id"] },
    { on: ["category_id"] },
  ])

export default ProductCategory
