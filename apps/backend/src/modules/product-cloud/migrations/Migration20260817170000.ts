import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** P2.5 — product approval metadata (distinct from compliance evidence review). */
export class Migration20260817170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "product_version" add column if not exists "approval_requested_at" timestamptz null, add column if not exists "approval_rejection_reason" text null, add column if not exists "approval_decided_at" timestamptz null, add column if not exists "approval_decided_by" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "product_version" drop column if exists "approval_requested_at", drop column if exists "approval_rejection_reason", drop column if exists "approval_decided_at", drop column if exists "approval_decided_by";`
    )
  }
}
