import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Onderwerpen van de consumentennieuwsbrief op de bestaande consument.
 * Geen tweede preference-tabel: EngagementPreference hoort bij een zakelijk contact.
 */
export class Migration20261008110000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "engagement_consumer" add column if not exists "newsletter_topics" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "engagement_consumer" drop column if exists "newsletter_topics";`
    )
  }
}
