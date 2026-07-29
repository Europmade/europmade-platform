import { model } from "@medusajs/framework/utils"
import Seller from "./seller"
import Brand from "./brand"
import Manufacturer from "./manufacturer"

/**
 * Company — Blueprint `02-database-model.md`, Deel A.2.
 * De juridische bedrijfsentiteit achter een Seller.
 */
const Company = model
  .define("company", {
    id: model.id({ prefix: "comp" }).primaryKey(),
    legal_name: model.text(),
    chamber_of_commerce_number: model.text(),
    vat_number: model.text().nullable(),
    country_code: model.text(),
    iban: model.text(),
    sellers: model.hasMany(() => Seller, { mappedBy: "company" }),
    brands: model.hasMany(() => Brand, { mappedBy: "owner_company" }),
    manufacturers: model.hasMany(() => Manufacturer, {
      mappedBy: "represented_by_company",
    }),
  })
  .indexes([
    // Unieke constraint: chamber_of_commerce_number + country_code (samengesteld).
    // Beperkt tot rijen met een echte KvK-/registratiewaarde: een Concept mag
    // vóór het invullen van de Bedrijfsgegevens nog lege placeholder-strings
    // bevatten (spec §1.2, "Concept mag onvolledig zijn"), en die placeholders
    // mogen onderling nooit als "duplicaat" botsen.
    {
      on: ["chamber_of_commerce_number", "country_code"],
      unique: true,
      where:
        "deleted_at IS NULL AND chamber_of_commerce_number <> '' AND country_code <> ''",
    },
    // Los vermelde index op chamber_of_commerce_number (Blueprint, kolom "Indexen").
    { on: ["chamber_of_commerce_number"] },
  ])

export default Company
