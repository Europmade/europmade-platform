import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260812180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "cms_homepage" ("id" text not null, "document_key" text not null default 'default', "document" jsonb not null, "seo_title" jsonb null, "seo_description" jsonb null, "seo_canonical" text null, "og_title" jsonb null, "og_description" jsonb null, "published" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cms_homepage_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_homepage_document_key" ON "cms_homepage" ("document_key") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cms_homepage_deleted_at" ON "cms_homepage" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "cms_banner" ("id" text not null, "position" integer not null default 1, "location" text not null default 'homepage', "title" jsonb not null, "subtitle" jsonb not null, "cta_label" jsonb not null, "destination_url" text not null, "link_type" text not null default 'category', "image_url" text null, "image_alt" jsonb not null, "background" text null, "logo_url" text null, "market_scope" text not null default 'all', "markets" jsonb not null default '[]', "visible" boolean not null default true, "sort_order" integer not null default 0, "publish_at" timestamptz null, "expires_at" timestamptz null, "published" boolean not null default false, "asset_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cms_banner_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cms_banner_location_position" ON "cms_banner" ("location", "position") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cms_banner_published" ON "cms_banner" ("published") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cms_banner_deleted_at" ON "cms_banner" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "cms_page" ("id" text not null, "slug" text not null, "title" jsonb not null, "body" jsonb not null, "seo_title" jsonb null, "seo_description" jsonb null, "seo_canonical" text null, "published" boolean not null default false, "visible" boolean not null default true, "sort_order" integer not null default 0, "publish_at" timestamptz null, "expires_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cms_page_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_page_slug" ON "cms_page" ("slug") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cms_page_published" ON "cms_page" ("published") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cms_page_deleted_at" ON "cms_page" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "cms_asset" ("id" text not null, "placement" text not null, "storage_reference" text not null, "mime_type" text not null, "original_filename" text null, "size_bytes" integer not null default 0, "width" integer null, "height" integer null, "alt_text" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cms_asset_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cms_asset_placement" ON "cms_asset" ("placement") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cms_asset_deleted_at" ON "cms_asset" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "cms_asset" cascade;`)
    this.addSql(`drop table if exists "cms_page" cascade;`)
    this.addSql(`drop table if exists "cms_banner" cascade;`)
    this.addSql(`drop table if exists "cms_homepage" cascade;`)
  }
}
