import { model } from "@medusajs/framework/utils"
import CartLine from "./cart-line"

/**
 * em_cart — Offer-centrische winkelwagen (ADR-0022).
 */
const Cart = model
  .define("em_cart", {
    id: model.id({ prefix: "cart" }).primaryKey(),
    customer_id: model.text().nullable(),
    guest_token: model.text().nullable(),
    lines: model.hasMany(() => CartLine, {
      mappedBy: "cart",
    }),
  })
  .indexes([
    { on: ["customer_id"] },
    {
      on: ["guest_token"],
      unique: true,
      where: "deleted_at IS NULL AND guest_token IS NOT NULL",
      name: "IDX_em_cart_guest_token_unique",
    },
  ])

export default Cart
