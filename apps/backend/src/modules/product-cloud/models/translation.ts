/**
 * Translation — Blueprint B.16 + ADR-0037/0039.
 * Polymorf: geen harde FK (entity_type + entity_id).
 */
import { model } from "@medusajs/framework/utils"

const ProductTranslation = model
  .define("pc_translation", {
    id: model.id({ prefix: "ptrn" }).primaryKey(),
    entity_type: model.enum([
      "product_version",
      "category",
      "attribute_definition",
    ]),
    entity_id: model.text(),
    field_name: model.text(),
    language_code: model.text(),
    value: model.text(),
    source_language_code: model.text().nullable(),
    source_value: model.text().nullable(),
    translation_status: model.enum([
      "Ontbreekt",
      "Concept",
      "Machine",
      "Beoordeeld",
      "Gepubliceerd",
      "Verouderd",
      "Mislukt",
    ]),
    translation_version: model.number().default(1),
    /** Bronversie waarop deze vertaling gebaseerd is (ADR-0039). */
    source_version: model.number().default(1),
    /** machine = auto; manual = handmatige override (beschermd). */
    origin: model.enum(["machine", "manual"]).default("machine"),
    updated_by: model.text().nullable(),
  })
  .indexes([
    {
      on: ["entity_type", "entity_id", "field_name", "language_code"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["entity_type", "entity_id"] },
    { on: ["language_code"] },
    { on: ["translation_status"] },
  ])

export default ProductTranslation
