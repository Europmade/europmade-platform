import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * P1A — Offer hardening: seller_sku, sales_status (active|paused), delivery_days_max.
 */
export class Migration20260816120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "offer" add column if not exists "seller_sku" text null;`
    )
    this.addSql(
      `alter table if exists "offer" add column if not exists "sales_status" text check ("sales_status" in ('active', 'paused')) not null default 'active';`
    )
    this.addSql(
      `alter table if exists "offer" add column if not exists "delivery_days_max" integer null;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_offer_seller_sku_unique" ON "offer" ("seller_id", "seller_sku") WHERE deleted_at IS NULL AND seller_sku IS NOT NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_offer_sales_status" ON "offer" ("sales_status") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_offer_sales_status";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_offer_seller_sku_unique";`)
    this.addSql(
      `alter table if exists "offer" drop column if exists "delivery_days_max";`
    )
    this.addSql(
      `alter table if exists "offer" drop column if exists "sales_status";`
    )
    this.addSql(
      `alter table if exists "offer" drop column if exists "seller_sku";`
    )
  }
}
