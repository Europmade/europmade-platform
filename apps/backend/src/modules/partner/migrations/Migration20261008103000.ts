import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261008103000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "seller" add column if not exists "communication_preferences" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "seller" drop column if exists "communication_preferences";`
    )
  }
}
