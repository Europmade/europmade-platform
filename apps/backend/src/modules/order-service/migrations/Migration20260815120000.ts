import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Seller/buyer conversation read cursors (leesbevestiging).
 * Independent of conversation action status (waiting/resolved).
 */
export class Migration20260815120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "order_conversation_read" ("id" text not null, "participant_customer_id" text not null, "conversation_id" text not null, "read_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_conversation_read_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_conversation_read_participant_conversation_unique" ON "order_conversation_read" ("participant_customer_id", "conversation_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_conversation_read_participant_customer_id" ON "order_conversation_read" ("participant_customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_conversation_read_conversation_id" ON "order_conversation_read" ("conversation_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `drop index if exists "IDX_order_conversation_read_conversation_id";`
    )
    this.addSql(
      `drop index if exists "IDX_order_conversation_read_participant_customer_id";`
    )
    this.addSql(
      `drop index if exists "IDX_order_conversation_read_participant_conversation_unique";`
    )
    this.addSql(`drop table if exists "order_conversation_read" cascade;`)
  }
}
