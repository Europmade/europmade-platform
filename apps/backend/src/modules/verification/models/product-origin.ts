import { model } from "@medusajs/framework/utils"

/**
 * ProductOrigin — Blueprint `02-database-model.md` Deel B.14.
 * Verification-module (11-medusa-architecture.md §3). Koppelt aan
 * product_version, nooit aan product in algemene zin.
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
  })
  .indexes([
    {
      on: ["product_version_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductOrigin
