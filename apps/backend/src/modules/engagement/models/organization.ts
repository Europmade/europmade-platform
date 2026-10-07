import { model } from "@medusajs/framework/utils"
import EngagementImportBatch from "./import-batch"
import EngagementOrganizationRole from "./organization-role"
import EngagementContact from "./contact"
import EngagementEnrollment from "./enrollment"

/**
 * Organization — CRM/prospect-bedrijf vóór registratie.
 * Geen tweede seller, customer, company of catalogus-brand.
 * Convert blijft een soft ref.
 */
const EngagementOrganization = model
  .define("engagement_organization", {
    id: model.id({ prefix: "eorg" }).primaryKey(),
    company_name: model.text(),
    website: model.text().nullable(),
    category: model.text().nullable(),
    sales_model: model
      .enum([
        "direct_to_consumer",
        "reseller_only",
        "mixed",
        "brand_seeking_partners",
        "unknown",
      ])
      .default("unknown"),
    outreach_status: model.text().default("new"),
    /** Bijvoorbeeld excel_import of later brand_referral. Geen verzending. */
    source: model.text().default("excel_import"),
    outreach_purpose: model.text().nullable(),
    self_classification_payload: model.json().nullable(),
    import_batch: model
      .belongsTo(() => EngagementImportBatch, {
        mappedBy: "organizations",
        foreignKeyName: "import_batch_id",
      })
      .nullable(),
    converted_customer_id: model.text().nullable(),
    converted_seller_id: model.text().nullable(),
    roles: model.hasMany(() => EngagementOrganizationRole, {
      mappedBy: "organization",
    }),
    contacts: model.hasMany(() => EngagementContact, {
      mappedBy: "organization",
    }),
    enrollments: model.hasMany(() => EngagementEnrollment, {
      mappedBy: "organization",
    }),
  })
  .indexes([
    { on: ["company_name"] },
    { on: ["sales_model"] },
    { on: ["outreach_status"] },
    { on: ["source"] },
    { on: ["import_batch_id"] },
    { on: ["converted_seller_id"] },
  ])

export default EngagementOrganization
