import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** ADR-0044 — European ownership claim + status events (company/manufacturer-level). */
export class Migration20260922120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
create table if not exists "european_ownership_claim" (
  "id" text not null,
  "manufacturer_id" text not null,
  "company_id" text null,
  "seller_id" text not null,
  "ownership_band" text check ("ownership_band" in ('eu_0','eu_1_25','eu_26_50','eu_51_75','eu_76_99','eu_100','unknown')) not null,
  "source" text check ("source" in ('brand_producer','factory','reseller','other')) not null,
  "status" text check ("status" in (
    'Niet opgegeven',
    'Opgegeven door aanbieder',
    'Bewijs aangeleverd',
    'Geverifieerd door EuropMade',
    'Bewijs opgevraagd',
    'Afgewezen'
  )) not null,
  "evidence_file_id" text null,
  "evidence_note" text null,
  "review_note" text null,
  "reviewed_by" text null,
  "reviewed_at" timestamptz null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "european_ownership_claim_pkey" primary key ("id")
);
`)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_european_ownership_claim_manufacturer_unique" ON "european_ownership_claim" ("manufacturer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_european_ownership_claim_status" ON "european_ownership_claim" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_european_ownership_claim_seller" ON "european_ownership_claim" ("seller_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_european_ownership_claim_deleted_at" ON "european_ownership_claim" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
create table if not exists "european_ownership_status_event" (
  "id" text not null,
  "claim_id" text not null,
  "manufacturer_id" text not null,
  "from_status" text null,
  "to_status" text not null,
  "note" text null,
  "actor_id" text null,
  "actor_type" text null,
  "decision" text null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "european_ownership_status_event_pkey" primary key ("id")
);
`)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_european_ownership_status_event_claim" ON "european_ownership_status_event" ("claim_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_european_ownership_status_event_manufacturer" ON "european_ownership_status_event" ("manufacturer_id");`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "european_ownership_status_event" cascade;`)
    this.addSql(`drop table if exists "european_ownership_claim" cascade;`)
  }
}
