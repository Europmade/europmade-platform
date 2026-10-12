import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Een webhook-nonce mag maar één keer in audit_log staan.
 * Bestaande rijen blijven ongemoeid. Er wordt niets verzonden.
 */
export class Migration20261012100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_audit_log_delivery_webhook_nonce" ON "audit_log" ("entity_id") WHERE "entity_type" = 'delivery_webhook' AND deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_audit_log_delivery_webhook_nonce";`)
  }
}
