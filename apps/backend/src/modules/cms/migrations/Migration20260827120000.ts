import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * CMS editorial layer: category documents + i18n origin metadata.
 */
export class Migration20260827120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "cms_category" (
        "id" text NOT NULL,
        "category_slug" text NOT NULL,
        "document" jsonb NOT NULL DEFAULT '{}',
        "published" boolean NOT NULL DEFAULT false,
        "i18n_meta" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "cms_category_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_category_slug_unique"
      ON "cms_category" ("category_slug")
      WHERE "deleted_at" IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_category_published"
      ON "cms_category" ("published")
      WHERE "deleted_at" IS NULL;
    `)
    this.addSql(`
      ALTER TABLE IF EXISTS "cms_page"
        ADD COLUMN IF NOT EXISTS "i18n_meta" jsonb NULL,
        ADD COLUMN IF NOT EXISTS "cover_url" text NULL;
    `)
    this.addSql(`
      ALTER TABLE IF EXISTS "cms_banner"
        ADD COLUMN IF NOT EXISTS "i18n_meta" jsonb NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "cms_category" CASCADE;`)
    this.addSql(`
      ALTER TABLE IF EXISTS "cms_page"
        DROP COLUMN IF EXISTS "i18n_meta",
        DROP COLUMN IF EXISTS "cover_url";
    `)
    this.addSql(`
      ALTER TABLE IF EXISTS "cms_banner"
        DROP COLUMN IF EXISTS "i18n_meta";
    `)
  }
}
