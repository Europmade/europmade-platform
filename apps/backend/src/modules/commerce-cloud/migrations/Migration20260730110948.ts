import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260730110948 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "cc_inventory" drop constraint if exists "cc_inventory_offer_id_unique";`);
    this.addSql(`alter table if exists "cc_price" drop constraint if exists "cc_price_offer_id_unique";`);
    this.addSql(`alter table if exists "offer" drop constraint if exists "offer_seller_identifier_region_unique";`);
    this.addSql(`create table if not exists "offer" ("id" text not null, "seller_id" text not null, "identifier_id" text not null, "region_code" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "offer_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_deleted_at" ON "offer" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_offer_seller_identifier_region_unique" ON "offer" ("seller_id", "identifier_id", "region_code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_seller_id" ON "offer" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_identifier_id" ON "offer" ("identifier_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_offer_region_code" ON "offer" ("region_code") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "cc_price" ("id" text not null, "offer_id" text not null, "base_price" numeric not null, "shipping_cost" numeric not null, "vat_rate" real not null, "raw_base_price" jsonb not null, "raw_shipping_cost" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cc_price_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cc_price_offer_id_unique" ON "cc_price" ("offer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cc_price_deleted_at" ON "cc_price" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "cc_inventory" ("id" text not null, "offer_id" text not null, "quantity_available" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cc_inventory_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cc_inventory_offer_id_unique" ON "cc_inventory" ("offer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cc_inventory_deleted_at" ON "cc_inventory" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "cc_price" add constraint "cc_price_offer_id_foreign" foreign key ("offer_id") references "offer" ("id") on update cascade;`);

    this.addSql(`alter table if exists "cc_inventory" add constraint "cc_inventory_offer_id_foreign" foreign key ("offer_id") references "offer" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "cc_price" drop constraint if exists "cc_price_offer_id_foreign";`);

    this.addSql(`alter table if exists "cc_inventory" drop constraint if exists "cc_inventory_offer_id_foreign";`);

    this.addSql(`drop table if exists "offer" cascade;`);

    this.addSql(`drop table if exists "cc_price" cascade;`);

    this.addSql(`drop table if exists "cc_inventory" cascade;`);
  }

}
