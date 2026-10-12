import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Offer en seller op de bestaande affiliate-link. */
export class Migration20261008170100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "affiliate_link" add column if not exists "product_id" text null;`
    )
    this.addSql(
      `alter table if exists "affiliate_link" add column if not exists "offer_id" text null;`
    )
    this.addSql(
      `alter table if exists "affiliate_link" add column if not exists "seller_id" text null;`
    )
    this.addSql(
      `alter table if exists "affiliate_link" add column if not exists "commission_percent_snapshot" real null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "affiliate_link" drop column if exists "product_id";`)
    this.addSql(`alter table if exists "affiliate_link" drop column if exists "offer_id";`)
    this.addSql(`alter table if exists "affiliate_link" drop column if exists "seller_id";`)
    this.addSql(
      `alter table if exists "affiliate_link" drop column if exists "commission_percent_snapshot";`
    )
  }
}
