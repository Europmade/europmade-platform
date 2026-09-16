import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * P2 correction — temporary promo price on cc_price.
 */
export class Migration20260816160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "cc_price" add column if not exists "promo_price" numeric null;`
    )
    this.addSql(
      `alter table if exists "cc_price" add column if not exists "raw_promo_price" jsonb null;`
    )
    this.addSql(
      `alter table if exists "cc_price" add column if not exists "promo_starts_at" timestamptz null;`
    )
    this.addSql(
      `alter table if exists "cc_price" add column if not exists "promo_ends_at" timestamptz null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "cc_price" drop column if exists "promo_ends_at";`
    )
    this.addSql(
      `alter table if exists "cc_price" drop column if exists "promo_starts_at";`
    )
    this.addSql(
      `alter table if exists "cc_price" drop column if exists "raw_promo_price";`
    )
    this.addSql(
      `alter table if exists "cc_price" drop column if exists "promo_price";`
    )
  }
}
