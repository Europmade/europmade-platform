import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * P2.25-B1 — Advertising schema sync.
 *
 * Fixes CREATE TABLE IF NOT EXISTS drift from Migration20260819120000
 * (headline/cta/design missing on pre-existing tables) and adds Medusa
 * bigNumber raw_* columns used elsewhere in this repo as
 * {"value": "<numeric>", "precision": 20}.
 *
 * Safe / additive only: ADD COLUMN IF NOT EXISTS + NULL-only raw backfill.
 * Does not delete rows, change statuses, or recompute prices.
 */
export class Migration20260820150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE IF EXISTS "ad_campaign"
        ADD COLUMN IF NOT EXISTS "headline" TEXT NULL,
        ADD COLUMN IF NOT EXISTS "subline" TEXT NULL,
        ADD COLUMN IF NOT EXISTS "cta_key" TEXT NOT NULL DEFAULT 'view_product',
        ADD COLUMN IF NOT EXISTS "design_key" TEXT NOT NULL DEFAULT 'design_1',
        ADD COLUMN IF NOT EXISTS "raw_total_price" JSONB NULL;
    `)

    this.addSql(`
      UPDATE "ad_campaign"
      SET "raw_total_price" = jsonb_build_object(
        'value', "total_price"::text,
        'precision', 20
      )
      WHERE "raw_total_price" IS NULL;
    `)

    this.addSql(`
      ALTER TABLE IF EXISTS "ad_campaign_week"
        ADD COLUMN IF NOT EXISTS "raw_week_price" JSONB NULL;
    `)

    this.addSql(`
      UPDATE "ad_campaign_week"
      SET "raw_week_price" = jsonb_build_object(
        'value', "week_price"::text,
        'precision', 20
      )
      WHERE "raw_week_price" IS NULL;
    `)

    this.addSql(`
      ALTER TABLE IF EXISTS "ad_pricing"
        ADD COLUMN IF NOT EXISTS "raw_weekly_price" JSONB NULL;
    `)

    this.addSql(`
      UPDATE "ad_pricing"
      SET "raw_weekly_price" = jsonb_build_object(
        'value', "weekly_price"::text,
        'precision', 20
      )
      WHERE "raw_weekly_price" IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE IF EXISTS "ad_campaign"
        DROP COLUMN IF EXISTS "headline",
        DROP COLUMN IF EXISTS "subline",
        DROP COLUMN IF EXISTS "cta_key",
        DROP COLUMN IF EXISTS "design_key",
        DROP COLUMN IF EXISTS "raw_total_price";
    `)
    this.addSql(`
      ALTER TABLE IF EXISTS "ad_campaign_week"
        DROP COLUMN IF EXISTS "raw_week_price";
    `)
    this.addSql(`
      ALTER TABLE IF EXISTS "ad_pricing"
        DROP COLUMN IF EXISTS "raw_weekly_price";
    `)
  }
}
