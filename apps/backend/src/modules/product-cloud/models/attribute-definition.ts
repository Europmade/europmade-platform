import { model } from "@medusajs/framework/utils"
import Category from "./category"
import AttributeValue from "./attribute-value"

/**
 * AttributeDefinition — Blueprint `02-database-model.md` Deel B.8.
 */
const AttributeDefinition = model
  .define("attribute_definition", {
    id: model.id({ prefix: "adef" }).primaryKey(),
    category: model.belongsTo(() => Category, {
      mappedBy: "attribute_definitions",
      foreignKeyName: "category_id",
    }),
    name: model.text(),
    data_type: model.enum(["Numeriek", "Keuzelijst", "Tekst-met-eenheid"]),
    is_required: model.boolean(),
    attribute_values: model.hasMany(() => AttributeValue, {
      mappedBy: "attribute_definition",
    }),
  })
  .indexes([
    {
      on: ["category_id", "name"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default AttributeDefinition
