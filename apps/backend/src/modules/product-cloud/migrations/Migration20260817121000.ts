import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** P2.3 — persistent seller-defined product photo order. */
export class Migration20260817121000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "pc_media" add column if not exists "sort_order" integer not null default 0;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "pc_media" drop column if exists "sort_order";`
    )
  }
}
