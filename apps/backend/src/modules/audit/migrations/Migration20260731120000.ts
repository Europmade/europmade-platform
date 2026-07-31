import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260731120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "audit_log" ("id" text not null, "actor_customer_id" text null, "entity_type" text not null, "entity_id" text not null, "action_type" text not null, "reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "audit_log_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_log_deleted_at" ON "audit_log" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_log_entity_type_entity_id" ON "audit_log" ("entity_type", "entity_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_log_created_at" ON "audit_log" ("created_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_log_action_type" ON "audit_log" ("action_type") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "audit_log" cascade;`)
  }
}
