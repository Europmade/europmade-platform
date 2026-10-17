import { model } from "@medusajs/framework/utils"

/** Saved column mapping for one brand or source. Applied only when headers match. */
const ImportMappingProfile = model
  .define("pc_import_mapping_profile", {
    id: model.id({ prefix: "pimp" }).primaryKey(),
    source_key: model.text(),
    header_signature: model.json(),
    mapping: model.json(),
    column_languages: model.json().nullable(),
    source_language_code: model.text().nullable(),
    created_by: model.text(),
  })
  .indexes([{ on: ["source_key"] }])

export default ImportMappingProfile
