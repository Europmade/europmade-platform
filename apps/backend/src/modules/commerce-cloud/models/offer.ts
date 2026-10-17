import { model } from "@medusajs/framework/utils"
import OfferInventory from "./inventory"
import OfferPrice from "./price"

/**
 * Offer — Blueprint `02-database-model.md` Deel C.1.
 * Soft refs `seller_id` / `identifier_id` (ADR-0015).
 * sales_status is seller-offer lifecycle (≠ Product Cloud publication).
 */
const Offer = model
  .define("offer", {
    id: model.id({ prefix: "offr" }).primaryKey(),
    seller_id: model.text(),
    identifier_id: model.text(),
    region_code: model.text(),
    /** Seller-internal SKU / reference — never shared catalog identity. */
    seller_sku: model.text().nullable(),
    /**
     * active = te koop (eligible for Buy Box when stock > 0)
     * paused = seller paused this offer (catalog product unchanged)
     */
    sales_status: model.enum(["active", "paused"]).default("active"),
    /** Upper bound promised delivery window in calendar/business days (seller-set). */
    delivery_days_max: model.number().nullable(),
    /** Optional link to seller shipping profile (bulk country rates). */
    shipping_profile_id: model.text().nullable(),
    inventory: model.hasOne(() => OfferInventory, {
      mappedBy: "offer",
    }),
    price: model.hasOne(() => OfferPrice, {
      mappedBy: "offer",
    }),
  })
  .indexes([
    {
      on: ["seller_id", "identifier_id", "region_code"],
      unique: true,
      where: "deleted_at IS NULL",
      name: "IDX_offer_seller_identifier_region_unique",
    },
    {
      on: ["seller_id", "seller_sku"],
      where: "deleted_at IS NULL AND seller_sku IS NOT NULL",
      name: "IDX_offer_seller_sku",
    },
    { on: ["seller_id"] },
    { on: ["identifier_id"] },
    { on: ["region_code"] },
    { on: ["sales_status"] },
  ])

export default Offer
