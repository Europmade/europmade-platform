import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Sprint 3B — seller shipping profiles + offer link. */
export class Migration20260902120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "cc_shipping_profile" (
        "id" text not null,
        "seller_id" text not null,
        "name" text not null,
        "country_rates" jsonb not null default '{}',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "cc_shipping_profile_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cc_shipping_profile_seller_id" ON "cc_shipping_profile" ("seller_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cc_shipping_profile_seller_name_unique" ON "cc_shipping_profile" ("seller_id", "name") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "offer" add column if not exists "shipping_profile_id" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_offer_shipping_profile_id" ON "offer" ("shipping_profile_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_offer_shipping_profile_id";`)
    this.addSql(
      `alter table if exists "offer" drop column if exists "shipping_profile_id";`
    )
    this.addSql(`DROP INDEX IF EXISTS "IDX_cc_shipping_profile_seller_name_unique";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_cc_shipping_profile_seller_id";`)
    this.addSql(`drop table if exists "cc_shipping_profile" cascade;`)
  }
}
