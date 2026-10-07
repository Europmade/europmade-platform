import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * P0-02 prospect-CRM. Soft refs naar customer/seller, geen FK.
 * Geen sequence, enrollment of verzending.
 */
export class Migration20261006150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "engagement_import_batch" ("id" text not null, "source" text not null default 'excel_import', "file_name" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_import_batch_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_import_batch_deleted_at" ON "engagement_import_batch" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_import_batch_source" ON "engagement_import_batch" ("source") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "engagement_organization" ("id" text not null, "company_name" text not null, "website" text null, "category" text null, "sales_model" text check ("sales_model" in ('direct_to_consumer', 'reseller_only', 'mixed', 'brand_seeking_partners', 'unknown')) not null default 'unknown', "outreach_status" text not null default 'new', "source" text not null default 'excel_import', "outreach_purpose" text null, "self_classification_payload" jsonb null, "import_batch_id" text null, "converted_customer_id" text null, "converted_seller_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_organization_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_organization_deleted_at" ON "engagement_organization" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_organization_company_name" ON "engagement_organization" ("company_name") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_organization_sales_model" ON "engagement_organization" ("sales_model") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_organization_outreach_status" ON "engagement_organization" ("outreach_status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_organization_source" ON "engagement_organization" ("source") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_organization_import_batch_id" ON "engagement_organization" ("import_batch_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_organization_converted_seller_id" ON "engagement_organization" ("converted_seller_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "engagement_organization_role" ("id" text not null, "organization_id" text not null, "role" text check ("role" in ('brand', 'seller', 'manufacturer', 'distributor', 'retailer', 'other', 'unknown')) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_organization_role_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_organization_role_deleted_at" ON "engagement_organization_role" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_organization_role_organization_id_role_unique" ON "engagement_organization_role" ("organization_id", "role") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_organization_role_organization_id" ON "engagement_organization_role" ("organization_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_organization_role_role" ON "engagement_organization_role" ("role") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "engagement_contact" ("id" text not null, "organization_id" text not null, "name" text null, "email" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_contact_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_contact_deleted_at" ON "engagement_contact" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_contact_organization_id_email_unique" ON "engagement_contact" ("organization_id", "email") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_contact_organization_id" ON "engagement_contact" ("organization_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_contact_email" ON "engagement_contact" ("email") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "engagement_contact" cascade;`)
    this.addSql(`drop table if exists "engagement_organization_role" cascade;`)
    this.addSql(`drop table if exists "engagement_organization" cascade;`)
    this.addSql(`drop table if exists "engagement_import_batch" cascade;`)
  }
}
