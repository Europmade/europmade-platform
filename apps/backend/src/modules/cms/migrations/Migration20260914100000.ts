import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260914100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "cms_commercial_nav_icon" (
        "id" text NOT NULL,
        "category_key" text NOT NULL,
        "storage_reference" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "cms_commercial_nav_icon_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_commercial_nav_icon_key_unique"
      ON "cms_commercial_nav_icon" ("category_key")
      WHERE "deleted_at" IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "cms_commercial_nav_icon" CASCADE;`)
  }
}
