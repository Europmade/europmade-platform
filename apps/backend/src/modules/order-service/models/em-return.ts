import { model } from "@medusajs/framework/utils"
import OrderLine from "./order-line"

/**
 * em_return — Blueprint Deel D.5 `return` (structureel; status Open).
 */
const EmReturn = model
  .define("em_return", {
    id: model.id({ prefix: "retn" }).primaryKey(),
    order_line: model.belongsTo(() => OrderLine, {
      mappedBy: "returns",
      foreignKeyName: "order_line_id",
    }),
    reason: model.text().nullable(),
    status: model.text().nullable(),
  })
  .indexes([{ on: ["order_line_id"] }])

export default EmReturn
