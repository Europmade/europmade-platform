import { model } from "@medusajs/framework/utils"
import EngagementContact from "./contact"

/**
 * Suppression — harde stop per contact en categorie.
 * De orchestrator moet dit later vóór verzending lezen. Deze module verzendt niet.
 */
const EngagementSuppression = model
  .define("engagement_suppression", {
    id: model.id({ prefix: "esup" }).primaryKey(),
    contact: model.belongsTo(() => EngagementContact, {
      mappedBy: "suppressions",
      foreignKeyName: "contact_id",
    }),
    category: model.enum(["acquisition", "operational", "marketing"]),
    reason: model.enum(["unsubscribe", "bounce", "manual"]),
    active: model.boolean().default(true),
  })
  .indexes([
    { on: ["contact_id"] },
    { on: ["category"] },
    { on: ["reason"] },
    {
      on: ["contact_id", "category"],
      unique: true,
      where: "active = true AND deleted_at IS NULL",
    },
  ])

export default EngagementSuppression
