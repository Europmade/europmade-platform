import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Communicatievelden op de bestaande affiliate. Geen nieuwe tabel. */
export class Migration20261008150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "affiliate" add column if not exists "partner_type" text null;`
    )
    this.addSql(
      `alter table if exists "affiliate" add column if not exists "contact_name" text null;`
    )
    this.addSql(`alter table if exists "affiliate" add column if not exists "locale" text null;`)
    this.addSql(
      `alter table if exists "affiliate" add column if not exists "contacted_at" text null;`
    )
    this.addSql(
      `alter table if exists "affiliate" add column if not exists "communication_preferences" jsonb null;`
    )
    this.addSql(
      `alter table if exists "affiliate" add column if not exists "social_channels" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "affiliate" drop column if exists "partner_type";`)
    this.addSql(`alter table if exists "affiliate" drop column if exists "contact_name";`)
    this.addSql(`alter table if exists "affiliate" drop column if exists "locale";`)
    this.addSql(`alter table if exists "affiliate" drop column if exists "contacted_at";`)
    this.addSql(
      `alter table if exists "affiliate" drop column if exists "communication_preferences";`
    )
    this.addSql(`alter table if exists "affiliate" drop column if exists "social_channels";`)
  }
}
