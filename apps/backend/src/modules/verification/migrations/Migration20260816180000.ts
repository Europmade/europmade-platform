import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** P2.1 — Made in Europe evidence + status audit trail. */
export class Migration20260816180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "product_origin_evidence" (
        "id" text not null,
        "product_id" text not null,
        "product_origin_id" text null,
        "product_version_id" text null,
        "document_type" text not null,
        "storage_reference" text not null,
        "file_name" text null,
        "mime_type" text null,
        "file_size_bytes" integer null,
        "verification_status" text not null default 'pending',
        "verification_notes" text null,
        "verification_result" text null,
        "verification_method" text null,
        "verified_at" timestamptz null,
        "verified_by" text null,
        "uploaded_by_customer_id" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "product_origin_evidence_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_origin_evidence_product" ON "product_origin_evidence" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_origin_evidence_origin" ON "product_origin_evidence" ("product_origin_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_origin_evidence_status" ON "product_origin_evidence" ("verification_status") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "product_origin_status_event" (
        "id" text not null,
        "product_id" text not null,
        "product_origin_id" text null,
        "evidence_id" text null,
        "from_status" text null,
        "to_status" text not null,
        "note" text null,
        "actor_customer_id" text null,
        "actor_type" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "product_origin_status_event_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_origin_status_event_product" ON "product_origin_status_event" ("product_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_origin_status_event" cascade;`)
    this.addSql(`drop table if exists "product_origin_evidence" cascade;`)
  }
}
