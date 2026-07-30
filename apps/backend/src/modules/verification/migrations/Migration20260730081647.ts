import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260730081647 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_origin" drop constraint if exists "product_origin_product_version_id_unique";`);
    this.addSql(`create table if not exists "product_origin" ("id" text not null, "product_version_id" text not null, "manufacturer_id" text not null, "brand_id" text not null, "seller_id" text not null, "production_country" text not null, "production_location" text not null, "status" text check ("status" in ('Niet aangevraagd', 'Aangevraagd', 'In beoordeling', 'Aanvullende informatie vereist', 'Geverifieerd', 'Afgewezen', 'Ingetrokken')) not null, "ai_metadata_id" text null, "next_recheck_due_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_origin_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_origin_deleted_at" ON "product_origin" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_origin_product_version_id_unique" ON "product_origin" ("product_version_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_origin" cascade;`);
  }

}
