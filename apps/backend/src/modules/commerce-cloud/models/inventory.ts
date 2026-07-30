import { model } from "@medusajs/framework/utils"
import Offer from "./offer"

/**
 * Inventory — Blueprint `02-database-model.md` Deel C.2.
 */
const OfferInventory = model
  .define("cc_inventory", {
    id: model.id({ prefix: "cinv" }).primaryKey(),
    offer: model.belongsTo(() => Offer, {
      mappedBy: "inventory",
      foreignKeyName: "offer_id",
    }),
    quantity_available: model.number(),
  })
  .indexes([
    {
      on: ["offer_id"],
      unique: true,
      where: "deleted_at IS NULL",
      name: "IDX_cc_inventory_offer_id_unique",
    },
  ])

export default OfferInventory
