import { model } from "@medusajs/framework/utils"
import EmOrder from "./em-order"

/**
 * shipment — Blueprint Deel D.4 (structureel; regels Open).
 */
const Shipment = model
  .define("shipment", {
    id: model.id({ prefix: "ship" }).primaryKey(),
    order: model.belongsTo(() => EmOrder, {
      mappedBy: "shipments",
      foreignKeyName: "order_id",
    }),
    tracking_code: model.text().nullable(),
    expected_delivery_at: model.dateTime().nullable(),
    delivered_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["order_id"] }])

export default Shipment
