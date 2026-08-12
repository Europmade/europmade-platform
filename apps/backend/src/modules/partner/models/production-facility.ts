import { model } from "@medusajs/framework/utils"

/**
 * Productiefaciliteit gekoppeld aan een merk (en optioneel producent).
 * Sprint 8: Made in Europe-productieprofielvelden (bandbreedtes, geen handmatige score).
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
    /** Stabiele ID: eu_100 | eu_75_99 | eu_50_74 | eu_below_50 */
    assembly_eu_band: model.text().nullable(),
    /** Stabiele ID: eu_majority | eu_partial | eu_none */
    parts_eu_level: model.text().nullable(),
    /** Stabiele ID: eu_majority | eu_partial | eu_none */
    materials_eu_level: model.text().nullable(),
    /** ISO land van primaire assemblage (EU). */
    primary_assembly_country: model.text().nullable(),
  })
  .indexes([{ on: ["brand_id"] }, { on: ["manufacturer_id"] }])

export default ProductionFacility
