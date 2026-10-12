import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Selectiecriteria op een bestaande nieuwsbrief of campagne.
 * Bestaande rijen blijven leeg. Er wordt niets verzonden.
 */
export class Migration20261009130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" add column if not exists "selection_criteria" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" drop column if exists "selection_criteria";`
    )
  }
}
