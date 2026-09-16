import { model } from "@medusajs/framework/utils"
import EmOrder from "./em-order"

/**
 * shipment — Blueprint Deel D.4 + ADR-0040 (carrier / T&T / status).
 * Status: pending → shipped → in_transit → out_for_delivery → delivered | exception
 */
const Shipment = model
  .define("shipment", {
    id: model.id({ prefix: "ship" }).primaryKey(),
    order: model.belongsTo(() => EmOrder, {
      mappedBy: "shipments",
      foreignKeyName: "order_id",
    }),
    carrier: model.text().nullable(),
    tracking_code: model.text().nullable(),
    tracking_url: model.text().nullable(),
    status: model
      .enum([
        "pending",
        "shipped",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "exception",
      ])
      .nullable(),
    expected_delivery_at: model.dateTime().nullable(),
    shipped_at: model.dateTime().nullable(),
    delivered_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["order_id"] }])

export default Shipment
