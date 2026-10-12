import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Taal, fout en claim op de bestaande communication history.
 * Bestaande rijen blijven queued of stopped. Er wordt niets verzonden.
 */
export class Migration20261009140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "engagement_communication_event" add column if not exists "locale" text null;`
    )
    this.addSql(
      `alter table if exists "engagement_communication_event" add column if not exists "delivery_error" text null;`
    )
    this.addSql(
      `alter table if exists "engagement_communication_event" add column if not exists "attempt_count" integer not null default 0;`
    )
    this.addSql(
      `alter table if exists "engagement_communication_event" add column if not exists "delivery_claim" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "engagement_communication_event" drop column if exists "delivery_claim";`
    )
    this.addSql(
      `alter table if exists "engagement_communication_event" drop column if exists "attempt_count";`
    )
    this.addSql(
      `alter table if exists "engagement_communication_event" drop column if exists "delivery_error";`
    )
    this.addSql(
      `alter table if exists "engagement_communication_event" drop column if exists "locale";`
    )
  }
}
