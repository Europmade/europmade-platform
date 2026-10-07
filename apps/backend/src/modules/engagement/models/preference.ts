import { model } from "@medusajs/framework/utils"
import EngagementContact from "./contact"

/**
 * Preference — voorkeur per contact, categorie en kanaal.
 * Unsubscribe is geen tabel; die actie zet enabled uit en schrijft Suppression.
 */
const EngagementPreference = model
  .define("engagement_preference", {
    id: model.id({ prefix: "eprf" }).primaryKey(),
    contact: model.belongsTo(() => EngagementContact, {
      mappedBy: "preferences",
      foreignKeyName: "contact_id",
    }),
    category: model.enum(["acquisition", "operational", "marketing"]),
    channel: model.enum(["email"]).default("email"),
    enabled: model.boolean().default(true),
  })
  .indexes([
    { on: ["contact_id"] },
    { on: ["category"] },
    {
      on: ["contact_id", "category", "channel"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default EngagementPreference
