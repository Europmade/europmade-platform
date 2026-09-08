import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * P2.25-C — campaign product selection + public destination slugs.
 * Additive only; preserves existing campaigns.
 */
export class Migration20260820160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE IF EXISTS "ad_campaign"
        ADD COLUMN IF NOT EXISTS "product_ids" JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "campaign_slug" TEXT NULL,
        ADD COLUMN IF NOT EXISTS "seller_public_slug" TEXT NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_ad_campaign_public_slugs"
      ON "ad_campaign" ("seller_public_slug", "campaign_slug")
      WHERE "deleted_at" IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_ad_campaign_public_slugs";`)
    this.addSql(`
      ALTER TABLE IF EXISTS "ad_campaign"
        DROP COLUMN IF EXISTS "product_ids",
        DROP COLUMN IF EXISTS "campaign_slug",
        DROP COLUMN IF EXISTS "seller_public_slug";
    `)
  }
}
