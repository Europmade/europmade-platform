import { model } from "@medusajs/framework/utils"
import EmOrder from "./em-order"

/**
 * order_set — Blueprint `02-database-model.md` Deel D.1.
 * Soft ref `customer_id` (ADR-0021).
 */
const OrderSet = model
  .define("order_set", {
    id: model.id({ prefix: "oset" }).primaryKey(),
    customer_id: model.text(),
    payment_reference: model.text(),
    orders: model.hasMany(() => EmOrder, {
      mappedBy: "order_set",
    }),
  })
  .indexes([
    { on: ["customer_id"] },
    {
      on: ["payment_reference"],
      unique: true,
      where: "deleted_at IS NULL",
      name: "IDX_order_set_payment_reference_unique",
    },
  ])

export default OrderSet
