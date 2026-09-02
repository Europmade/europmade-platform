import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Product media — metadata JSON for variants, video embed, alpha. */
export class Migration20260902160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "pc_media" add column if not exists "metadata" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "pc_media" drop column if exists "metadata";`
    )
  }
}
