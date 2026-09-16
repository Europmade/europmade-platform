import { model } from "@medusajs/framework/utils"
import OrderLine from "./order-line"

/**
 * em_return — Blueprint Deel D.5 + ADR-0023/0040.
 * Status: Aangevraagd → Bevestigd → Onderweg → Ontvangen → Verwerkt
 */
const EmReturn = model
  .define("em_return", {
    id: model.id({ prefix: "retn" }).primaryKey(),
    order_line: model.belongsTo(() => OrderLine, {
      mappedBy: "returns",
      foreignKeyName: "order_line_id",
    }),
    reason: model.text(),
    status: model.enum([
      "Aangevraagd",
      "Bevestigd",
      "Onderweg",
      "Ontvangen",
      "Verwerkt",
      "Afgewezen",
      "Geëscaleerd",
    ]),
    seller_decision_reason: model.text().nullable(),
    force_reason: model.text().nullable(),
    force_admin_user_id: model.text().nullable(),
    cooling_off_ends_at: model.dateTime(),
    refund_amount: model.bigNumber().nullable(),
    refund_status: model
      .enum(["requested", "processing", "processed", "failed", "forced"])
      .nullable(),
    refund_reference: model.text().nullable(),
    refund_executed_at: model.dateTime().nullable(),
    carrier: model.text().nullable(),
    tracking_code: model.text().nullable(),
    tracking_url: model.text().nullable(),
  })
  .indexes([
    { on: ["order_line_id"] },
    { on: ["status"] },
    { on: ["refund_status"] },
  ])

export default EmReturn
