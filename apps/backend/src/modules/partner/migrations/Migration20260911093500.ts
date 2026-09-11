import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260911093500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "seller" add column if not exists "logo_url" text null;`
    )
    this.addSql(
      `alter table if exists "seller" add column if not exists "banner_url" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "seller" drop column if exists "logo_url", drop column if exists "banner_url";`
    )
  }
}
