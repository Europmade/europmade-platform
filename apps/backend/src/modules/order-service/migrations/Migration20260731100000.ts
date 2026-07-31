import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260731100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "em_return" add column if not exists "seller_decision_reason" text null;`);
    this.addSql(`alter table if exists "em_return" add column if not exists "force_reason" text null;`);
    this.addSql(`alter table if exists "em_return" add column if not exists "force_admin_user_id" text null;`);
    this.addSql(`alter table if exists "em_return" add column if not exists "cooling_off_ends_at" timestamptz null;`);
    this.addSql(`alter table if exists "em_return" add column if not exists "refund_amount" numeric null;`);
    this.addSql(`alter table if exists "em_return" add column if not exists "raw_refund_amount" jsonb null;`);
    this.addSql(`alter table if exists "em_return" add column if not exists "refund_status" text check ("refund_status" in ('Pending', 'Uitgevoerd', 'Geforceerd')) null;`);
    this.addSql(`alter table if exists "em_return" add column if not exists "refund_reference" text null;`);
    this.addSql(`alter table if exists "em_return" add column if not exists "refund_executed_at" timestamptz null;`);

    this.addSql(`update "em_return" set "reason" = coalesce("reason", 'Onbekend') where "reason" is null;`);
    this.addSql(`update "em_return" set "status" = 'Aangevraagd' where "status" is null;`);
    this.addSql(`update "em_return" set "cooling_off_ends_at" = coalesce("cooling_off_ends_at", "created_at" + interval '14 days') where "cooling_off_ends_at" is null;`);

    this.addSql(`alter table if exists "em_return" alter column "reason" set not null;`);
    this.addSql(`alter table if exists "em_return" alter column "status" set not null;`);
    this.addSql(`alter table if exists "em_return" alter column "cooling_off_ends_at" set not null;`);

    this.addSql(`alter table if exists "em_return" drop constraint if exists "em_return_status_check";`);
    this.addSql(`alter table if exists "em_return" add constraint "em_return_status_check" check ("status" in ('Aangevraagd', 'Bevestigd', 'Ontvangen', 'Verwerkt', 'Afgewezen', 'Geëscaleerd'));`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_return_status" ON "em_return" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_em_return_refund_status" ON "em_return" ("refund_status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_em_return_status";`);
    this.addSql(`drop index if exists "IDX_em_return_refund_status";`);
    this.addSql(`alter table if exists "em_return" drop constraint if exists "em_return_status_check";`);
    this.addSql(`alter table if exists "em_return" alter column "reason" drop not null;`);
    this.addSql(`alter table if exists "em_return" alter column "status" drop not null;`);
    this.addSql(`alter table if exists "em_return" drop column if exists "seller_decision_reason";`);
    this.addSql(`alter table if exists "em_return" drop column if exists "force_reason";`);
    this.addSql(`alter table if exists "em_return" drop column if exists "force_admin_user_id";`);
    this.addSql(`alter table if exists "em_return" drop column if exists "cooling_off_ends_at";`);
    this.addSql(`alter table if exists "em_return" drop column if exists "refund_amount";`);
    this.addSql(`alter table if exists "em_return" drop column if exists "raw_refund_amount";`);
    this.addSql(`alter table if exists "em_return" drop column if exists "refund_status";`);
    this.addSql(`alter table if exists "em_return" drop column if exists "refund_reference";`);
    this.addSql(`alter table if exists "em_return" drop column if exists "refund_executed_at";`);
  }

}
