import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Fulfilment: shipment carrier/status/url + return tracking + order documents.
 * ADR-0040.
 */
export class Migration20260815180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "shipment"
        add column if not exists "carrier" text null,
        add column if not exists "tracking_url" text null,
        add column if not exists "status" text null;
    `)
    this.addSql(`
      update "shipment"
      set "status" = case
        when "delivered_at" is not null then 'delivered'
        when "tracking_code" is not null then 'in_transit'
        else 'pending'
      end
      where "status" is null;
    `)

    this.addSql(`
      alter table if exists "em_return"
        add column if not exists "carrier" text null,
        add column if not exists "tracking_code" text null,
        add column if not exists "tracking_url" text null;
    `)

    this.addSql(`
      create table if not exists "order_document" (
        "id" text not null,
        "order_id" text not null,
        "type" text check ("type" in ('invoice', 'packing_slip')) not null,
        "file_id" text null,
        "url" text not null,
        "filename" text not null,
        "mime_type" text not null,
        "size_bytes" integer not null,
        "uploaded_at" timestamptz not null default now(),
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "order_document_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_document_order_id" ON "order_document" ("order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_document_order_id_type_unique" ON "order_document" ("order_id", "type") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_document" cascade;`)
    this.addSql(`
      alter table if exists "em_return"
        drop column if exists "carrier",
        drop column if exists "tracking_code",
        drop column if exists "tracking_url";
    `)
    this.addSql(`
      alter table if exists "shipment"
        drop column if exists "carrier",
        drop column if exists "tracking_url",
        drop column if exists "status";
    `)
  }
}
