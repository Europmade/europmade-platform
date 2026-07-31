import { model } from "@medusajs/framework/utils"

/**
 * in_app_notification — Blueprint F.3-feed (ADR-0026).
 * Tabelnaam wijkt af van Medusa's `notification` (kanaalverzending).
 */
const InAppNotification = model
  .define("in_app_notification", {
    id: model.id({ prefix: "ianot" }).primaryKey(),
    recipient_customer_id: model.text(),
    notification_type: model.text(),
    source_entity_type: model.text(),
    source_entity_id: model.text(),
    read_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["recipient_customer_id"] },
    { on: ["read_at"] },
    { on: ["source_entity_type", "source_entity_id"] },
  ])

export default InAppNotification
