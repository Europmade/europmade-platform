import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Conversations (action status) + message attachments + conversation_id on messages.
 */
export class Migration20260815160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "em_conversation" (
        "id" text not null,
        "seller_id" text not null,
        "customer_id" text not null,
        "order_id" text null,
        "subject" text null,
        "status" text check ("status" in ('waiting_for_seller', 'waiting_for_customer', 'resolved')) not null,
        "last_message_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "em_conversation_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_em_conversation_seller_id" ON "em_conversation" ("seller_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_em_conversation_customer_id" ON "em_conversation" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_em_conversation_order_id" ON "em_conversation" ("order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_em_conversation_status" ON "em_conversation" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_em_conversation_seller_id_status" ON "em_conversation" ("seller_id", "status") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "order_message_attachment" (
        "id" text not null,
        "message_id" text not null,
        "file_id" text null,
        "url" text not null,
        "filename" text not null,
        "mime_type" text not null,
        "size_bytes" integer not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "order_message_attachment_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_message_attachment_message_id" ON "order_message_attachment" ("message_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `alter table if exists "order_message" add column if not exists "conversation_id" text null;`
    )
    this.addSql(
      `alter table if exists "order_message" alter column "order_id" drop not null;`
    )

    // Backfill one conversation per order that already has messages
    this.addSql(`
      insert into "em_conversation" (
        "id", "seller_id", "customer_id", "order_id", "subject", "status",
        "last_message_at", "created_at", "updated_at"
      )
      select
        'oconv_' || o."id",
        o."seller_id",
        o."customer_id",
        o."id",
        null,
        case
          when last_msg."sender_customer_id" = o."customer_id" then 'waiting_for_seller'
          else 'waiting_for_customer'
        end,
        last_msg."created_at",
        now(),
        now()
      from "em_order" o
      inner join lateral (
        select m."sender_customer_id", m."created_at"
        from "order_message" m
        where m."order_id" = o."id" and m."deleted_at" is null
        order by m."created_at" desc
        limit 1
      ) last_msg on true
      where o."deleted_at" is null
        and not exists (
          select 1 from "em_conversation" c
          where c."order_id" = o."id" and c."deleted_at" is null
        );
    `)

    this.addSql(`
      update "order_message" m
      set "conversation_id" = c."id"
      from "em_conversation" c
      where m."order_id" = c."order_id"
        and m."conversation_id" is null
        and c."deleted_at" is null;
    `)

    // Orphan messages without conversation — create stub conversations
    this.addSql(`
      insert into "em_conversation" (
        "id", "seller_id", "customer_id", "order_id", "subject", "status",
        "last_message_at", "created_at", "updated_at"
      )
      select
        'oconv_orphan_' || m."id",
        coalesce(o."seller_id", 'unknown'),
        coalesce(o."customer_id", m."sender_customer_id"),
        m."order_id",
        null,
        'waiting_for_seller',
        m."created_at",
        now(),
        now()
      from "order_message" m
      left join "em_order" o on o."id" = m."order_id"
      where m."conversation_id" is null
        and m."deleted_at" is null;
    `)

    this.addSql(`
      update "order_message" m
      set "conversation_id" = c."id"
      from "em_conversation" c
      where c."id" = 'oconv_orphan_' || m."id"
        and m."conversation_id" is null;
    `)

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_message_conversation_id" ON "order_message" ("conversation_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `drop index if exists "IDX_order_message_conversation_id";`
    )
    this.addSql(
      `alter table if exists "order_message" drop column if exists "conversation_id";`
    )
    this.addSql(`drop table if exists "order_message_attachment" cascade;`)
    this.addSql(`drop table if exists "em_conversation" cascade;`)
  }
}
