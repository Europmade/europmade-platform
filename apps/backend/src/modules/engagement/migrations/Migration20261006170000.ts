import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * P0-04 Enrollment, Preference, Suppression, CommunicationEvent.
 * Geen FK naar customer, seller, order, notification of em_conversation.
 * Active-uniekheid via partial unique indexes op de enrollment-rij.
 */
export class Migration20261006170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "engagement_enrollment" ("id" text not null, "contact_id" text not null, "organization_id" text not null, "program_id" text not null, "sequence_id" text not null, "sequence_step_id" text not null, "program_type" text check ("program_type" in ('acquisition', 'onboarding', 'lifecycle', 'newsletter', 'campaign', 'operational')) not null, "status" text check ("status" in ('active', 'stopped', 'completed', 'human_follow_up', 'suppressed')) not null default 'active', "next_step_at" timestamptz null, "entry_source" text not null, "trigger_key" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_enrollment_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_enrollment_deleted_at" ON "engagement_enrollment" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_enrollment_contact_id" ON "engagement_enrollment" ("contact_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_enrollment_organization_id" ON "engagement_enrollment" ("organization_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_enrollment_program_id" ON "engagement_enrollment" ("program_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_enrollment_sequence_id" ON "engagement_enrollment" ("sequence_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_enrollment_sequence_step_id" ON "engagement_enrollment" ("sequence_step_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_enrollment_status" ON "engagement_enrollment" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_enrollment_next_step_at" ON "engagement_enrollment" ("next_step_at") WHERE status = 'active' AND deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_enrollment_contact_trigger_unique" ON "engagement_enrollment" ("contact_id", "trigger_key") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_enrollment_contact_type_active" ON "engagement_enrollment" ("contact_id", "program_type") WHERE status = 'active' AND deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_enrollment_contact_acq_onb_active" ON "engagement_enrollment" ("contact_id") WHERE status = 'active' AND program_type IN ('acquisition', 'onboarding') AND deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "engagement_preference" ("id" text not null, "contact_id" text not null, "category" text check ("category" in ('acquisition', 'operational', 'marketing')) not null, "channel" text check ("channel" in ('email')) not null default 'email', "enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_preference_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_preference_deleted_at" ON "engagement_preference" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_preference_contact_id" ON "engagement_preference" ("contact_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_preference_category" ON "engagement_preference" ("category") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_preference_contact_category_channel" ON "engagement_preference" ("contact_id", "category", "channel") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "engagement_suppression" ("id" text not null, "contact_id" text not null, "category" text check ("category" in ('acquisition', 'operational', 'marketing')) not null, "reason" text check ("reason" in ('unsubscribe', 'bounce', 'manual')) not null, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_suppression_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_suppression_deleted_at" ON "engagement_suppression" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_suppression_contact_id" ON "engagement_suppression" ("contact_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_suppression_category" ON "engagement_suppression" ("category") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_suppression_reason" ON "engagement_suppression" ("reason") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_suppression_contact_category_active" ON "engagement_suppression" ("contact_id", "category") WHERE active = true AND deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "engagement_communication_event" ("id" text not null, "contact_id" text not null, "organization_id" text null, "customer_id" text null, "enrollment_id" text null, "program_id" text null, "sequence_id" text null, "sequence_step_id" text null, "template_id" text null, "variant_id" text null, "template_version_id" text null, "ai_draft_id" text null, "status" text check ("status" in ('queued', 'sent', 'failed', 'bounced', 'stopped')) not null, "provider_message_id" text null, "replied" boolean not null default false, "bounced" boolean not null default false, "unsubscribed" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_communication_event_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_communication_event_deleted_at" ON "engagement_communication_event" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_communication_event_contact_id" ON "engagement_communication_event" ("contact_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_communication_event_enrollment_id" ON "engagement_communication_event" ("enrollment_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_communication_event_status" ON "engagement_communication_event" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_communication_event_template_version_id" ON "engagement_communication_event" ("template_version_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "engagement_communication_event" cascade;`)
    this.addSql(`drop table if exists "engagement_suppression" cascade;`)
    this.addSql(`drop table if exists "engagement_preference" cascade;`)
    this.addSql(`drop table if exists "engagement_enrollment" cascade;`)
  }
}
