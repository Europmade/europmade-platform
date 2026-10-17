import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Seller SKU belongs to the product (identifier), not to one market offer.
 * Drop the per-seller unique index so the same SKU can exist on every region
 * of that product. A different product of the same seller still conflicts;
 * that rule is enforced in application code.
 *
 * Existing multi-market rows are aligned to the earliest SKU of that
 * seller+identifier only when that SKU is not already used on another product.
 */
export class Migration20261014193000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_offer_seller_sku_unique";`)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_offer_seller_sku" ON "offer" ("seller_id", "seller_sku") WHERE deleted_at IS NULL AND seller_sku IS NOT NULL;`
    )
    this.addSql(`
      WITH canonical AS (
        SELECT DISTINCT ON (seller_id, identifier_id)
          seller_id,
          identifier_id,
          seller_sku AS canonical_sku
        FROM "offer"
        WHERE deleted_at IS NULL
          AND seller_sku IS NOT NULL
        ORDER BY seller_id, identifier_id, created_at ASC, id ASC
      )
      UPDATE "offer" AS o
      SET seller_sku = c.canonical_sku
      FROM canonical AS c
      WHERE o.deleted_at IS NULL
        AND o.seller_id = c.seller_id
        AND o.identifier_id = c.identifier_id
        AND o.seller_sku IS DISTINCT FROM c.canonical_sku
        AND NOT EXISTS (
          SELECT 1
          FROM "offer" AS other
          WHERE other.deleted_at IS NULL
            AND other.seller_id = c.seller_id
            AND other.identifier_id <> c.identifier_id
            AND other.seller_sku = c.canonical_sku
        );
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_offer_seller_sku";`)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_offer_seller_sku_unique" ON "offer" ("seller_id", "seller_sku") WHERE deleted_at IS NULL AND seller_sku IS NOT NULL;`
    )
  }
}
