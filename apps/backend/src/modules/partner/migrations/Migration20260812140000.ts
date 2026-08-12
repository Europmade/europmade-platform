import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Sprint 8 — Made in Europe-profielvelden op production_facility. */
export class Migration20260812140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "production_facility" add column if not exists "assembly_eu_band" text null, add column if not exists "parts_eu_level" text null, add column if not exists "materials_eu_level" text null, add column if not exists "primary_assembly_country" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "production_facility" drop column if exists "assembly_eu_band", drop column if exists "parts_eu_level", drop column if exists "materials_eu_level", drop column if exists "primary_assembly_country";`
    )
  }
}
