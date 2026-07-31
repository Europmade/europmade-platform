import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260731130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "review" ("id" text not null, "customer_id" text not null, "order_line_id" text not null, "review_type" text check ("review_type" in ('Productreview', 'Verkopersreview')) not null, "product_id" text null, "seller_id" text null, "score" integer not null, "text" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_review_deleted_at" ON "review" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_customer_id_order_line_id_review_type_unique" ON "review" ("customer_id", "order_line_id", "review_type") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_review_product_id" ON "review" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_review_seller_id" ON "review" ("seller_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review" cascade;`)
  }
}
