import { model } from "@medusajs/framework/utils"
import ProductVersion from "./product-version"

/**
 * Document — Blueprint `02-database-model.md` Deel B.15 + ADR-0037.
 * Soft ref naar distributor_authorization (Partner) als tekst-ID.
 */
const ProductDocument = model
  .define("pc_document", {
    id: model.id({ prefix: "pdoc" }).primaryKey(),
    product_version: model
      .belongsTo(() => ProductVersion, {
        mappedBy: "documents",
        foreignKeyName: "product_version_id",
      })
      .nullable(),
    distributor_authorization_id: model.text().nullable(),
    document_type: model.enum([
      "CE-certificaat",
      "Overig compliance-document",
      "Autorisatiebewijs",
      "Handleiding",
      "Veiligheidsinformatieblad",
      "Garantiebewijs",
      "Conformiteitsverklaring",
    ]),
    storage_reference: model.text(),
  })
  .indexes([
    { on: ["product_version_id"] },
    { on: ["distributor_authorization_id"] },
  ])

export default ProductDocument
