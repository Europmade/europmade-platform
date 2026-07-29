import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260729143054 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_seller_is_blocked";`);
    this.addSql(`alter table if exists "seller" drop column if exists "is_blocked", drop column if exists "blocked_reason", drop column if exists "blocked_at";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "seller" add column if not exists "is_blocked" boolean not null default false, add column if not exists "blocked_reason" text null, add column if not exists "blocked_at" timestamptz null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_is_blocked" ON "seller" ("is_blocked") WHERE deleted_at IS NULL;`);
  }

}
