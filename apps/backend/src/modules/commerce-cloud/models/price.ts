import { model } from "@medusajs/framework/utils"
import Offer from "./offer"

/**
 * Price — Blueprint `02-database-model.md` Deel C.3.
 * Tabelnaam `cc_price` om botsing met Medusa Pricing-module te vermijden.
 */
const OfferPrice = model
  .define("cc_price", {
    id: model.id({ prefix: "cprc" }).primaryKey(),
    offer: model.belongsTo(() => Offer, {
      mappedBy: "price",
      foreignKeyName: "offer_id",
    }),
    base_price: model.bigNumber(),
    shipping_cost: model.bigNumber(),
    vat_rate: model.float(),
  })
  .indexes([
    {
      on: ["offer_id"],
      unique: true,
      where: "deleted_at IS NULL",
      name: "IDX_cc_price_offer_id_unique",
    },
  ])

export default OfferPrice
