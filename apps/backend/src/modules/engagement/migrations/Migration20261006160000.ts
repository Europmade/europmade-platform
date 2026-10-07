import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * P0-03 LifecycleProgram, Sequence, SequenceStep.
 * Id-verwijzingen naar template/variant. Geen FK naar customer, seller,
 * order, notification of em_conversation. Geen enrollment of history.
 */
export class Migration20261006160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "engagement_lifecycle_program" ("id" text not null, "name" text not null, "program_type" text check ("program_type" in ('acquisition', 'onboarding', 'lifecycle', 'newsletter', 'campaign', 'operational')) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_lifecycle_program_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_lifecycle_program_deleted_at" ON "engagement_lifecycle_program" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_lifecycle_program_program_type" ON "engagement_lifecycle_program" ("program_type") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_lifecycle_program_program_type_name_unique" ON "engagement_lifecycle_program" ("program_type", "name") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "engagement_sequence" ("id" text not null, "program_id" text not null, "name" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_sequence_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_sequence_deleted_at" ON "engagement_sequence" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_sequence_program_id" ON "engagement_sequence" ("program_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_sequence_program_id_name_unique" ON "engagement_sequence" ("program_id", "name") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "engagement_sequence_step" ("id" text not null, "sequence_id" text not null, "step_order" integer not null, "delay_minutes" integer not null default 0, "template_id" text not null, "variant_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_sequence_step_pkey" primary key ("id"), constraint "engagement_sequence_step_step_order_check" check ("step_order" >= 1), constraint "engagement_sequence_step_delay_minutes_check" check ("delay_minutes" >= 0));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_sequence_step_deleted_at" ON "engagement_sequence_step" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_sequence_step_sequence_id_step_order_unique" ON "engagement_sequence_step" ("sequence_id", "step_order") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_sequence_step_sequence_id" ON "engagement_sequence_step" ("sequence_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_sequence_step_template_id" ON "engagement_sequence_step" ("template_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_sequence_step_variant_id" ON "engagement_sequence_step" ("variant_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "engagement_sequence_step" cascade;`)
    this.addSql(`drop table if exists "engagement_sequence" cascade;`)
    this.addSql(`drop table if exists "engagement_lifecycle_program" cascade;`)
  }
}
