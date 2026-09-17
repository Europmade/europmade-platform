import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Product Link Group lifecycle: inactive status + seller amend/deactivate requests.
 * Keeps audit trail (no hard delete of active groups).
 */
export class Migration20260917100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "pc_product_link_group"
        drop constraint if exists "pc_product_link_group_status_check";
    `)
    this.addSql(`
      alter table if exists "pc_product_link_group"
        add constraint "pc_product_link_group_status_check"
        check ("status" in ('proposed', 'active', 'rejected', 'inactive'));
    `)
    this.addSql(`
      alter table if exists "pc_product_link_group"
        add column if not exists "request_kind" text
        check ("request_kind" in ('create', 'amend', 'deactivate'))
        not null default 'create';
    `)
    this.addSql(`
      alter table if exists "pc_product_link_group"
        add column if not exists "target_group_id" text null;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_pc_product_link_group_target"
      ON "pc_product_link_group" ("target_group_id")
      WHERE deleted_at IS NULL AND target_group_id IS NOT NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_pc_product_link_group_target";`
    )
    this.addSql(`
      alter table if exists "pc_product_link_group"
        drop column if exists "target_group_id";
    `)
    this.addSql(`
      alter table if exists "pc_product_link_group"
        drop column if exists "request_kind";
    `)
    this.addSql(`
      alter table if exists "pc_product_link_group"
        drop constraint if exists "pc_product_link_group_status_check";
    `)
    this.addSql(`
      alter table if exists "pc_product_link_group"
        add constraint "pc_product_link_group_status_check"
        check ("status" in ('proposed', 'active', 'rejected'));
    `)
  }
}
