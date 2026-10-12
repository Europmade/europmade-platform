import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Seller-affiliatecommissie op de bestaande seller. Geen nieuwe producttabel. */
export class Migration20261008170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "seller" add column if not exists "affiliate_commission_settings" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "seller" drop column if exists "affiliate_commission_settings";`
    )
  }
}
