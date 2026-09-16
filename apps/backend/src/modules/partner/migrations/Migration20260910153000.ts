import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260910153000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "brand" add column if not exists "created_by_seller_id" text null, add column if not exists "public_page_status" text check ("public_page_status" in ('unpublished', 'published')) not null default 'unpublished';`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_created_by_seller_id" ON "brand" ("created_by_seller_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_public_page_status" ON "brand" ("public_page_status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `update "brand" set "public_page_status" = 'published' where deleted_at is null and owner_company_id is not null;`
    )

    this.addSql(
      `create table if not exists "brand_ownership_claim" ("id" text not null, "brand_id" text not null, "seller_id" text not null, "company_id" text not null, "evidence_file_id" text null, "evidence_url" text null, "evidence_note" text null, "status" text check ("status" in ('Ingediend', 'In beoordeling', 'Aanvullende informatie vereist', 'Goedgekeurd', 'Afgekeurd')) not null, "review_note" text null, "reviewed_by" text null, "reviewed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_ownership_claim_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_ownership_claim_brand_id" ON "brand_ownership_claim" ("brand_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_ownership_claim_seller_id" ON "brand_ownership_claim" ("seller_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_ownership_claim_status" ON "brand_ownership_claim" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_ownership_claim_company_id" ON "brand_ownership_claim" ("company_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_ownership_claim_deleted_at" ON "brand_ownership_claim" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "brand_ownership_claim" cascade;`)
    this.addSql(
      `alter table if exists "brand" drop column if exists "created_by_seller_id", drop column if exists "public_page_status";`
    )
  }
}
