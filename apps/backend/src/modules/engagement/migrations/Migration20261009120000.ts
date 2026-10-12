import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Activering van automatiseringen en ontvangers zonder zakelijk contact.
 * Bestaande rijen blijven staan. Er wordt niets verzonden.
 */
export class Migration20261009120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" add column if not exists "activation_status" text null;`
    )
    this.addSql(
      `update "engagement_lifecycle_program" set "start_mode" = 'condition' where "deleted_at" is null and "start_trigger" in ('account_created', 'onboarding_submitted', 'onboarding_approved', 'product_incomplete', 'verification') and ("start_mode" is null or "start_mode" = 'event');`
    )
    this.addSql(
      `update "engagement_lifecycle_program" set "activation_status" = 'active' where "activation_status" is null and "deleted_at" is null and "start_trigger" is not null;`
    )
    this.addSql(
      `update "engagement_lifecycle_program" set "activation_status" = 'concept' where "activation_status" is null and "deleted_at" is null;`
    )
    this.addSql(
      `alter table if exists "engagement_enrollment" add column if not exists "consumer_id" text null;`
    )
    this.addSql(
      `alter table if exists "engagement_enrollment" add column if not exists "affiliate_id" text null;`
    )
    this.addSql(
      `alter table if exists "engagement_enrollment" alter column "contact_id" drop not null;`
    )
    this.addSql(
      `alter table if exists "engagement_enrollment" alter column "organization_id" drop not null;`
    )
    this.addSql(
      `create unique index if not exists "IDX_engagement_enrollment_consumer_trigger" on "engagement_enrollment" ("consumer_id", "trigger_key") where "consumer_id" is not null and "deleted_at" is null;`
    )
    this.addSql(
      `create unique index if not exists "IDX_engagement_enrollment_affiliate_trigger" on "engagement_enrollment" ("affiliate_id", "trigger_key") where "affiliate_id" is not null and "deleted_at" is null;`
    )
    this.addSql(
      `create unique index if not exists "IDX_engagement_enrollment_consumer_type_active" on "engagement_enrollment" ("consumer_id", "program_type") where "consumer_id" is not null and "status" = 'active' and "deleted_at" is null;`
    )
    this.addSql(
      `create unique index if not exists "IDX_engagement_enrollment_affiliate_type_active" on "engagement_enrollment" ("affiliate_id", "program_type") where "affiliate_id" is not null and "status" = 'active' and "deleted_at" is null;`
    )
    this.addSql(
      `alter table if exists "engagement_communication_event" add column if not exists "affiliate_id" text null;`
    )
    this.addSql(
      `alter table if exists "engagement_communication_event" alter column "contact_id" drop not null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "engagement_communication_event" drop column if exists "affiliate_id";`
    )
    this.addSql(
      `drop index if exists "IDX_engagement_enrollment_affiliate_type_active";`
    )
    this.addSql(
      `drop index if exists "IDX_engagement_enrollment_consumer_type_active";`
    )
    this.addSql(
      `drop index if exists "IDX_engagement_enrollment_affiliate_trigger";`
    )
    this.addSql(
      `drop index if exists "IDX_engagement_enrollment_consumer_trigger";`
    )
    this.addSql(
      `alter table if exists "engagement_enrollment" drop column if exists "affiliate_id";`
    )
    this.addSql(
      `alter table if exists "engagement_enrollment" drop column if exists "consumer_id";`
    )
    this.addSql(
      `alter table if exists "engagement_lifecycle_program" drop column if exists "activation_status";`
    )
  }
}
