import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260731140100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "commission" ("id" text not null, "recipient_type" text check ("recipient_type" in ('Platform', 'Seller', 'Affiliate')) not null, "order_id" text null, "conversion_id" text null, "amount" numeric not null, "raw_amount" jsonb not null, "percentage" real not null, "status" text check ("status" in ('Toegekend', 'Teruggedraaid')) not null default 'Toegekend', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "commission_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_commission_order_id" ON "commission" ("order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_commission_conversion_id" ON "commission" ("conversion_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_commission_recipient_type" ON "commission" ("recipient_type") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "commission" cascade;`)
  }
}
