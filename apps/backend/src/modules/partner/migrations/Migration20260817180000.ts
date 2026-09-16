import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** P2.6 — split BRAND_OWNER / PRODUCER while keeping is_producer_or_brand_owner. */
export class Migration20260817180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "seller" add column if not exists "is_brand_owner" boolean not null default false, add column if not exists "is_producer" boolean not null default false;`
    )
    this.addSql(
      `update "seller" set "is_brand_owner" = true, "is_producer" = true where "is_producer_or_brand_owner" = true and "is_brand_owner" = false and "is_producer" = false;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "seller" drop column if exists "is_brand_owner", drop column if exists "is_producer";`
    )
  }
}
