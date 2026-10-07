import { model } from "@medusajs/framework/utils"
import EngagementOrganization from "./organization"
import EngagementEnrollment from "./enrollment"
import EngagementPreference from "./preference"
import EngagementSuppression from "./suppression"
import EngagementCommunicationEvent from "./communication-event"

/**
 * Contact — persoon/contactpunt op een Organization.
 * Geen Medusa Customer.
 */
const EngagementContact = model
  .define("engagement_contact", {
    id: model.id({ prefix: "ectc" }).primaryKey(),
    organization: model.belongsTo(() => EngagementOrganization, {
      mappedBy: "contacts",
      foreignKeyName: "organization_id",
    }),
    name: model.text().nullable(),
    email: model.text(),
    enrollments: model.hasMany(() => EngagementEnrollment, {
      mappedBy: "contact",
    }),
    preferences: model.hasMany(() => EngagementPreference, {
      mappedBy: "contact",
    }),
    suppressions: model.hasMany(() => EngagementSuppression, {
      mappedBy: "contact",
    }),
    communication_events: model.hasMany(() => EngagementCommunicationEvent, {
      mappedBy: "contact",
    }),
  })
  .indexes([
    {
      on: ["organization_id", "email"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["organization_id"] },
    { on: ["email"] },
  ])

export default EngagementContact
