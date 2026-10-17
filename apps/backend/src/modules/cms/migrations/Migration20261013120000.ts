import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261013120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE IF EXISTS "cms_banner"
      ADD COLUMN IF NOT EXISTS "presentation" jsonb NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE IF EXISTS "cms_banner"
      DROP COLUMN IF EXISTS "presentation";
    `)
  }
}
