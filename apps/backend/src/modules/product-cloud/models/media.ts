import { model } from "@medusajs/framework/utils"
import ProductVersion from "./product-version"

/**
 * Media — Blueprint `02-database-model.md` Deel B.15.
 * Exportnaam `ProductMedia` (niet `Media`) zodat MedusaService
 * createProductMedias/listProductMedias genereert (inflection).
 */
const ProductMedia = model
  .define("pc_media", {
    id: model.id({ prefix: "media" }).primaryKey(),
    product_version: model.belongsTo(() => ProductVersion, {
      mappedBy: "media_items",
      foreignKeyName: "product_version_id",
    }),
    media_type: model.enum([
      "Hoofdafbeelding",
      "Overige afbeelding",
      "Video",
    ]),
    storage_reference: model.text(),
    sort_order: model.number().default(0),
  })
  .indexes([{ on: ["product_version_id"] }])

export default ProductMedia
