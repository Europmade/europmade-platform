import { model } from "@medusajs/framework/utils"
import Offer from "./offer"

/**
 * Price — Blueprint `02-database-model.md` Deel C.3.
 * Tabelnaam `cc_price` om botsing met Medusa Pricing-module te vermijden.
 * promo_* = tijdelijke actieprijs (Commerce Cloud, niet catalogus).
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
    /** Objectieve extra leverings-/handlingkosten per markt (niet een andere basisprijs). */
    extra_delivery_cost: model.bigNumber().nullable(),
    vat_rate: model.float(),
    /** Temporary / promotional unit price (excl. shipping). */
    promo_price: model.bigNumber().nullable(),
    promo_starts_at: model.dateTime().nullable(),
    promo_ends_at: model.dateTime().nullable(),
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
