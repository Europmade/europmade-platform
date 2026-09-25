import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Generic central-field change proposals (extends ADR-0009).
 * Keeps proposed_title / proposed_description for backward compatibility.
 */
export class Migration20260924140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "change_proposal"
        add column if not exists "proposed_fields" jsonb null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter table if exists "change_proposal"
        drop column if exists "proposed_fields";
    `)
  }
}
