import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260731150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "moderation_case" add column if not exists "signal_code" text null;`
    )
    this.addSql(
      `alter table if exists "moderation_case" add column if not exists "affiliate_id" text null;`
    )
    this.addSql(
      `alter table if exists "moderation_case" add column if not exists "subject_customer_id" text null;`
    )
    this.addSql(
      `alter table if exists "moderation_case" add column if not exists "source_entity_type" text null;`
    )
    this.addSql(
      `alter table if exists "moderation_case" add column if not exists "source_entity_id" text null;`
    )
    this.addSql(
      `alter table if exists "moderation_case" add column if not exists "decision_reason" text null;`
    )
    this.addSql(
      `alter table if exists "moderation_case" add column if not exists "decided_at" timestamptz null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_moderation_case_case_type" ON "moderation_case" ("case_type") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_moderation_case_affiliate_id" ON "moderation_case" ("affiliate_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_moderation_case_signal_code" ON "moderation_case" ("signal_code") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `drop index if exists "IDX_moderation_case_signal_code";`
    )
    this.addSql(
      `drop index if exists "IDX_moderation_case_affiliate_id";`
    )
    this.addSql(`drop index if exists "IDX_moderation_case_case_type";`)
    this.addSql(
      `alter table if exists "moderation_case" drop column if exists "decided_at";`
    )
    this.addSql(
      `alter table if exists "moderation_case" drop column if exists "decision_reason";`
    )
    this.addSql(
      `alter table if exists "moderation_case" drop column if exists "source_entity_id";`
    )
    this.addSql(
      `alter table if exists "moderation_case" drop column if exists "source_entity_type";`
    )
    this.addSql(
      `alter table if exists "moderation_case" drop column if exists "subject_customer_id";`
    )
    this.addSql(
      `alter table if exists "moderation_case" drop column if exists "affiliate_id";`
    )
    this.addSql(
      `alter table if exists "moderation_case" drop column if exists "signal_code";`
    )
  }
}
