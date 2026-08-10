import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * ADR-0037 — Product Cloud central layer extensions:
 * document, translation, product_relation, category.slug,
 * attribute metadata, product_version use_case_tags / source_language.
 */
export class Migration20260810120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "pc_category" add column if not exists "slug" text null;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pc_category_slug_unique" ON "pc_category" ("slug") WHERE deleted_at IS NULL AND slug IS NOT NULL;`
    )

    this.addSql(
      `alter table if exists "attribute_definition" add column if not exists "code" text null;`
    )
    this.addSql(
      `alter table if exists "attribute_definition" add column if not exists "unit" text null;`
    )
    this.addSql(
      `alter table if exists "attribute_definition" add column if not exists "is_filterable" boolean not null default true;`
    )
    this.addSql(
      `alter table if exists "attribute_definition" add column if not exists "is_comparable" boolean not null default true;`
    )
    this.addSql(
      `alter table if exists "attribute_definition" add column if not exists "sort_order" integer not null default 0;`
    )
    this.addSql(
      `alter table if exists "attribute_definition" add column if not exists "option_values" text null;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_attribute_definition_category_id_code_unique" ON "attribute_definition" ("category_id", "code") WHERE deleted_at IS NULL AND code IS NOT NULL;`
    )

    this.addSql(
      `alter table if exists "product_version" add column if not exists "use_case_tags" text null;`
    )
    this.addSql(
      `alter table if exists "product_version" add column if not exists "source_language_code" text null;`
    )

    this.addSql(`create table if not exists "pc_document" (
      "id" text not null,
      "product_version_id" text null,
      "distributor_authorization_id" text null,
      "document_type" text check ("document_type" in (
        'CE-certificaat',
        'Overig compliance-document',
        'Autorisatiebewijs',
        'Handleiding',
        'Veiligheidsinformatieblad',
        'Garantiebewijs',
        'Conformiteitsverklaring'
      )) not null,
      "storage_reference" text not null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "pc_document_pkey" primary key ("id")
    );`)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_document_product_version_id" ON "pc_document" ("product_version_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_document_distributor_authorization_id" ON "pc_document" ("distributor_authorization_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "pc_document" add constraint "pc_document_product_version_id_foreign" foreign key ("product_version_id") references "product_version" ("id") on update cascade on delete set null;`
    )

    this.addSql(`create table if not exists "pc_translation" (
      "id" text not null,
      "entity_type" text check ("entity_type" in ('product_version', 'category', 'attribute_definition')) not null,
      "entity_id" text not null,
      "field_name" text not null,
      "language_code" text not null,
      "value" text not null,
      "source_language_code" text null,
      "source_value" text null,
      "translation_status" text check ("translation_status" in (
        'Ontbreekt', 'Concept', 'Machine', 'Beoordeeld', 'Gepubliceerd'
      )) not null default 'Concept',
      "translation_version" integer not null default 1,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "pc_translation_pkey" primary key ("id")
    );`)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pc_translation_entity_field_lang_unique" ON "pc_translation" ("entity_type", "entity_id", "field_name", "language_code") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_translation_entity" ON "pc_translation" ("entity_type", "entity_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_translation_language_code" ON "pc_translation" ("language_code") WHERE deleted_at IS NULL;`
    )

    this.addSql(`create table if not exists "pc_product_relation" (
      "id" text not null,
      "from_product_id" text not null,
      "to_product_id" text not null,
      "relation_type" text check ("relation_type" in (
        'Vergelijkbaar', 'Accessoire', 'Gerelateerd', 'VaakSamenGekocht', 'Alternatief'
      )) not null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "pc_product_relation_pkey" primary key ("id")
    );`)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pc_product_relation_unique" ON "pc_product_relation" ("from_product_id", "to_product_id", "relation_type") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_product_relation_from" ON "pc_product_relation" ("from_product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pc_product_relation_to" ON "pc_product_relation" ("to_product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "pc_product_relation" add constraint "pc_product_relation_from_product_id_foreign" foreign key ("from_product_id") references "pc_product" ("id") on update cascade;`
    )
    this.addSql(
      `alter table if exists "pc_product_relation" add constraint "pc_product_relation_to_product_id_foreign" foreign key ("to_product_id") references "pc_product" ("id") on update cascade;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "pc_product_relation" drop constraint if exists "pc_product_relation_to_product_id_foreign";`
    )
    this.addSql(
      `alter table if exists "pc_product_relation" drop constraint if exists "pc_product_relation_from_product_id_foreign";`
    )
    this.addSql(`drop table if exists "pc_product_relation" cascade;`)
    this.addSql(`drop table if exists "pc_translation" cascade;`)
    this.addSql(
      `alter table if exists "pc_document" drop constraint if exists "pc_document_product_version_id_foreign";`
    )
    this.addSql(`drop table if exists "pc_document" cascade;`)

    this.addSql(
      `alter table if exists "product_version" drop column if exists "source_language_code";`
    )
    this.addSql(
      `alter table if exists "product_version" drop column if exists "use_case_tags";`
    )

    this.addSql(
      `drop index if exists "IDX_attribute_definition_category_id_code_unique";`
    )
    this.addSql(
      `alter table if exists "attribute_definition" drop column if exists "option_values";`
    )
    this.addSql(
      `alter table if exists "attribute_definition" drop column if exists "sort_order";`
    )
    this.addSql(
      `alter table if exists "attribute_definition" drop column if exists "is_comparable";`
    )
    this.addSql(
      `alter table if exists "attribute_definition" drop column if exists "is_filterable";`
    )
    this.addSql(
      `alter table if exists "attribute_definition" drop column if exists "unit";`
    )
    this.addSql(
      `alter table if exists "attribute_definition" drop column if exists "code";`
    )

    this.addSql(`drop index if exists "IDX_pc_category_slug_unique";`)
    this.addSql(
      `alter table if exists "pc_category" drop column if exists "slug";`
    )
  }
}
