import { Migration } from "@mikro-orm/migrations"

/**
 * Move European Ownership primary key from manufacturer → brand.
 * Backfills brand_id from pc_product for existing manufacturer-scoped claims.
 */
export class Migration20260923140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
alter table if exists "european_ownership_claim"
  add column if not exists "brand_id" text null;
`)
    this.addSql(`
alter table if exists "european_ownership_claim"
  alter column "manufacturer_id" drop not null;
`)
    this.addSql(`
alter table if exists "european_ownership_status_event"
  add column if not exists "brand_id" text null;
`)
    this.addSql(`
alter table if exists "european_ownership_status_event"
  alter column "manufacturer_id" drop not null;
`)

    // Prefer a real brand_* on products that share the claim's manufacturer.
    this.addSql(`
update "european_ownership_claim" c
set "brand_id" = sub.brand_id
from (
  select distinct on (p.manufacturer_id)
    p.manufacturer_id,
    p.brand_id
  from "pc_product" p
  where p.deleted_at is null
    and p.manufacturer_id is not null
    and p.brand_id like 'brand_%'
  order by p.manufacturer_id, p.updated_at desc nulls last
) sub
where c.deleted_at is null
  and c.brand_id is null
  and c.manufacturer_id = sub.manufacturer_id;
`)

    this.addSql(`
update "european_ownership_status_event" e
set "brand_id" = c.brand_id
from "european_ownership_claim" c
where e.claim_id = c.id
  and e.brand_id is null
  and c.brand_id is not null;
`)

    this.addSql(`
drop index if exists "IDX_european_ownership_claim_manufacturer_unique";
`)
    this.addSql(`
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_european_ownership_claim_brand_unique"
  ON "european_ownership_claim" ("brand_id")
  WHERE deleted_at IS NULL AND brand_id IS NOT NULL;
`)
    this.addSql(`
CREATE INDEX IF NOT EXISTS "IDX_european_ownership_claim_manufacturer_id"
  ON "european_ownership_claim" ("manufacturer_id")
  WHERE deleted_at IS NULL;
`)
    this.addSql(`
CREATE INDEX IF NOT EXISTS "IDX_european_ownership_status_event_brand"
  ON "european_ownership_status_event" ("brand_id");
`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_european_ownership_status_event_brand";`)
    this.addSql(`drop index if exists "IDX_european_ownership_claim_manufacturer_id";`)
    this.addSql(`drop index if exists "IDX_european_ownership_claim_brand_unique";`)
    this.addSql(`
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_european_ownership_claim_manufacturer_unique"
  ON "european_ownership_claim" ("manufacturer_id")
  WHERE deleted_at IS NULL;
`)
    this.addSql(`
alter table if exists "european_ownership_status_event" drop column if exists "brand_id";
`)
    this.addSql(`
alter table if exists "european_ownership_claim" drop column if exists "brand_id";
`)
  }
}
