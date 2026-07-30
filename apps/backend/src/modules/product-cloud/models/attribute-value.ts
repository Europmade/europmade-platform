import { model } from "@medusajs/framework/utils"
import ProductVersion from "./product-version"
import AttributeDefinition from "./attribute-definition"

/**
 * AttributeValue — Blueprint `02-database-model.md` Deel B.8.
 */
const AttributeValue = model
  .define("attribute_value", {
    id: model.id({ prefix: "aval" }).primaryKey(),
    product_version: model.belongsTo(() => ProductVersion, {
      mappedBy: "attribute_values",
      foreignKeyName: "product_version_id",
    }),
    attribute_definition: model.belongsTo(() => AttributeDefinition, {
      mappedBy: "attribute_values",
      foreignKeyName: "attribute_definition_id",
    }),
    value: model.text(),
  })
  .indexes([
    {
      on: ["product_version_id", "attribute_definition_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default AttributeValue
