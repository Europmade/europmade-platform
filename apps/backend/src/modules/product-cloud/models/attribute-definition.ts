import { model } from "@medusajs/framework/utils"
import Category from "./category"
import AttributeValue from "./attribute-value"

/**
 * AttributeDefinition — Blueprint B.8 + ADR-0037 metadata for filters/guides.
 */
const AttributeDefinition = model
  .define("attribute_definition", {
    id: model.id({ prefix: "adef" }).primaryKey(),
    category: model.belongsTo(() => Category, {
      mappedBy: "attribute_definitions",
      foreignKeyName: "category_id",
    }),
    name: model.text(),
    /** Stable machine key (e.g. geheugen, vermogen) — ADR-0037. */
    code: model.text().nullable(),
    data_type: model.enum(["Numeriek", "Keuzelijst", "Tekst-met-eenheid"]),
    is_required: model.boolean(),
    /**
     * Schema tier for dynamic forms (managed config).
     * compliance_required is never AI-waivable.
     */
    requirement_tier: model
      .enum([
        "compliance_required",
        "category_required",
        "recommended",
        "optional",
        "not_applicable",
      ])
      .default("optional"),
    unit: model.text().nullable(),
    /** Seller-facing help / i-hint. */
    help_text: model.text().nullable(),
    is_active: model.boolean().default(true),
    is_filterable: model.boolean().default(true),
    is_comparable: model.boolean().default(true),
    sort_order: model.number().default(0),
    /** JSON array of allowed values when data_type = Keuzelijst. */
    option_values: model.text().nullable(),
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
    {
      on: ["category_id", "code"],
      unique: true,
      where: "deleted_at IS NULL AND code IS NOT NULL",
    },
  ])

export default AttributeDefinition
