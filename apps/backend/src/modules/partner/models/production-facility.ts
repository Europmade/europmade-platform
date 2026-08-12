import { model } from "@medusajs/framework/utils"

/**
 * Productiefaciliteit gekoppeld aan een merk (en optioneel producent).
 * Geen dubbele manufacturer-entity — facility is de publieke productielocatie.
 */
const ProductionFacility = model
  .define("production_facility", {
    id: model.id({ prefix: "pfac" }).primaryKey(),
    brand_id: model.text(),
    manufacturer_id: model.text().nullable(),
    name: model.text(),
    country_code: model.text(),
    region: model.text().nullable(),
    description: model.text().nullable(),
    is_active: model.boolean().default(true),
  })
  .indexes([{ on: ["brand_id"] }, { on: ["manufacturer_id"] }])

export default ProductionFacility
