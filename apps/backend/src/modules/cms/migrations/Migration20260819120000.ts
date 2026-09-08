import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260819120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "ad_campaign" (
        "id"              TEXT NOT NULL,
        "seller_id"       TEXT NOT NULL,
        "name"            TEXT NOT NULL,
        "placement"       TEXT NOT NULL,
        "target_type"     TEXT NOT NULL,
        "target_value"    TEXT,
        "markets"         JSONB NOT NULL DEFAULT '[]',
        "image_url"       TEXT,
        "destination_url" TEXT NOT NULL,
        "headline"        TEXT,
        "subline"         TEXT,
        "cta_key"         TEXT NOT NULL DEFAULT 'view_product',
        "design_key"      TEXT NOT NULL DEFAULT 'design_1',
        "status"          TEXT NOT NULL DEFAULT 'draft',
        "total_price"     NUMERIC NOT NULL DEFAULT 0,
        "admin_note"      TEXT,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"      TIMESTAMPTZ,
        CONSTRAINT "ad_campaign_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ad_campaign_seller" ON "ad_campaign" ("seller_id") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ad_campaign_status" ON "ad_campaign" ("status") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ad_campaign_placement" ON "ad_campaign" ("placement") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ad_campaign_deleted_at" ON "ad_campaign" ("deleted_at") WHERE "deleted_at" IS NULL;`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "ad_campaign_week" (
        "id"            TEXT NOT NULL,
        "campaign_id"   TEXT NOT NULL,
        "placement"     TEXT NOT NULL,
        "target_type"   TEXT NOT NULL,
        "target_value"  TEXT,
        "market_code"   TEXT NOT NULL,
        "week_start"    TIMESTAMPTZ NOT NULL,
        "week_end"      TIMESTAMPTZ NOT NULL,
        "week_price"    NUMERIC NOT NULL DEFAULT 0,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMPTZ,
        CONSTRAINT "ad_campaign_week_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_adwk_campaign" ON "ad_campaign_week" ("campaign_id") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_adwk_placement_market_week" ON "ad_campaign_week" ("placement", "market_code", "week_start") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_adwk_deleted_at" ON "ad_campaign_week" ("deleted_at") WHERE "deleted_at" IS NULL;`)
    // Unique constraint prevents double-booking (only for non-cancelled campaigns)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_adwk_slot"
      ON "ad_campaign_week" ("placement", COALESCE("target_type",''), COALESCE("target_value",''), "market_code", "week_start")
      WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "ad_pricing" (
        "id"             TEXT NOT NULL,
        "placement"      TEXT NOT NULL,
        "market_code"    TEXT NOT NULL DEFAULT '*',
        "target_type"    TEXT NOT NULL DEFAULT '*',
        "weekly_price"   NUMERIC NOT NULL,
        "currency_code"  TEXT NOT NULL DEFAULT 'EUR',
        "is_active"      BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"     TIMESTAMPTZ,
        CONSTRAINT "ad_pricing_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ad_pricing_lookup" ON "ad_pricing" ("placement", "market_code", "target_type") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ad_pricing_deleted_at" ON "ad_pricing" ("deleted_at") WHERE "deleted_at" IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "ad_pricing" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "ad_campaign_week" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "ad_campaign" CASCADE;`)
  }
}
