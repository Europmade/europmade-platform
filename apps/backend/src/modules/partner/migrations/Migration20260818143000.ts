import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260818143000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "manufacturer" add column if not exists "contact_phone" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "manufacturer" drop column if exists "contact_phone";`
    )
  }
}
