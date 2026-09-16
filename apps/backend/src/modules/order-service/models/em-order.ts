import { model } from "@medusajs/framework/utils"
import OrderSet from "./order-set"
import OrderLine from "./order-line"
import Shipment from "./shipment"
import OrderMessage from "./message"
import OrderDocument from "./order-document"

/**
 * em_order — Blueprint Deel D.2 `order` (ADR-0021: prefix vermijdt Medusa `order`).
 */
const EmOrder = model
  .define("em_order", {
    id: model.id({ prefix: "mord" }).primaryKey(),
    order_number: model.text(),
    order_set: model.belongsTo(() => OrderSet, {
      mappedBy: "orders",
      foreignKeyName: "order_set_id",
    }),
    customer_id: model.text(),
    seller_id: model.text(),
    payment_status: model.enum(["Betaald", "Betaling wordt verwerkt"]),
    exception_status: model
      .enum(["Mislukte ordersplitsing", "Afgehandeld"])
      .nullable(),
    shipping_address: model.text(),
    billing_address: model.text(),
    /** ISO-3166-1 alpha-2 destination country (OSS VAT). */
    shipping_country_code: model.text().nullable(),
    exception_reason: model.text().nullable(),
    lines: model.hasMany(() => OrderLine, {
      mappedBy: "order",
    }),
    shipments: model.hasMany(() => Shipment, {
      mappedBy: "order",
    }),
    messages: model.hasMany(() => OrderMessage, {
      mappedBy: "order",
    }),
    documents: model.hasMany(() => OrderDocument, {
      mappedBy: "order",
    }),
  })
  .indexes([
    {
      on: ["order_number"],
      unique: true,
      where: "deleted_at IS NULL",
      name: "IDX_em_order_order_number_unique",
    },
    { on: ["customer_id"] },
    { on: ["seller_id"] },
    { on: ["order_set_id"] },
    { on: ["payment_status"] },
    { on: ["exception_status"] },
  ])

export default EmOrder
