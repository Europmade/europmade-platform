import { model } from "@medusajs/framework/utils"
import ProductVariant from "./product-variant"

/**
 * Identifier — Blueprint `02-database-model.md` Deel B.5.
 * EAN-13 is GTIN-subtype (product-cloud-architecture Deel 2.4 / ADR-0007-context).
 */
const Identifier = model
  .define("identifier", {
    id: model.id({ prefix: "iden" }).primaryKey(),
    product_variant: model.belongsTo(() => ProductVariant, {
      mappedBy: "identifiers",
      foreignKeyName: "product_variant_id",
    }),
    identifier_type: model.enum(["GTIN", "MPN"]),
    identifier_value: model.text(),
    // null = alle landen (Blueprint B.5).
    country_scope: model.text().nullable(),
  })
  .indexes([
    {
      on: ["identifier_value", "identifier_type", "country_scope"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["identifier_value"] },
    { on: ["product_variant_id"] },
  ])

export default Identifier
