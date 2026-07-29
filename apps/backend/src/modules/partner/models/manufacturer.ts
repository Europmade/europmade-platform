import { model } from "@medusajs/framework/utils"
import Company from "./company"

/**
 * Manufacturer — Blueprint `02-database-model.md`, Deel A.6.
 * De partij die een product daadwerkelijk vervaardigt.
 */
const Manufacturer = model
  .define("manufacturer", {
    id: model.id({ prefix: "manu" }).primaryKey(),
    name: model.text(),
    represented_by_company: model
      .belongsTo(() => Company, {
        mappedBy: "manufacturers",
        foreignKeyName: "represented_by_company_id",
      })
      .nullable(),
  })
  .indexes([{ on: ["name"] }])

export default Manufacturer
