import { model } from "@medusajs/framework/utils"

/**
 * Seller-defined shipping profile (Sprint 3B 2.0).
 * Product links via pc_product.shipping_profile_id; offers sync denormalized rates.
 * Carrier/service refs are stored for future API integration — MVP uses own shipping.
 */
const SellerShippingProfile = model
  .define("cc_shipping_profile", {
    id: model.id({ prefix: "cshp" }).primaryKey(),
    seller_id: model.text(),
    name: model.text(),
    description: model.text().nullable(),
    status: model.enum(["draft", "active", "inactive"]).default("draft"),
    /** Per-country delivery + cost config (ShippingCountryConfig). */
    country_rates: model.json().default({}),
    /** Handover/cut-off settings (ProcessingSettings). */
    processing_settings: model.json().default({}),
    /** own = seller-defined rates; carrier = future carrier API. */
    carrier_mode: model.enum(["own", "carrier"]).default("own"),
    /** Default carrier ref for future integrations. */
    carrier_ref: model.json().nullable(),
  })
  .indexes([
    { on: ["seller_id"] },
    { on: ["seller_id", "status"] },
    {
      on: ["seller_id", "name"],
      unique: true,
      where: "deleted_at IS NULL",
      name: "IDX_cc_shipping_profile_seller_name_unique",
    },
  ])

export default SellerShippingProfile
