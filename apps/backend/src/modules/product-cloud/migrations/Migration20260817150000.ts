import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** P2.4 — attribute help text + active flag; product-level regular price. */
export class Migration20260817150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "attribute_definition" add column if not exists "help_text" text null, add column if not exists "is_active" boolean not null default true;`
    )
    this.addSql(
      `alter table if exists "pc_product" add column if not exists "regular_customer_price" numeric null, add column if not exists "raw_regular_customer_price" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "attribute_definition" drop column if exists "help_text", drop column if exists "is_active";`
    )
    this.addSql(
      `alter table if exists "pc_product" drop column if exists "regular_customer_price", drop column if exists "raw_regular_customer_price";`
    )
  }
}
