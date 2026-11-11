import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Nest home-related roots under Wonen / Huishouden (reuse existing slugs).
 * Kleding children stay unchanged. Mode stays a free-standing root (hidden in nav).
 */
export class Migration20261020120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      UPDATE pc_category AS child
      SET parent_category_id = parent.id,
          updated_at = now()
      FROM pc_category AS parent
      WHERE parent.deleted_at IS NULL
        AND child.deleted_at IS NULL
        AND parent.slug = 'wonen'
        AND child.slug IN ('slaapkamer', 'badkamer', 'verlichting', 'home-en-living')
        AND child.parent_category_id IS NULL;
    `)
    this.addSql(`
      UPDATE pc_category AS child
      SET parent_category_id = parent.id,
          updated_at = now()
      FROM pc_category AS parent
      WHERE parent.deleted_at IS NULL
        AND child.deleted_at IS NULL
        AND parent.slug = 'huishouden'
        AND child.slug = 'keuken'
        AND child.parent_category_id IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      UPDATE pc_category
      SET parent_category_id = NULL,
          updated_at = now()
      WHERE deleted_at IS NULL
        AND slug IN ('slaapkamer', 'badkamer', 'verlichting', 'home-en-living', 'keuken')
        AND parent_category_id IS NOT NULL;
    `)
  }
}
