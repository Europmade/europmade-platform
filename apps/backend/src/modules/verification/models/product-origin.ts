import { model } from "@medusajs/framework/utils"

/**
 * ProductOrigin — Blueprint `02-database-model.md` Deel B.14 + Sprint 8 Made in Europe.
 * Koppelt aan product_version; optioneel aan production_facility (geen tweede facility-systeem).
 */
const ProductOrigin = model
  .define("product_origin", {
    id: model.id({ prefix: "porg" }).primaryKey(),
    product_version_id: model.text(),
    manufacturer_id: model.text(),
    brand_id: model.text(),
    seller_id: model.text(),
    production_country: model.text(),
    production_location: model.text(),
    status: model.enum([
      "Niet aangevraagd",
      "Aangevraagd",
      "In beoordeling",
      "Aanvullende informatie vereist",
      "Geverifieerd",
      "Afgewezen",
      "Ingetrokken",
    ]),
    ai_metadata_id: model.text().nullable(),
    next_recheck_due_at: model.dateTime().nullable(),
    /** FK naar partner.production_facility (pfac_*). */
    production_facility_id: model.text().nullable(),
    assembly_eu_band: model.text().nullable(),
    parts_eu_level: model.text().nullable(),
    materials_eu_level: model.text().nullable(),
    primary_assembly_country: model.text().nullable(),
  })
  .indexes([
    {
      on: ["product_version_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      on: ["production_facility_id"],
      where: "deleted_at IS NULL",
    },
  ])

export default ProductOrigin
