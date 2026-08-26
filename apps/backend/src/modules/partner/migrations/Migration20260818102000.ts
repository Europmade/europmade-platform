import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260818102000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "manufacturer" add column if not exists "street" text null, add column if not exists "house_number" text null, add column if not exists "postal_code" text null, add column if not exists "city" text null, add column if not exists "country_code" text null, add column if not exists "contact_email" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "manufacturer" drop column if exists "street", drop column if exists "house_number", drop column if exists "postal_code", drop column if exists "city", drop column if exists "country_code", drop column if exists "contact_email";`
    )
  }
}
