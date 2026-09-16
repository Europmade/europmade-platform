import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260911140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "cms_commercial_nav_rank" (
        "id" text NOT NULL,
        "mode" text NOT NULL DEFAULT 'product_count',
        "ordered_keys" jsonb NOT NULL DEFAULT '[]',
        "visitor_counts" jsonb NOT NULL DEFAULT '{}',
        "featured_product_ids" jsonb NOT NULL DEFAULT '{}',
        "computed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "cms_commercial_nav_rank_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "cms_commercial_nav_visit" (
        "id" text NOT NULL,
        "session_hash" text NOT NULL,
        "category_key" text NOT NULL,
        "visited_on" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "cms_commercial_nav_visit_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_commercial_nav_visit_unique"
      ON "cms_commercial_nav_visit" ("session_hash", "category_key", "visited_on")
      WHERE "deleted_at" IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_commercial_nav_visit_day"
      ON "cms_commercial_nav_visit" ("visited_on")
      WHERE "deleted_at" IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_commercial_nav_visit_key"
      ON "cms_commercial_nav_visit" ("category_key")
      WHERE "deleted_at" IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "cms_commercial_nav_visit" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "cms_commercial_nav_rank" CASCADE;`)
  }
}
