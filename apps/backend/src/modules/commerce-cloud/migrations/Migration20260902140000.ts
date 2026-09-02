import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Sprint 3B 2.0 — extend shipping profiles + product link. */
export class Migration20260902140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "cc_shipping_profile"
        add column if not exists "description" text null,
        add column if not exists "status" text check ("status" in ('draft','active','inactive')) not null default 'draft',
        add column if not exists "processing_settings" jsonb not null default '{}',
        add column if not exists "carrier_mode" text check ("carrier_mode" in ('own','carrier')) not null default 'own',
        add column if not exists "carrier_ref" jsonb null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cc_shipping_profile_seller_status" ON "cc_shipping_profile" ("seller_id", "status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "pc_product" add column if not exists "shipping_profile_id" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_product_shipping_profile_id" ON "pc_product" ("shipping_profile_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_pc_product_shipping_profile_id";`)
    this.addSql(
      `alter table if exists "pc_product" drop column if exists "shipping_profile_id";`
    )
    this.addSql(`DROP INDEX IF EXISTS "IDX_cc_shipping_profile_seller_status";`)
    this.addSql(
      `alter table if exists "cc_shipping_profile"
        drop column if exists "description",
        drop column if exists "status",
        drop column if exists "processing_settings",
        drop column if exists "carrier_mode",
        drop column if exists "carrier_ref";`
    )
  }
}
