import { model } from "@medusajs/framework/utils"
import EngagementOrganization from "./organization"

/**
 * ImportBatch — herleidbaarheid van een prospectimport.
 * Geen Excel-workflow.
 */
const EngagementImportBatch = model
  .define("engagement_import_batch", {
    id: model.id({ prefix: "eimb" }).primaryKey(),
    source: model.text().default("excel_import"),
    file_name: model.text().nullable(),
    organizations: model.hasMany(() => EngagementOrganization, {
      mappedBy: "import_batch",
    }),
  })
  .indexes([{ on: ["source"] }])

export default EngagementImportBatch
