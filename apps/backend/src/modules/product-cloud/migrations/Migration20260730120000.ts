import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Architecture review — DB integrity (bovenop Migration20260730100000):
 * - FK change_proposal.product_id → pc_product
 * - Safe same-module FKs (match_candidate / merge_record / split_record)
 * - Partial unique: max één actieve ownership_record per product
 * - Relation-indexes die DML voor belongsTo verwacht
 */
export class Migration20260730120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "change_proposal" add constraint "change_proposal_product_id_foreign" foreign key ("product_id") references "pc_product" ("id") on update cascade;`);

    this.addSql(`alter table if exists "match_candidate" add constraint "match_candidate_product_id_a_foreign" foreign key ("product_id_a") references "pc_product" ("id") on update cascade;`);
    this.addSql(`alter table if exists "match_candidate" add constraint "match_candidate_product_id_b_foreign" foreign key ("product_id_b") references "pc_product" ("id") on update cascade;`);

    this.addSql(`alter table if exists "merge_record" add constraint "merge_record_surviving_product_id_foreign" foreign key ("surviving_product_id") references "pc_product" ("id") on update cascade;`);
    this.addSql(`alter table if exists "merge_record" add constraint "merge_record_merged_product_id_foreign" foreign key ("merged_product_id") references "pc_product" ("id") on update cascade;`);
    this.addSql(`alter table if exists "merge_record" add constraint "merge_record_match_candidate_id_foreign" foreign key ("match_candidate_id") references "match_candidate" ("id") on update cascade on delete set null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_merge_record_surviving_product_id" ON "merge_record" ("surviving_product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_merge_record_merged_product_id" ON "merge_record" ("merged_product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_merge_record_match_candidate_id" ON "merge_record" ("match_candidate_id") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "split_record" add constraint "split_record_original_product_id_foreign" foreign key ("original_product_id") references "pc_product" ("id") on update cascade;`);
    this.addSql(`alter table if exists "split_record" add constraint "split_record_new_product_id_foreign" foreign key ("new_product_id") references "pc_product" ("id") on update cascade;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_split_record_original_product_id" ON "split_record" ("original_product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_split_record_new_product_id" ON "split_record" ("new_product_id") WHERE deleted_at IS NULL;`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ownership_record_product_id_active_unique" ON "ownership_record" ("product_id") WHERE deleted_at IS NULL AND valid_until IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_ownership_record_product_id_active_unique";`);

    this.addSql(`drop index if exists "IDX_split_record_new_product_id";`);
    this.addSql(`drop index if exists "IDX_split_record_original_product_id";`);
    this.addSql(`alter table if exists "split_record" drop constraint if exists "split_record_new_product_id_foreign";`);
    this.addSql(`alter table if exists "split_record" drop constraint if exists "split_record_original_product_id_foreign";`);

    this.addSql(`drop index if exists "IDX_merge_record_match_candidate_id";`);
    this.addSql(`drop index if exists "IDX_merge_record_merged_product_id";`);
    this.addSql(`drop index if exists "IDX_merge_record_surviving_product_id";`);
    this.addSql(`alter table if exists "merge_record" drop constraint if exists "merge_record_match_candidate_id_foreign";`);
    this.addSql(`alter table if exists "merge_record" drop constraint if exists "merge_record_merged_product_id_foreign";`);
    this.addSql(`alter table if exists "merge_record" drop constraint if exists "merge_record_surviving_product_id_foreign";`);

    this.addSql(`alter table if exists "match_candidate" drop constraint if exists "match_candidate_product_id_b_foreign";`);
    this.addSql(`alter table if exists "match_candidate" drop constraint if exists "match_candidate_product_id_a_foreign";`);

    this.addSql(`alter table if exists "change_proposal" drop constraint if exists "change_proposal_product_id_foreign";`);
  }

}
