import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260730134003 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "em_cart_line" drop constraint if exists "em_cart_line_cart_offer_unique";`);
    this.addSql(`alter table if exists "em_cart" drop constraint if exists "em_cart_guest_token_unique";`);
    this.addSql(`create table if not exists "em_cart" ("id" text not null, "customer_id" text null, "guest_token" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "em_cart_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_cart_deleted_at" ON "em_cart" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_cart_customer_id" ON "em_cart" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_em_cart_guest_token_unique" ON "em_cart" ("guest_token") WHERE deleted_at IS NULL AND guest_token IS NOT NULL;`);

    this.addSql(`create table if not exists "em_cart_line" ("id" text not null, "cart_id" text not null, "offer_id" text not null, "quantity" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "em_cart_line_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_cart_line_cart_id" ON "em_cart_line" ("cart_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_cart_line_deleted_at" ON "em_cart_line" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_em_cart_line_cart_offer_unique" ON "em_cart_line" ("cart_id", "offer_id") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "em_cart_line" add constraint "em_cart_line_cart_id_foreign" foreign key ("cart_id") references "em_cart" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "em_cart_line" drop constraint if exists "em_cart_line_cart_id_foreign";`);

    this.addSql(`drop table if exists "em_cart" cascade;`);

    this.addSql(`drop table if exists "em_cart_line" cascade;`);
  }

}
