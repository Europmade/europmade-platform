import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260815140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mfa_credential" ("id" text not null, "customer_id" text not null, "type" text not null default 'totp', "secret" text not null, "status" text not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mfa_credential_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mfa_credential_customer_id" ON "mfa_credential" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mfa_credential_customer_id_status" ON "mfa_credential" ("customer_id", "status") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "mfa_recovery_code" ("id" text not null, "customer_id" text not null, "code_hash" text not null, "used_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mfa_recovery_code_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mfa_recovery_code_customer_id" ON "mfa_recovery_code" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mfa_recovery_code_code_hash" ON "mfa_recovery_code" ("code_hash") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "mfa_challenge" ("id" text not null, "customer_id" text not null, "auth_token" text not null, "expires_at" timestamptz not null, "consumed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mfa_challenge_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mfa_challenge_customer_id" ON "mfa_challenge" ("customer_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mfa_challenge" cascade;`)
    this.addSql(`drop table if exists "mfa_recovery_code" cascade;`)
    this.addSql(`drop table if exists "mfa_credential" cascade;`)
  }
}
