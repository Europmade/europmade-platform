import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Opmaak op het bericht en gekozen startmoment op de automatisering.
 * Geen nieuwe tabel.
 */
export class Migration20261008113000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "communication_template" add column if not exists "layout" text null;`
    )
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" add column if not exists "start_trigger" text null;`
    )
    this.addSql(
      `update "engagement_lifecycle_program" set "start_trigger" = 'seller_onboarded' where "name" = 'Nieuwe verkoper' and "start_trigger" is null and "deleted_at" is null;`
    )
    this.addSql(
      `update "engagement_lifecycle_program" set "start_trigger" = 'first_product' where "name" = 'Eerste product toevoegen' and "start_trigger" is null and "deleted_at" is null;`
    )
    this.addSql(
      `update "engagement_lifecycle_program" set "start_trigger" = 'first_sale' where "name" = 'Eerste verkoop' and "start_trigger" is null and "deleted_at" is null;`
    )
    this.addSql(
      `update "engagement_lifecycle_program" set "start_trigger" = 'product_incomplete' where "name" = 'Productinformatie aanvullen' and "start_trigger" is null and "deleted_at" is null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "communication_template" drop column if exists "layout";`)
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" drop column if exists "start_trigger";`
    )
  }
}
