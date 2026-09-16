import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** P2.3 — structured facility address fields (backward compatible with region/description). */
export class Migration20260817140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "production_facility" add column if not exists "street" text null, add column if not exists "house_number" text null, add column if not exists "postal_code" text null, add column if not exists "city" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "production_facility" drop column if exists "street", drop column if exists "house_number", drop column if exists "postal_code", drop column if exists "city";`
    )
  }
}
