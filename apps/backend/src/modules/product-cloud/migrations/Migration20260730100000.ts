import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * S3-03-04 — B.15 media, ADR-0009 change_proposal, ADR-0010 claim.decision_reason.
 */
export class Migration20260730100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "claim" add column if not exists "decision_reason" text null;`);

    this.addSql(`create table if not exists "pc_media" ("id" text not null, "product_version_id" text not null, "media_type" text check ("media_type" in ('Hoofdafbeelding', 'Overige afbeelding', 'Video')) not null, "storage_reference" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pc_media_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_media_product_version_id" ON "pc_media" ("product_version_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pc_media_deleted_at" ON "pc_media" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "change_proposal" ("id" text not null, "product_id" text not null, "submitter_seller_id" text not null, "proposed_title" text null, "proposed_description" text null, "toelichting" text not null, "status" text check ("status" in ('In behandeling', 'Goedgekeurd', 'Afgewezen')) not null, "decision_reason" text null, "decided_by_seller_id" text null, "decided_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "change_proposal_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_change_proposal_product_id" ON "change_proposal" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_change_proposal_submitter_seller_id" ON "change_proposal" ("submitter_seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_change_proposal_status" ON "change_proposal" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_change_proposal_deleted_at" ON "change_proposal" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "pc_media" add constraint "pc_media_product_version_id_foreign" foreign key ("product_version_id") references "product_version" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "pc_media" drop constraint if exists "pc_media_product_version_id_foreign";`);
    this.addSql(`drop table if exists "change_proposal" cascade;`);
    this.addSql(`drop table if exists "pc_media" cascade;`);
    this.addSql(`alter table if exists "claim" drop column if exists "decision_reason";`);
  }

}
