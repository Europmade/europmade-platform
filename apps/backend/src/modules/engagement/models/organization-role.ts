import { model } from "@medusajs/framework/utils"
import EngagementOrganization from "./organization"

/**
 * OrganizationRole — set van prospectrollen.
 * `brand` hier is geen catalogus-brand.
 */
const EngagementOrganizationRole = model
  .define("engagement_organization_role", {
    id: model.id({ prefix: "eorl" }).primaryKey(),
    organization: model.belongsTo(() => EngagementOrganization, {
      mappedBy: "roles",
      foreignKeyName: "organization_id",
    }),
    role: model.enum([
      "brand",
      "seller",
      "manufacturer",
      "distributor",
      "retailer",
      "other",
      "unknown",
    ]),
  })
  .indexes([
    {
      on: ["organization_id", "role"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["organization_id"] },
    { on: ["role"] },
  ])

export default EngagementOrganizationRole
