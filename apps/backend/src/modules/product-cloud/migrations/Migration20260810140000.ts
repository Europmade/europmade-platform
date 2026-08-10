import { Migration } from "@mikro-orm/migrations"

/**
 * ADR-0039 — Translation Layer MVP:
 * source_version, origin, updated_by, status Verouderd/Mislukt.
 */
export class Migration20260810140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "pc_translation" drop constraint if exists "pc_translation_translation_status_check";`
    )
    this.addSql(
      `alter table if exists "pc_translation" add constraint "pc_translation_translation_status_check" check ("translation_status" in ('Ontbreekt', 'Concept', 'Machine', 'Beoordeeld', 'Gepubliceerd', 'Verouderd', 'Mislukt'));`
    )

    this.addSql(
      `alter table if exists "pc_translation" add column if not exists "source_version" integer not null default 1;`
    )
    this.addSql(
      `alter table if exists "pc_translation" add column if not exists "origin" text check ("origin" in ('machine', 'manual')) not null default 'machine';`
    )
    this.addSql(
      `alter table if exists "pc_translation" add column if not exists "updated_by" text null;`
    )

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_translation_translation_status" ON "pc_translation" ("translation_status") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `drop index if exists "IDX_pc_translation_translation_status";`
    )
    this.addSql(
      `alter table if exists "pc_translation" drop column if exists "updated_by";`
    )
    this.addSql(
      `alter table if exists "pc_translation" drop column if exists "origin";`
    )
    this.addSql(
      `alter table if exists "pc_translation" drop column if exists "source_version";`
    )
    this.addSql(
      `alter table if exists "pc_translation" drop constraint if exists "pc_translation_translation_status_check";`
    )
    this.addSql(
      `alter table if exists "pc_translation" add constraint "pc_translation_translation_status_check" check ("translation_status" in ('Ontbreekt', 'Concept', 'Machine', 'Beoordeeld', 'Gepubliceerd'));`
    )
  }
}
