import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260910161000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "brand" add column if not exists "hero_image_url" text null, add column if not exists "story_title" text null, add column if not exists "story_image_url" text null, add column if not exists "page_document" jsonb not null default '{}';`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "brand" drop column if exists "hero_image_url", drop column if exists "story_title", drop column if exists "story_image_url", drop column if exists "page_document";`
    )
  }
}
