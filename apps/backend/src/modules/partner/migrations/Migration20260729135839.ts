import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260729135839 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller" add column if not exists "review_note" text null, add column if not exists "identity_document_file_id" text null, add column if not exists "chamber_of_commerce_extract_file_id" text null, add column if not exists "production_proof_file_id" text null, add column if not exists "authorization_proof_file_id" text null, add column if not exists "additional_certifications_file_id" text null, add column if not exists "is_blocked" boolean not null default false, add column if not exists "blocked_reason" text null, add column if not exists "blocked_at" timestamptz null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_is_blocked" ON "seller" ("is_blocked") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_seller_is_blocked";`);
    this.addSql(`alter table if exists "seller" drop column if exists "review_note", drop column if exists "identity_document_file_id", drop column if exists "chamber_of_commerce_extract_file_id", drop column if exists "production_proof_file_id", drop column if exists "authorization_proof_file_id", drop column if exists "additional_certifications_file_id", drop column if exists "is_blocked", drop column if exists "blocked_reason", drop column if exists "blocked_at";`);
  }

}
