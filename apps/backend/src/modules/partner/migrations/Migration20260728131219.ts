import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260728131219 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller" drop constraint if exists "seller_customer_id_unique";`);
    this.addSql(`alter table if exists "company" drop constraint if exists "company_chamber_of_commerce_number_country_code_unique";`);
    this.addSql(`create table if not exists "company" ("id" text not null, "legal_name" text not null, "chamber_of_commerce_number" text not null, "vat_number" text null, "country_code" text not null, "iban" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "company_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_deleted_at" ON "company" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_company_chamber_of_commerce_number_country_code_unique" ON "company" ("chamber_of_commerce_number", "country_code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_chamber_of_commerce_number" ON "company" ("chamber_of_commerce_number") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "brand" ("id" text not null, "name" text not null, "owner_company_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_owner_company_id" ON "brand" ("owner_company_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_deleted_at" ON "brand" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_name" ON "brand" ("name") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "manufacturer" ("id" text not null, "name" text not null, "represented_by_company_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "manufacturer_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_manufacturer_represented_by_company_id" ON "manufacturer" ("represented_by_company_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_manufacturer_deleted_at" ON "manufacturer" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_manufacturer_name" ON "manufacturer" ("name") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "seller" ("id" text not null, "customer_id" text not null, "company_id" text not null, "is_retailer" boolean not null, "is_producer_or_brand_owner" boolean not null, "is_distributor" boolean not null, "onboarding_status" text check ("onboarding_status" in ('Concept', 'Ingediend', 'In beoordeling', 'Aanvullende informatie vereist', 'Goedgekeurd', 'Afgekeurd')) not null, "approved_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_customer_id_unique" ON "seller" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_company_id" ON "seller" ("company_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_deleted_at" ON "seller" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_onboarding_status" ON "seller" ("onboarding_status") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "brand" add constraint "brand_owner_company_id_foreign" foreign key ("owner_company_id") references "company" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "manufacturer" add constraint "manufacturer_represented_by_company_id_foreign" foreign key ("represented_by_company_id") references "company" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "seller" add constraint "seller_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop constraint if exists "brand_owner_company_id_foreign";`);

    this.addSql(`alter table if exists "manufacturer" drop constraint if exists "manufacturer_represented_by_company_id_foreign";`);

    this.addSql(`alter table if exists "seller" drop constraint if exists "seller_company_id_foreign";`);

    this.addSql(`drop table if exists "company" cascade;`);

    this.addSql(`drop table if exists "brand" cascade;`);

    this.addSql(`drop table if exists "manufacturer" cascade;`);

    this.addSql(`drop table if exists "seller" cascade;`);
  }

}
