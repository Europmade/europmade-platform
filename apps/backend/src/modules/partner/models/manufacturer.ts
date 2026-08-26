import { model } from "@medusajs/framework/utils"
import Company from "./company"

/**
 * Manufacturer — Blueprint `02-database-model.md`, Deel A.6.
 * GPSR-context: juridische fabrikant/verantwoordelijke fabrikant.
 */
const Manufacturer = model
  .define("manufacturer", {
    id: model.id({ prefix: "manu" }).primaryKey(),
    name: model.text(),
    street: model.text().nullable(),
    house_number: model.text().nullable(),
    postal_code: model.text().nullable(),
    city: model.text().nullable(),
    country_code: model.text().nullable(),
    contact_email: model.text().nullable(),
    contact_phone: model.text().nullable(),
    represented_by_company: model
      .belongsTo(() => Company, {
        mappedBy: "manufacturers",
        foreignKeyName: "represented_by_company_id",
      })
      .nullable(),
  })
  .indexes([{ on: ["name"] }])

export default Manufacturer
