import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260730081545 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "moderation_case" ("id" text not null, "product_id" text null, "seller_id" text null, "case_type" text check ("case_type" in ('Fraude-signaal', 'Melding derde partij', 'Hoog-risico wijziging')) not null, "status" text check ("status" in ('Gesignaleerd', 'Geen actie', 'Geëscaleerd')) not null, "ai_metadata_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "moderation_case_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_moderation_case_deleted_at" ON "moderation_case" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_moderation_case_product_id" ON "moderation_case" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_moderation_case_seller_id" ON "moderation_case" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_moderation_case_status" ON "moderation_case" ("status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "moderation_case" cascade;`);
  }

}
