import { model } from "@medusajs/framework/utils"

/** One Admin brand-file delivery. Not a second product or offer store. */
const ImportBatch = model
  .define("pc_import_batch", {
    id: model.id({ prefix: "pimb" }).primaryKey(),
    source_key: model.text(),
    file_name: model.text().nullable(),
    status: model.text(),
    source_language_code: model.text().nullable(),
    summary: model.json().nullable(),
    issues: model.json().nullable(),
    created_by: model.text(),
  })
  .indexes([
    { on: ["source_key"] },
    { on: ["status"] },
    { on: ["created_by"] },
  ])

export default ImportBatch
