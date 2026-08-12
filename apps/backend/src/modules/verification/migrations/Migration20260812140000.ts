import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Sprint 8 — Made in Europe-velden + facility-koppeling op product_origin. */
export class Migration20260812140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "product_origin" add column if not exists "production_facility_id" text null, add column if not exists "assembly_eu_band" text null, add column if not exists "parts_eu_level" text null, add column if not exists "materials_eu_level" text null, add column if not exists "primary_assembly_country" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_origin_facility" ON "product_origin" ("production_facility_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_origin_facility";`)
    this.addSql(
      `alter table if exists "product_origin" drop column if exists "production_facility_id", drop column if exists "assembly_eu_band", drop column if exists "parts_eu_level", drop column if exists "materials_eu_level", drop column if exists "primary_assembly_country";`
    )
  }
}
