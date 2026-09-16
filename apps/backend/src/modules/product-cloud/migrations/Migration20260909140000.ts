import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Admin product section reviews + product-level admin_review_outcome. */
export class Migration20260909140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "product_version" add column if not exists "admin_review_outcome" text null check ("admin_review_outcome" in ('needs_info', 'rejected', 'approved'));`
    )

    this.addSql(`
      create table if not exists "pc_section_review" (
        "id" text not null,
        "product_id" text not null,
        "product_version_id" text null,
        "section_key" text check ("section_key" in ('product_info', 'seller', 'media', 'made_in_europe', 'ce_compliance', 'content', 'claims', 'other')) not null,
        "status" text check ("status" in ('unreviewed', 'ok', 'needs_info', 'rejected')) not null,
        "comment" text null,
        "decided_by" text null,
        "decided_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "pc_section_review_pkey" primary key ("id")
      );
    `)

    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pc_section_review_product_section_unique" ON "pc_section_review" ("product_id", "section_key") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_section_review_product_id" ON "pc_section_review" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_section_review_status" ON "pc_section_review" ("status") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pc_section_review" cascade;`)
    this.addSql(
      `alter table if exists "product_version" drop column if exists "admin_review_outcome";`
    )
  }
}
