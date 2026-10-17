import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261015110000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE IF EXISTS "ad_campaign"
      ADD COLUMN IF NOT EXISTS "logo_url" text NULL;
    `)
    this.addSql(`
      ALTER TABLE IF EXISTS "ad_campaign"
      ADD COLUMN IF NOT EXISTS "banner_presentation" jsonb NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE IF EXISTS "ad_campaign"
      DROP COLUMN IF EXISTS "banner_presentation";
    `)
    this.addSql(`
      ALTER TABLE IF EXISTS "ad_campaign"
      DROP COLUMN IF EXISTS "logo_url";
    `)
  }
}
