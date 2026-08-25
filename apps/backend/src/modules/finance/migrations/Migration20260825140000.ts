import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * G3 — seller_settlement + koppeling seller_invoice.settlement_id.
 */
export class Migration20260825140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "seller_settlement" (
        "id" text not null,
        "seller_id" text not null,
        "period_start" timestamptz not null,
        "period_end" timestamptz not null,
        "status" text check ("status" in ('open', 'closed')) not null default 'closed',
        "closed_at" timestamptz null,
        "invoice_id" text null,
        "payout_id" text null,
        "currency" text not null default 'EUR',
        "gross_sales" numeric not null default 0,
        "raw_gross_sales" jsonb not null,
        "refunds" numeric not null default 0,
        "raw_refunds" jsonb not null,
        "net_sales" numeric not null default 0,
        "raw_net_sales" jsonb not null,
        "platform_commission" numeric not null default 0,
        "raw_platform_commission" jsonb not null,
        "advertising_amount" numeric not null default 0,
        "raw_advertising_amount" jsonb not null,
        "banner_amount" numeric not null default 0,
        "raw_banner_amount" jsonb not null,
        "other_services_amount" numeric not null default 0,
        "raw_other_services_amount" jsonb not null,
        "credits_amount" numeric not null default 0,
        "raw_credits_amount" jsonb not null,
        "invoice_total" numeric not null default 0,
        "raw_invoice_total" jsonb not null,
        "amount_before_payout" numeric not null default 0,
        "raw_amount_before_payout" jsonb not null,
        "net_settlement" numeric not null default 0,
        "raw_net_settlement" jsonb not null,
        "snapshot" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "seller_settlement_pkey" primary key ("id")
      );
    `)

    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_settlement_seller_period_unique" ON "seller_settlement" ("seller_id", "period_start", "period_end") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_seller_settlement_seller_id" ON "seller_settlement" ("seller_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_seller_settlement_status" ON "seller_settlement" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_seller_settlement_invoice_id" ON "seller_settlement" ("invoice_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `ALTER TABLE "seller_invoice" ADD COLUMN IF NOT EXISTS "settlement_id" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_seller_invoice_settlement_id" ON "seller_invoice" ("settlement_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_seller_invoice_settlement_id";`
    )
    this.addSql(
      `ALTER TABLE "seller_invoice" DROP COLUMN IF EXISTS "settlement_id";`
    )
    this.addSql(`drop table if exists "seller_settlement" cascade;`)
  }
}
