import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * P0-01 Communication CMS. Geen enrollment, history of verzending.
 */
export class Migration20261006140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "communication_template" ("id" text not null, "name" text not null, "communication_type" text check ("communication_type" in ('acquisition', 'onboarding', 'lifecycle', 'newsletter', 'campaign', 'operational')) not null, "sequence_step_binding" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "communication_template_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_communication_template_deleted_at" ON "communication_template" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_communication_template_communication_type" ON "communication_template" ("communication_type") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_communication_template_name" ON "communication_template" ("name") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "communication_template_variant" ("id" text not null, "template_id" text not null, "name" text not null, "locale" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "communication_template_variant_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_communication_template_variant_deleted_at" ON "communication_template_variant" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_communication_template_variant_template_id_name_unique" ON "communication_template_variant" ("template_id", "name") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_communication_template_variant_template_id" ON "communication_template_variant" ("template_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_communication_template_variant_locale" ON "communication_template_variant" ("locale") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "communication_template_version" ("id" text not null, "variant_id" text not null, "version_number" integer not null, "subject" text not null, "preheader" text not null, "body" text not null, "cta_label" text not null, "cta_url" text null, "personalization_tokens" jsonb not null default '[]', "approval_status" text check ("approval_status" in ('draft', 'pending_review', 'approved', 'rejected')) not null default 'draft', "activation_status" text check ("activation_status" in ('inactive', 'active', 'archived')) not null default 'inactive', "approved_at" timestamptz null, "approved_by" text null, "used_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "communication_template_version_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_communication_template_version_deleted_at" ON "communication_template_version" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_communication_template_version_variant_id_version_number_unique" ON "communication_template_version" ("variant_id", "version_number") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_communication_template_version_variant_id" ON "communication_template_version" ("variant_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_communication_template_version_approval_status" ON "communication_template_version" ("approval_status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_communication_template_version_activation_status" ON "communication_template_version" ("activation_status") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `drop table if exists "communication_template_version" cascade;`
    )
    this.addSql(
      `drop table if exists "communication_template_variant" cascade;`
    )
    this.addSql(`drop table if exists "communication_template" cascade;`)
  }
}
