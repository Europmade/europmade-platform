import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Seller Product Manager: requirement_tier on attributes + field change history.
 */
export class Migration20260815200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "attribute_definition" add column if not exists "requirement_tier" text check ("requirement_tier" in ('compliance_required', 'category_required', 'recommended', 'optional', 'not_applicable')) not null default 'optional';`
    )

    this.addSql(`create table if not exists "pc_field_change" (
      "id" text not null,
      "product_id" text not null,
      "product_version_id" text null,
      "seller_id" text not null,
      "actor_customer_id" text null,
      "field_code" text not null,
      "field_label" text not null,
      "old_value" text null,
      "new_value" text null,
      "status" text check ("status" in ('current', 'pending', 'approved', 'rejected')) not null,
      "reason" text null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "pc_field_change_pkey" primary key ("id")
    );`)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_field_change_product_id" ON "pc_field_change" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_field_change_product_version_id" ON "pc_field_change" ("product_version_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_field_change_seller_id" ON "pc_field_change" ("seller_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_field_change_field_code" ON "pc_field_change" ("field_code") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "pc_field_change" add constraint "pc_field_change_product_id_foreign" foreign key ("product_id") references "pc_product" ("id") on update cascade on delete cascade;`
    )
    this.addSql(
      `alter table if exists "pc_field_change" add constraint "pc_field_change_product_version_id_foreign" foreign key ("product_version_id") references "product_version" ("id") on update cascade on delete set null;`
    )

    // Backfill: required attrs → category_required
    this.addSql(
      `update "attribute_definition" set "requirement_tier" = 'category_required' where "is_required" = true and "requirement_tier" = 'optional';`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "pc_field_change" drop constraint if exists "pc_field_change_product_version_id_foreign";`
    )
    this.addSql(
      `alter table if exists "pc_field_change" drop constraint if exists "pc_field_change_product_id_foreign";`
    )
    this.addSql(`drop table if exists "pc_field_change" cascade;`)
    this.addSql(
      `alter table if exists "attribute_definition" drop column if exists "requirement_tier";`
    )
  }
}
