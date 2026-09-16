import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Allow IMPORT_REF for internal demo/import references (Fase 5B). */
export class Migration20260831120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "identifier" drop constraint if exists "identifier_identifier_type_check";`
    )
    this.addSql(
      `alter table if exists "identifier" add constraint "identifier_identifier_type_check" check ("identifier_type" in ('GTIN', 'MPN', 'IMPORT_REF'));`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "identifier" drop constraint if exists "identifier_identifier_type_check";`
    )
    this.addSql(
      `alter table if exists "identifier" add constraint "identifier_identifier_type_check" check ("identifier_type" in ('GTIN', 'MPN'));`
    )
  }
}
