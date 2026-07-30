import { model } from "@medusajs/framework/utils"
import OfferInventory from "./inventory"
import OfferPrice from "./price"

/**
 * Offer — Blueprint `02-database-model.md` Deel C.1.
 * Soft refs `seller_id` / `identifier_id` (ADR-0015).
 */
const Offer = model
  .define("offer", {
    id: model.id({ prefix: "offr" }).primaryKey(),
    seller_id: model.text(),
    identifier_id: model.text(),
    region_code: model.text(),
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
    { on: ["seller_id"] },
    { on: ["identifier_id"] },
    { on: ["region_code"] },
  ])

export default Offer
