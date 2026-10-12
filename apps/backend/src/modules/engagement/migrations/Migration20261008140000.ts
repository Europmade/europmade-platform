import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Gepland startmoment op bericht en automatisering.
 * Geen nieuwe tabel en geen verzending.
 */
export class Migration20261008140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "communication_template" add column if not exists "scheduled_at" text null;`
    )
    this.addSql(
      `alter table if exists "communication_template" add column if not exists "schedule_timezone" text null;`
    )
    this.addSql(
      `alter table if exists "communication_template" add column if not exists "schedule_status" text null;`
    )
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" add column if not exists "start_mode" text null;`
    )
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" add column if not exists "scheduled_at" text null;`
    )
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" add column if not exists "schedule_timezone" text null;`
    )
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" add column if not exists "audience" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "communication_template" drop column if exists "scheduled_at";`
    )
    this.addSql(
      `alter table if exists "communication_template" drop column if exists "schedule_timezone";`
    )
    this.addSql(
      `alter table if exists "communication_template" drop column if exists "schedule_status";`
    )
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" drop column if exists "start_mode";`
    )
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" drop column if exists "scheduled_at";`
    )
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" drop column if exists "schedule_timezone";`
    )
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" drop column if exists "audience";`
    )
  }
}
