import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Deduplicate synonym roots, register former_slug redirects, and add missing
 * consumer-facing subcategories. Idempotent by slug. Product links are moved
 * to the kept root before soft-deleting duplicates.
 */
export class Migration20261020160000 extends Migration {
  override async up(): Promise<void> {
    // keep_slug ← drop_slug (same display name, different slug)
    const merges: Array<[string, string]> = [
      ["baby-en-kind", "baby-kind"],
      ["beauty-en-verzorging", "beauty-verzorging"],
      ["klus-en-gereedschap", "klus-gereedschap"],
      ["plant-en-bloem", "plant-bloem"],
      ["tassen-en-accessoires", "tassen-accessoires"],
    ]

    for (const [keepSlug, dropSlug] of merges) {
      // Re-parent any children hanging off the duplicate root.
      this.addSql(`
        UPDATE pc_category AS child
        SET parent_category_id = keep.id,
            updated_at = now()
        FROM pc_category AS drop_cat
        JOIN pc_category AS keep ON keep.slug = '${keepSlug}' AND keep.deleted_at IS NULL
        WHERE drop_cat.slug = '${dropSlug}'
          AND drop_cat.deleted_at IS NULL
          AND child.parent_category_id = drop_cat.id
          AND child.deleted_at IS NULL;
      `)

      // Move product links that are not already on the keep category.
      this.addSql(`
        UPDATE pc_product_category AS link
        SET category_id = keep.id
        FROM pc_category AS drop_cat
        JOIN pc_category AS keep ON keep.slug = '${keepSlug}' AND keep.deleted_at IS NULL
        WHERE drop_cat.slug = '${dropSlug}'
          AND drop_cat.deleted_at IS NULL
          AND link.category_id = drop_cat.id
          AND NOT EXISTS (
            SELECT 1 FROM pc_product_category existing
            WHERE existing.product_id = link.product_id
              AND existing.category_id = keep.id
          );
      `)

      // Drop remaining duplicate links (product already on keep).
      this.addSql(`
        DELETE FROM pc_product_category AS link
        USING pc_category AS drop_cat
        WHERE drop_cat.slug = '${dropSlug}'
          AND drop_cat.deleted_at IS NULL
          AND link.category_id = drop_cat.id;
      `)

      // Soft-delete the duplicate root.
      this.addSql(`
        UPDATE pc_category
        SET deleted_at = now(), updated_at = now()
        WHERE slug = '${dropSlug}'
          AND deleted_at IS NULL
          AND parent_category_id IS NULL;
      `)

      // 301 former_slug → keep (ADR-0042 via pc_translation).
      this.addSql(`
        INSERT INTO pc_translation (
          id, entity_type, entity_id, field_name, language_code, value,
          translation_status, translation_version, source_version, origin,
          created_at, updated_at
        )
        SELECT
          'pctr_' || upper(substr(md5('${dropSlug}' || '${keepSlug}' || 'former'), 1, 26)),
          'category',
          keep.id,
          'former_slug',
          '${dropSlug}',
          '${keepSlug}',
          'Gepubliceerd',
          1,
          1,
          'manual',
          now(),
          now()
        FROM pc_category AS keep
        WHERE keep.slug = '${keepSlug}'
          AND keep.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM pc_translation t
            WHERE t.deleted_at IS NULL
              AND t.entity_type = 'category'
              AND t.field_name = 'former_slug'
              AND t.language_code = '${dropSlug}'
          );
      `)
    }

    const creates: Array<[string, string, string]> = [
      ["Woonaccessoires", "woonaccessoires", "wonen"],
      ["Woontextiel", "woontextiel", "wonen"],
      ["Kaarsen & Geur", "kaarsen-geur", "wonen"],
      ["Inbouwapparatuur", "inbouwapparatuur", "huishouden"],
      ["Kleine keukenapparaten", "kleine-keukenapparaten", "huishouden"],
      ["Wearables & Smartwatches", "wearables", "elektronica"],
      ["Portemonnees & Kleine lederwaren", "portemonnees", "tassen-en-accessoires"],
      ["Riemen & Accessoires", "riemen-accessoires", "tassen-en-accessoires"],
      ["Sandalen", "sandalen", "schoenen"],
      ["Zwem- & Watersport", "zwem-watersport", "sport"],
      ["Teamsport", "teamsport", "sport"],
      ["Print & Papier", "print-papier", "kantoor"],
      ["Barbecue & Buitenkeuken", "barbecue-buitenkeuken", "tuin"],
    ]

    for (const [name, slug, parentSlug] of creates) {
      this.addSql(`
        INSERT INTO pc_category (id, name, slug, parent_category_id, created_at, updated_at)
        SELECT
          'pcgy_' || upper(substr(md5('${slug}' || clock_timestamp()::text), 1, 26)),
          '${name.replace(/'/g, "''")}',
          '${slug}',
          parent.id,
          now(),
          now()
        FROM pc_category AS parent
        WHERE parent.deleted_at IS NULL
          AND parent.slug = '${parentSlug}'
          AND NOT EXISTS (
            SELECT 1 FROM pc_category c
            WHERE c.deleted_at IS NULL AND c.slug = '${slug}'
          );
      `)
      this.addSql(`
        UPDATE pc_category AS child
        SET parent_category_id = parent.id,
            updated_at = now()
        FROM pc_category AS parent
        WHERE parent.deleted_at IS NULL
          AND child.deleted_at IS NULL
          AND parent.slug = '${parentSlug}'
          AND child.slug = '${slug}'
          AND child.parent_category_id IS DISTINCT FROM parent.id;
      `)
    }
  }

  override async down(): Promise<void> {
    this.addSql(`
      UPDATE pc_category
      SET deleted_at = now(), updated_at = now()
      WHERE deleted_at IS NULL
        AND slug IN (
          'woonaccessoires','woontextiel','kaarsen-geur',
          'inbouwapparatuur','kleine-keukenapparaten',
          'wearables','portemonnees','riemen-accessoires','sandalen',
          'zwem-watersport','teamsport','print-papier','barbecue-buitenkeuken'
        );
    `)
    // Do not resurrect soft-deleted duplicate roots automatically.
  }
}
