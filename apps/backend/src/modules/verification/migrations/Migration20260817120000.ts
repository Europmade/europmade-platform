import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** P2.3 — evidence_kind so CE/data-usage docs are not auto-MiE and never auto-approved. */
export class Migration20260817120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "product_origin_evidence" add column if not exists "evidence_kind" text not null default 'made_in_europe';`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_origin_evidence_kind" ON "product_origin_evidence" ("evidence_kind") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_origin_evidence_kind";`)
    this.addSql(
      `alter table if exists "product_origin_evidence" drop column if exists "evidence_kind";`
    )
  }
}
