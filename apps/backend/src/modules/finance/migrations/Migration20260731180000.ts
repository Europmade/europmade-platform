import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * S3-08-01 — G.7 invoice + G.8 payout (ADR-0034 soft fields).
 * SQL gesplitst per statement om quoting-problemen te vermijden.
 */
export class Migration20260731180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "invoice" (
        "id" text not null,
        "invoice_type" text check ("invoice_type" in ('Klant-factuur', 'Seller-commissiefactuur')) not null,
        "order_id" text null,
        "seller_id" text null,
        "vat_breakdown" jsonb not null,
        "amount_excl_vat" numeric not null,
        "raw_amount_excl_vat" jsonb not null,
        "total_amount" numeric not null,
        "raw_total_amount" jsonb not null,
        "pdf_url" text null,
        "issued_at" timestamptz not null,
        "credit_of_invoice_id" text null,
        "period" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "invoice_pkey" primary key ("id")
      );
    `)

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_invoice_order_id" ON "invoice" ("order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_invoice_seller_id" ON "invoice" ("seller_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_invoice_invoice_type" ON "invoice" ("invoice_type") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_invoice_credit_of_invoice_id" ON "invoice" ("credit_of_invoice_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "payout" (
        "id" text not null,
        "recipient_type" text check ("recipient_type" in ('Seller', 'Affiliate')) not null,
        "seller_id" text null,
        "affiliate_id" text null,
        "amount" numeric not null,
        "raw_amount" jsonb not null,
        "period" text not null,
        "status" text check ("status" in ('Gepland', 'In behandeling', 'Voltooid', 'Geannuleerd')) not null default 'Gepland',
        "currency" text not null default 'EUR',
        "eligible_at" timestamptz not null,
        "processed_at" timestamptz null,
        "stripe_transfer_id" text null,
        "order_id" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "payout_pkey" primary key ("id")
      );
    `)

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payout_seller_id" ON "payout" ("seller_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payout_affiliate_id" ON "payout" ("affiliate_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payout_recipient_type" ON "payout" ("recipient_type") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payout_status" ON "payout" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payout_order_id" ON "payout" ("order_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payout" cascade;`)
    this.addSql(`drop table if exists "invoice" cascade;`)
  }
}
