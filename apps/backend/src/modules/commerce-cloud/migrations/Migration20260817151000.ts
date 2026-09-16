import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** P2.4 — market-specific extra delivery/handling cost (not a second base price). */
export class Migration20260817151000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "cc_price" add column if not exists "extra_delivery_cost" numeric null, add column if not exists "raw_extra_delivery_cost" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "cc_price" drop column if exists "extra_delivery_cost", drop column if exists "raw_extra_delivery_cost";`
    )
  }
}
