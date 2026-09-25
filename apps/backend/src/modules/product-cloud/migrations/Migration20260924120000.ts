import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Explicit Productbeheerder per Product Cloud product (ADR-0046).
 * Separates central edit rights from automatic sole-owner / multi-offer heuristics.
 */
export class Migration20260924120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "pc_product"
        add column if not exists "product_manager_kind" text
        check ("product_manager_kind" in ('seller', 'brand_owner', 'none'))
        not null default 'none';
    `)
    this.addSql(`
      alter table if exists "pc_product"
        add column if not exists "product_manager_seller_id" text null;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_pc_product_product_manager_seller_id"
      ON "pc_product" ("product_manager_seller_id")
      WHERE deleted_at IS NULL AND product_manager_seller_id IS NOT NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_pc_product_product_manager_kind"
      ON "pc_product" ("product_manager_kind")
      WHERE deleted_at IS NULL;
    `)
    // Backfill: treat historical info-owner as explicit seller Productbeheerder.
    this.addSql(`
      update "pc_product"
      set
        product_manager_kind = 'seller',
        product_manager_seller_id = current_owner_seller_id
      where deleted_at is null
        and coalesce(trim(current_owner_seller_id), '') <> ''
        and product_manager_kind = 'none'
        and product_manager_seller_id is null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_pc_product_product_manager_kind";`
    )
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_pc_product_product_manager_seller_id";`
    )
    this.addSql(`
      alter table if exists "pc_product"
        drop column if exists "product_manager_seller_id";
    `)
    this.addSql(`
      alter table if exists "pc_product"
        drop column if exists "product_manager_kind";
    `)
  }
}
