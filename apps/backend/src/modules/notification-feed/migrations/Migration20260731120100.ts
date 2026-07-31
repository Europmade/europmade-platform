import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260731120100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "in_app_notification" ("id" text not null, "recipient_customer_id" text not null, "notification_type" text not null, "source_entity_type" text not null, "source_entity_id" text not null, "read_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "in_app_notification_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_in_app_notification_deleted_at" ON "in_app_notification" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_in_app_notification_recipient_customer_id" ON "in_app_notification" ("recipient_customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_in_app_notification_read_at" ON "in_app_notification" ("read_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_in_app_notification_source_entity_type_source_entity_id" ON "in_app_notification" ("source_entity_type", "source_entity_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "in_app_notification" cascade;`)
  }
}
