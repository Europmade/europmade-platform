import { model } from "@medusajs/framework/utils"
import OrderLine from "./order-line"

/**
 * em_return — Blueprint Deel D.5 + returns-and-refunds/spec.md (ADR-0023).
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
      .enum(["Pending", "Uitgevoerd", "Geforceerd"])
      .nullable(),
    refund_reference: model.text().nullable(),
    refund_executed_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["order_line_id"] },
    { on: ["status"] },
    { on: ["refund_status"] },
  ])

export default EmReturn
