import { model } from "@medusajs/framework/utils"

/**
 * Basis CMS-asset metadata (geen volledige DAM).
 */
const CmsAsset = model
  .define("cms_asset", {
    id: model.id({ prefix: "cmsas" }).primaryKey(),
    placement: model.text(),
    storage_reference: model.text(),
    mime_type: model.text(),
    original_filename: model.text().nullable(),
    size_bytes: model.number().default(0),
    width: model.number().nullable(),
    height: model.number().nullable(),
    alt_text: model.json().nullable(),
  })
  .indexes([{ on: ["placement"] }])

export default CmsAsset
