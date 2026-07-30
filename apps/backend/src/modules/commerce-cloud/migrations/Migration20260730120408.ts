import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260730120408 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "buy_box_computation" drop constraint if exists "buy_box_computation_identifier_region_unique";`);
    this.addSql(`create table if not exists "buy_box_computation" ("id" text not null, "identifier_id" text not null, "region_code" text not null, "winning_offer_id" text not null, "computed_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "buy_box_computation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buy_box_computation_deleted_at" ON "buy_box_computation" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_buy_box_computation_identifier_region_unique" ON "buy_box_computation" ("identifier_id", "region_code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buy_box_computation_identifier_id" ON "buy_box_computation" ("identifier_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buy_box_computation_region_code" ON "buy_box_computation" ("region_code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buy_box_computation_winning_offer_id" ON "buy_box_computation" ("winning_offer_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "buy_box_weighting" ("id" text not null, "price" real not null, "delivery" real not null, "seller_review" real not null, "stock" real not null, "performance" real not null, "returns" real not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "buy_box_weighting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buy_box_weighting_deleted_at" ON "buy_box_weighting" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "buy_box_computation" cascade;`);

    this.addSql(`drop table if exists "buy_box_weighting" cascade;`);
  }

}
