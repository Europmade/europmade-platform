import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Brand import history and saved column-mapping profiles. */
export class Migration20261016100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "pc_import_batch" (
        "id" text not null,
        "source_key" text not null,
        "file_name" text null,
        "status" text not null,
        "source_language_code" text null,
        "summary" jsonb null,
        "issues" jsonb null,
        "created_by" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "pc_import_batch_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_import_batch_source" ON "pc_import_batch" ("source_key") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_import_batch_status" ON "pc_import_batch" ("status") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "pc_import_mapping_profile" (
        "id" text not null,
        "source_key" text not null,
        "header_signature" jsonb not null,
        "mapping" jsonb not null,
        "column_languages" jsonb null,
        "source_language_code" text null,
        "created_by" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "pc_import_mapping_profile_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_import_mapping_profile_source" ON "pc_import_mapping_profile" ("source_key") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pc_import_mapping_profile";`)
    this.addSql(`drop table if exists "pc_import_batch";`)
  }
}
