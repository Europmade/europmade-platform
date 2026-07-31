import { model } from "@medusajs/framework/utils"
import Cart from "./cart"

/**
 * em_cart_line — Offer-regel in winkelwagen (ADR-0022).
 */
const CartLine = model
  .define("em_cart_line", {
    id: model.id({ prefix: "clin" }).primaryKey(),
    cart: model.belongsTo(() => Cart, {
      mappedBy: "lines",
      foreignKeyName: "cart_id",
    }),
    offer_id: model.text(),
    quantity: model.number(),
  })
  .indexes([
    { on: ["cart_id"] },
    {
      on: ["cart_id", "offer_id"],
      unique: true,
      where: "deleted_at IS NULL",
      name: "IDX_em_cart_line_cart_offer_unique",
    },
  ])

export default CartLine
