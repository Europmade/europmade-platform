import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260910180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "brand" add column if not exists "page_draft" jsonb not null default '{}', add column if not exists "page_review_status" text not null default 'draft', add column if not exists "page_submitted_by_seller_id" text null, add column if not exists "page_review_note" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "brand" drop column if exists "page_draft", drop column if exists "page_review_status", drop column if exists "page_submitted_by_seller_id", drop column if exists "page_review_note";`
    )
  }
}
