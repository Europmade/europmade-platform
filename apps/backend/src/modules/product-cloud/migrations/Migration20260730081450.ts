import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260730081450 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "attribute_value" drop constraint if exists "attribute_value_product_version_id_attribute_definition_id_unique";`);
    this.addSql(`alter table if exists "product_version" drop constraint if exists "product_version_product_id_version_number_unique";`);
    this.addSql(`alter table if exists "pc_product_category" drop constraint if exists "pc_product_category_product_id_category_id_unique";`);
    this.addSql(`alter table if exists "identifier" drop constraint if exists "identifier_identifier_value_identifier_type_country_scope_unique";`);
    this.addSql(`alter table if exists "attribute_definition" drop constraint if exists "attribute_definition_category_id_name_unique";`);
    this.addSql(`alter table if exists "match_candidate" drop constraint if exists "match_candidate_product_id_a_product_id_b_unique";`);
    this.addSql(`create table if not exists "match_candidate" ("id" text not null, "product_id_a" text not null, "product_id_b" text not null, "status" text check ("status" in ('Kandidaat', 'Merge uitgevoerd', 'Geen actie')) not null, "ai_metadata_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "match_candidate_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_match_candidate_deleted_at" ON "match_candidate" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_match_candidate_product_id_a_product_id_b_unique" ON "match_candidate" ("product_id_a", "product_id_b") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_match_candidate_product_id_a" ON "match_candidate" ("product_id_a") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_match_candidate_product_id_b" ON "match_candidate" ("product_id_b") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_match_candidate_status" ON "match_candidate" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "merge_record" ("id" text not null, "surviving_product_id" text not null, "merged_product_id" text not null, "match_candidate_id" text null, "performed_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "merge_record_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_merge_record_deleted_at" ON "merge_record" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pc_category" ("id" text not null, "parent_category_id" text null, "name" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pc_category_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_category_parent_category_id" ON "pc_category" ("parent_category_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_category_deleted_at" ON "pc_category" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "attribute_definition" ("id" text not null, "category_id" text not null, "name" text not null, "data_type" text check ("data_type" in ('Numeriek', 'Keuzelijst', 'Tekst-met-eenheid')) not null, "is_required" boolean not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "attribute_definition_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_attribute_definition_category_id" ON "attribute_definition" ("category_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_attribute_definition_deleted_at" ON "attribute_definition" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_attribute_definition_category_id_name_unique" ON "attribute_definition" ("category_id", "name") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_family" ("id" text not null, "name" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_family_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_family_deleted_at" ON "product_family" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pc_product" ("id" text not null, "product_family_id" text null, "brand_id" text not null, "manufacturer_id" text not null, "current_owner_seller_id" text not null, "lifecycle_status" text check ("lifecycle_status" in ('Retailer Created', 'Concept gecontroleerd', 'Actief', 'Verified™', 'Uitlopend', 'Niet meer leverbaar', 'Gearchiveerd')) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pc_product_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_product_product_family_id" ON "pc_product" ("product_family_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_product_deleted_at" ON "pc_product" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_product_brand_id" ON "pc_product" ("brand_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_product_manufacturer_id" ON "pc_product" ("manufacturer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_product_current_owner_seller_id" ON "pc_product" ("current_owner_seller_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pc_product_variant" ("id" text not null, "product_id" text not null, "variant_type" text check ("variant_type" in ('Kleur', 'Maat', 'Inhoud', 'Vermogen', 'Spanning', 'Materiaal', 'Uitvoering', 'Bundel')) not null, "variant_value" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pc_product_variant_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_product_variant_product_id" ON "pc_product_variant" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_product_variant_deleted_at" ON "pc_product_variant" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "identifier" ("id" text not null, "product_variant_id" text not null, "identifier_type" text check ("identifier_type" in ('GTIN', 'MPN')) not null, "identifier_value" text not null, "country_scope" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "identifier_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_identifier_product_variant_id" ON "identifier" ("product_variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_identifier_deleted_at" ON "identifier" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_identifier_identifier_value_identifier_type_country_scope_unique" ON "identifier" ("identifier_value", "identifier_type", "country_scope") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_identifier_identifier_value" ON "identifier" ("identifier_value") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pc_product_category" ("id" text not null, "product_id" text not null, "category_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pc_product_category_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_product_category_product_id" ON "pc_product_category" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_product_category_category_id" ON "pc_product_category" ("category_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_product_category_deleted_at" ON "pc_product_category" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pc_product_category_product_id_category_id_unique" ON "pc_product_category" ("product_id", "category_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ownership_record" ("id" text not null, "product_id" text not null, "seller_id" text not null, "valid_from" timestamptz not null, "valid_until" timestamptz null, "transfer_reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ownership_record_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ownership_record_product_id" ON "ownership_record" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ownership_record_deleted_at" ON "ownership_record" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ownership_record_seller_id" ON "ownership_record" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ownership_record_valid_from" ON "ownership_record" ("valid_from") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ownership_record_valid_until" ON "ownership_record" ("valid_until") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "dispute" ("id" text not null, "product_id" text not null, "status" text check ("status" in ('Open', 'Bevestiging huidige eigenaar', 'Overdracht', 'Tijdelijke terugzetting')) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dispute_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dispute_product_id" ON "dispute" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dispute_deleted_at" ON "dispute" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dispute_status" ON "dispute" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "claim" ("id" text not null, "product_id" text not null, "claimant_seller_id" text not null, "status" text check ("status" in ('In beoordeling', 'Goedgekeurd', 'Afgewezen')) not null, "ai_metadata_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "claim_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_product_id" ON "claim" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_deleted_at" ON "claim" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_status" ON "claim" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_version" ("id" text not null, "product_id" text not null, "version_number" integer not null, "title" text not null, "description" text not null, "publication_status" text check ("publication_status" in ('Concept', 'In review', 'Goedgekeurd', 'Gepubliceerd', 'Gearchiveerd', 'Verwijderd')) not null, "created_by_seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_version_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_version_product_id" ON "product_version" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_version_deleted_at" ON "product_version" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_version_product_id_version_number_unique" ON "product_version" ("product_id", "version_number") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_version_publication_status" ON "product_version" ("publication_status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "attribute_value" ("id" text not null, "product_version_id" text not null, "attribute_definition_id" text not null, "value" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "attribute_value_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_attribute_value_product_version_id" ON "attribute_value" ("product_version_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_attribute_value_attribute_definition_id" ON "attribute_value" ("attribute_definition_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_attribute_value_deleted_at" ON "attribute_value" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_attribute_value_product_version_id_attribute_definition_id_unique" ON "attribute_value" ("product_version_id", "attribute_definition_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "split_record" ("id" text not null, "original_product_id" text not null, "new_product_id" text not null, "performed_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "split_record_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_split_record_deleted_at" ON "split_record" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "pc_category" add constraint "pc_category_parent_category_id_foreign" foreign key ("parent_category_id") references "pc_category" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "attribute_definition" add constraint "attribute_definition_category_id_foreign" foreign key ("category_id") references "pc_category" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pc_product" add constraint "pc_product_product_family_id_foreign" foreign key ("product_family_id") references "product_family" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "pc_product_variant" add constraint "pc_product_variant_product_id_foreign" foreign key ("product_id") references "pc_product" ("id") on update cascade;`);

    this.addSql(`alter table if exists "identifier" add constraint "identifier_product_variant_id_foreign" foreign key ("product_variant_id") references "pc_product_variant" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pc_product_category" add constraint "pc_product_category_product_id_foreign" foreign key ("product_id") references "pc_product" ("id") on update cascade;`);
    this.addSql(`alter table if exists "pc_product_category" add constraint "pc_product_category_category_id_foreign" foreign key ("category_id") references "pc_category" ("id") on update cascade;`);

    this.addSql(`alter table if exists "ownership_record" add constraint "ownership_record_product_id_foreign" foreign key ("product_id") references "pc_product" ("id") on update cascade;`);

    this.addSql(`alter table if exists "dispute" add constraint "dispute_product_id_foreign" foreign key ("product_id") references "pc_product" ("id") on update cascade;`);

    this.addSql(`alter table if exists "claim" add constraint "claim_product_id_foreign" foreign key ("product_id") references "pc_product" ("id") on update cascade;`);

    this.addSql(`alter table if exists "product_version" add constraint "product_version_product_id_foreign" foreign key ("product_id") references "pc_product" ("id") on update cascade;`);

    this.addSql(`alter table if exists "attribute_value" add constraint "attribute_value_product_version_id_foreign" foreign key ("product_version_id") references "product_version" ("id") on update cascade;`);
    this.addSql(`alter table if exists "attribute_value" add constraint "attribute_value_attribute_definition_id_foreign" foreign key ("attribute_definition_id") references "attribute_definition" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "pc_category" drop constraint if exists "pc_category_parent_category_id_foreign";`);

    this.addSql(`alter table if exists "attribute_definition" drop constraint if exists "attribute_definition_category_id_foreign";`);

    this.addSql(`alter table if exists "pc_product_category" drop constraint if exists "pc_product_category_category_id_foreign";`);

    this.addSql(`alter table if exists "attribute_value" drop constraint if exists "attribute_value_attribute_definition_id_foreign";`);

    this.addSql(`alter table if exists "pc_product" drop constraint if exists "pc_product_product_family_id_foreign";`);

    this.addSql(`alter table if exists "pc_product_variant" drop constraint if exists "pc_product_variant_product_id_foreign";`);

    this.addSql(`alter table if exists "pc_product_category" drop constraint if exists "pc_product_category_product_id_foreign";`);

    this.addSql(`alter table if exists "ownership_record" drop constraint if exists "ownership_record_product_id_foreign";`);

    this.addSql(`alter table if exists "dispute" drop constraint if exists "dispute_product_id_foreign";`);

    this.addSql(`alter table if exists "claim" drop constraint if exists "claim_product_id_foreign";`);

    this.addSql(`alter table if exists "product_version" drop constraint if exists "product_version_product_id_foreign";`);

    this.addSql(`alter table if exists "identifier" drop constraint if exists "identifier_product_variant_id_foreign";`);

    this.addSql(`alter table if exists "attribute_value" drop constraint if exists "attribute_value_product_version_id_foreign";`);

    this.addSql(`drop table if exists "match_candidate" cascade;`);

    this.addSql(`drop table if exists "merge_record" cascade;`);

    this.addSql(`drop table if exists "pc_category" cascade;`);

    this.addSql(`drop table if exists "attribute_definition" cascade;`);

    this.addSql(`drop table if exists "product_family" cascade;`);

    this.addSql(`drop table if exists "pc_product" cascade;`);

    this.addSql(`drop table if exists "pc_product_variant" cascade;`);

    this.addSql(`drop table if exists "identifier" cascade;`);

    this.addSql(`drop table if exists "pc_product_category" cascade;`);

    this.addSql(`drop table if exists "ownership_record" cascade;`);

    this.addSql(`drop table if exists "dispute" cascade;`);

    this.addSql(`drop table if exists "claim" cascade;`);

    this.addSql(`drop table if exists "product_version" cascade;`);

    this.addSql(`drop table if exists "attribute_value" cascade;`);

    this.addSql(`drop table if exists "split_record" cascade;`);
  }

}
