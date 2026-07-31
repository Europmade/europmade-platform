import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260731140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "affiliate" ("id" text not null, "customer_id" text not null, "company_id" text null, "onboarding_status" text check ("onboarding_status" in ('Ingediend', 'In beoordeling', 'Goedgekeurd', 'Afgekeurd')) not null, "approved_at" timestamptz null, "channel_url" text null, "rejection_reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_affiliate_customer_id_unique" ON "affiliate" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_affiliate_onboarding_status" ON "affiliate" ("onboarding_status") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "affiliate_link" ("id" text not null, "affiliate_id" text not null, "target_url" text not null, "tracking_param" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_link_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_affiliate_link_tracking_param_unique" ON "affiliate_link" ("tracking_param") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_affiliate_link_affiliate_id" ON "affiliate_link" ("affiliate_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "aff_coupon" ("id" text not null, "affiliate_id" text not null, "code" text not null, "status" text check ("status" in ('Actief', 'Ingetrokken')) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "aff_coupon_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_aff_coupon_code_unique" ON "aff_coupon" ("code") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_aff_coupon_affiliate_id" ON "aff_coupon" ("affiliate_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "consent_record" ("id" text not null, "visitor_hash" text not null, "consent_given" boolean not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "consent_record_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_consent_record_visitor_hash" ON "consent_record" ("visitor_hash") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "aff_click" ("id" text not null, "affiliate_link_id" text not null, "consent_record_id" text not null, "attribution_expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "aff_click_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_aff_click_affiliate_link_id" ON "aff_click" ("affiliate_link_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_aff_click_consent_record_id" ON "aff_click" ("consent_record_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "aff_conversion" ("id" text not null, "order_id" text not null, "click_id" text null, "coupon_id" text null, "affiliate_id" text not null, "reversed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "aff_conversion_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_aff_conversion_order_id_unique" ON "aff_conversion" ("order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_aff_conversion_affiliate_id" ON "aff_conversion" ("affiliate_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "affiliate_commission_setting" ("id" text not null, "percentage" real not null, "attribution_days" integer not null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_commission_setting_pkey" primary key ("id"));`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "affiliate_commission_setting" cascade;`)
    this.addSql(`drop table if exists "aff_conversion" cascade;`)
    this.addSql(`drop table if exists "aff_click" cascade;`)
    this.addSql(`drop table if exists "consent_record" cascade;`)
    this.addSql(`drop table if exists "aff_coupon" cascade;`)
    this.addSql(`drop table if exists "affiliate_link" cascade;`)
    this.addSql(`drop table if exists "affiliate" cascade;`)
  }
}
