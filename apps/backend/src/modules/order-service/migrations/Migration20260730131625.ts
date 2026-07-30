import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260730131625 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "em_order" drop constraint if exists "em_order_order_number_unique";`);
    this.addSql(`alter table if exists "order_set" drop constraint if exists "order_set_payment_reference_unique";`);
    this.addSql(`create table if not exists "order_set" ("id" text not null, "customer_id" text not null, "payment_reference" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_set_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_set_deleted_at" ON "order_set" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_set_customer_id" ON "order_set" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_set_payment_reference_unique" ON "order_set" ("payment_reference") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "em_order" ("id" text not null, "order_number" text not null, "order_set_id" text not null, "customer_id" text not null, "seller_id" text not null, "payment_status" text check ("payment_status" in ('Betaald', 'Betaling wordt verwerkt')) not null, "exception_status" text check ("exception_status" in ('Mislukte ordersplitsing', 'Afgehandeld')) null, "shipping_address" text not null, "billing_address" text not null, "exception_reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "em_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_order_order_set_id" ON "em_order" ("order_set_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_order_deleted_at" ON "em_order" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_em_order_order_number_unique" ON "em_order" ("order_number") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_order_customer_id" ON "em_order" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_order_seller_id" ON "em_order" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_order_payment_status" ON "em_order" ("payment_status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_order_exception_status" ON "em_order" ("exception_status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "order_message" ("id" text not null, "order_id" text not null, "sender_customer_id" text not null, "body" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_message_order_id" ON "order_message" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_message_deleted_at" ON "order_message" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_message_sender_customer_id" ON "order_message" ("sender_customer_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "order_line" ("id" text not null, "order_id" text not null, "product_variant_id" text not null, "offer_id" text not null, "quantity" integer not null, "unit_price_snapshot" numeric not null, "vat_rate_snapshot" real not null, "raw_unit_price_snapshot" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_line_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_line_order_id" ON "order_line" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_line_deleted_at" ON "order_line" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_line_offer_id" ON "order_line" ("offer_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "em_return" ("id" text not null, "order_line_id" text not null, "reason" text null, "status" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "em_return_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_return_order_line_id" ON "em_return" ("order_line_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_return_deleted_at" ON "em_return" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "shipment" ("id" text not null, "order_id" text not null, "tracking_code" text null, "expected_delivery_at" timestamptz null, "delivered_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_order_id" ON "shipment" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_deleted_at" ON "shipment" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "em_order" add constraint "em_order_order_set_id_foreign" foreign key ("order_set_id") references "order_set" ("id") on update cascade;`);

    this.addSql(`alter table if exists "order_message" add constraint "order_message_order_id_foreign" foreign key ("order_id") references "em_order" ("id") on update cascade;`);

    this.addSql(`alter table if exists "order_line" add constraint "order_line_order_id_foreign" foreign key ("order_id") references "em_order" ("id") on update cascade;`);

    this.addSql(`alter table if exists "em_return" add constraint "em_return_order_line_id_foreign" foreign key ("order_line_id") references "order_line" ("id") on update cascade;`);

    this.addSql(`alter table if exists "shipment" add constraint "shipment_order_id_foreign" foreign key ("order_id") references "em_order" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "em_order" drop constraint if exists "em_order_order_set_id_foreign";`);

    this.addSql(`alter table if exists "order_message" drop constraint if exists "order_message_order_id_foreign";`);

    this.addSql(`alter table if exists "order_line" drop constraint if exists "order_line_order_id_foreign";`);

    this.addSql(`alter table if exists "shipment" drop constraint if exists "shipment_order_id_foreign";`);

    this.addSql(`alter table if exists "em_return" drop constraint if exists "em_return_order_line_id_foreign";`);

    this.addSql(`drop table if exists "order_set" cascade;`);

    this.addSql(`drop table if exists "em_order" cascade;`);

    this.addSql(`drop table if exists "order_message" cascade;`);

    this.addSql(`drop table if exists "order_line" cascade;`);

    this.addSql(`drop table if exists "em_return" cascade;`);

    this.addSql(`drop table if exists "shipment" cascade;`);
  }

}
