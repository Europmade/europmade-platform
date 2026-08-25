import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * P2.17 — seller_invoice + seller_invoice_line tables for EuropMade→Seller invoicing.
 */
export class Migration20260819150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "seller_invoice" (
        "id" text not null,
        "seller_id" text not null,
        "invoice_number" text not null,
        "invoice_date" timestamptz not null,
        "period_start" timestamptz not null,
        "period_end" timestamptz not null,
        "due_date" timestamptz not null,
        "currency" text not null default 'EUR',
        "subtotal" numeric not null default 0,
        "raw_subtotal" jsonb not null,
        "vat_amount" numeric not null default 0,
        "raw_vat_amount" jsonb not null,
        "total" numeric not null default 0,
        "raw_total" jsonb not null,
        "vat_regime" text not null default 'VAT_STANDARD_NL',
        "status" text check ("status" in ('draft','issued','due','paid','overdue','credited','cancelled')) not null default 'draft',
        "pdf_url" text null,
        "specification_url" text null,
        "credit_of_invoice_id" text null,
        "snapshot" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "seller_invoice_pkey" primary key ("id"),
        constraint "seller_invoice_invoice_number_unique" unique ("invoice_number")
      );
    `)

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_invoice_seller_id" ON "seller_invoice" ("seller_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_invoice_status" ON "seller_invoice" ("status") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_invoice_invoice_number" ON "seller_invoice" ("invoice_number") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_invoice_period" ON "seller_invoice" ("period_start", "period_end") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_invoice_credit_of" ON "seller_invoice" ("credit_of_invoice_id") WHERE deleted_at IS NULL;`)

    this.addSql(`
      create table if not exists "seller_invoice_line" (
        "id" text not null,
        "invoice_id" text not null,
        "line_type" text not null,
        "description" text not null,
        "source_ref" text null,
        "source_type" text null,
        "quantity" double precision not null default 1,
        "unit_price" numeric not null default 0,
        "raw_unit_price" jsonb not null,
        "commission_pct" double precision null,
        "net_amount" numeric not null default 0,
        "raw_net_amount" jsonb not null,
        "vat_rate" double precision not null default 0,
        "vat_amount" numeric not null default 0,
        "raw_vat_amount" jsonb not null,
        "gross_amount" numeric not null default 0,
        "raw_gross_amount" jsonb not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "seller_invoice_line_pkey" primary key ("id")
      );
    `)

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sinvl_invoice_id" ON "seller_invoice_line" ("invoice_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sinvl_line_type" ON "seller_invoice_line" ("line_type") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sinvl_source_ref" ON "seller_invoice_line" ("source_ref") WHERE deleted_at IS NULL;`)

    // Invoice number sequence — ensures unique sequential numbering
    this.addSql(`CREATE SEQUENCE IF NOT EXISTS seller_invoice_number_seq START WITH 1 INCREMENT BY 1;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP SEQUENCE IF EXISTS seller_invoice_number_seq;`)
    this.addSql(`drop table if exists "seller_invoice_line" cascade;`)
    this.addSql(`drop table if exists "seller_invoice" cascade;`)
  }
}
