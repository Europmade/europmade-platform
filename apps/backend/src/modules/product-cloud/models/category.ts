import { model } from "@medusajs/framework/utils"
import ProductCategory from "./product-category"
import AttributeDefinition from "./attribute-definition"

/**
 * Category — Blueprint `02-database-model.md` Deel B.6.
 * Tabelnaam `pc_category` om botsing met Medusa Category te vermijden (ADR-0008).
 */
const Category = model
  .define("pc_category", {
    id: model.id({ prefix: "pcgy" }).primaryKey(),
    parent_category: model
      .belongsTo(() => Category, {
        mappedBy: "children",
        foreignKeyName: "parent_category_id",
      })
      .nullable(),
    children: model.hasMany(() => Category, { mappedBy: "parent_category" }),
    name: model.text(),
    product_categories: model.hasMany(() => ProductCategory, {
      mappedBy: "category",
    }),
    attribute_definitions: model.hasMany(() => AttributeDefinition, {
      mappedBy: "category",
    }),
  })
  .indexes([{ on: ["parent_category_id"] }])

export default Category
