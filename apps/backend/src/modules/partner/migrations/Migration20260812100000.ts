import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260812100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "brand" add column if not exists "slug" text null, add column if not exists "intro" text null, add column if not exists "story" text null, add column if not exists "website_url" text null, add column if not exists "logo_url" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_slug" ON "brand" ("slug") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "brand_market_content" ("id" text not null, "brand_id" text not null, "country_code" text not null, "intro" text null, "story" text null, "contact_info" text null, "managed_by_company_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_market_content_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_market_content_brand_country" ON "brand_market_content" ("brand_id", "country_code") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_market_content_managed_by" ON "brand_market_content" ("managed_by_company_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "production_facility" ("id" text not null, "brand_id" text not null, "manufacturer_id" text null, "name" text not null, "country_code" text not null, "region" text null, "description" text null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "production_facility_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_production_facility_brand_id" ON "production_facility" ("brand_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_production_facility_manufacturer_id" ON "production_facility" ("manufacturer_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "production_facility" cascade;`)
    this.addSql(`drop table if exists "brand_market_content" cascade;`)
    this.addSql(
      `alter table if exists "brand" drop column if exists "slug", drop column if exists "intro", drop column if exists "story", drop column if exists "website_url", drop column if exists "logo_url";`
    )
  }
}
