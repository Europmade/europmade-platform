import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Standalone product link groups (MODEL B).
 * proposed/active/rejected on the same group — no variant engine, no family/relation reuse.
 */
export class Migration20260916180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "pc_product_link_group" (
        "id" text not null,
        "name" text not null,
        "dimensions" jsonb not null default '[]',
        "status" text check ("status" in ('proposed', 'active', 'rejected')) not null default 'proposed',
        "submitter_seller_id" text not null,
        "note" text null,
        "decision_reason" text null,
        "decided_by" text null,
        "decided_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "pc_product_link_group_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_product_link_group_submitter" ON "pc_product_link_group" ("submitter_seller_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_product_link_group_status" ON "pc_product_link_group" ("status") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "pc_product_link_member" (
        "id" text not null,
        "group_id" text not null,
        "product_id" text not null,
        "values" jsonb not null default '{}',
        "values_key" text not null,
        "sort_order" integer not null default 0,
        "is_active_slot" boolean not null default false,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "pc_product_link_member_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pc_product_link_member_group_product_unique" ON "pc_product_link_member" ("group_id", "product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pc_product_link_member_group_values_unique" ON "pc_product_link_member" ("group_id", "values_key") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pc_product_link_member_one_active_slot" ON "pc_product_link_member" ("product_id") WHERE deleted_at IS NULL AND is_active_slot = true;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_product_link_member_product_id" ON "pc_product_link_member" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_product_link_member_group_id" ON "pc_product_link_member" ("group_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "pc_product_link_member" add constraint "pc_product_link_member_group_id_foreign" foreign key ("group_id") references "pc_product_link_group" ("id") on update cascade on delete cascade;`
    )
    this.addSql(
      `alter table if exists "pc_product_link_member" add constraint "pc_product_link_member_product_id_foreign" foreign key ("product_id") references "pc_product" ("id") on update cascade;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "pc_product_link_member" drop constraint if exists "pc_product_link_member_product_id_foreign";`
    )
    this.addSql(
      `alter table if exists "pc_product_link_member" drop constraint if exists "pc_product_link_member_group_id_foreign";`
    )
    this.addSql(`drop table if exists "pc_product_link_member" cascade;`)
    this.addSql(`drop table if exists "pc_product_link_group" cascade;`)
  }
}
