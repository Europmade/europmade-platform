import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260827160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "cms_product" (
        "id" text NOT NULL,
        "product_id" text NOT NULL,
        "document" jsonb NOT NULL DEFAULT '{}',
        "published" boolean NOT NULL DEFAULT false,
        "i18n_meta" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "cms_product_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_product_product_id_unique"
      ON "cms_product" ("product_id")
      WHERE "deleted_at" IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_product_published"
      ON "cms_product" ("published")
      WHERE "deleted_at" IS NULL;
    `)
    this.addSql(`
      ALTER TABLE IF EXISTS "cms_page"
        ADD COLUMN IF NOT EXISTS "document" jsonb NOT NULL DEFAULT '{}';
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "cms_product" CASCADE;`)
    this.addSql(`
      ALTER TABLE IF EXISTS "cms_page"
        DROP COLUMN IF EXISTS "document";
    `)
  }
}
