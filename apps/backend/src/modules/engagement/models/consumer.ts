import { model } from "@medusajs/framework/utils"

/**
 * Consument — eindklant of nieuwsbriefinschrijver.
 *
 * Canonical account blijft Medusa Customer (`customer_id`, soft ref, geen FK).
 * Deze rij is de engagement-persoon voor marketing naar consumenten.
 * Eén genormaliseerd e-mailadres, één rij. Geen Organization en geen Prospect.
 *
 * EngagementPreference/Suppression horen bij een zakelijk Contact op een
 * Organization. Die tabellen kunnen een consument niet dragen zonder een
 * prospect aan te maken. De nieuwsbriefvoorkeuren staan daarom op deze rij:
 * newsletter_enabled is de algemene status, newsletter_topics de drie soorten.
 * Uitschrijven verwijdert de persoon niet.
 */
const EngagementConsumer = model
  .define("engagement_consumer", {
    id: model.id({ prefix: "econ" }).primaryKey(),
    email: model.text(),
    name: model.text().nullable(),
    country_code: model.text().nullable(),
    locale: model.text().nullable(),
    customer_id: model.text().nullable(),
    source: model.text(),
    newsletter_enabled: model.boolean().default(false),
    newsletter_topics: model.json().nullable(),
    subscribed_at: model.dateTime().nullable(),
    unsubscribed_at: model.dateTime().nullable(),
    unsubscribe_token: model.text(),
  })
  .indexes([
    {
      on: ["email"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      on: ["customer_id"],
      unique: true,
      where: "customer_id IS NOT NULL AND deleted_at IS NULL",
    },
    {
      on: ["unsubscribe_token"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["newsletter_enabled"] },
  ])

export default EngagementConsumer
