import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Vastgelegde offer/seller op een reeds berekende commissie. */
export class Migration20261008170200 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "commission" add column if not exists "offer_id" text null;`
    )
    this.addSql(
      `alter table if exists "commission" add column if not exists "seller_id" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "commission" drop column if exists "offer_id";`)
    this.addSql(`alter table if exists "commission" drop column if exists "seller_id";`)
  }
}
