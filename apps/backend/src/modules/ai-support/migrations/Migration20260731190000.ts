import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260731190000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "ai_metadata" (
        "id" text not null,
        "recommendation_type" text check ("recommendation_type" in ('Matchvergelijking', 'Consistentiecontrole', 'Risicoclassificatie', 'Fraude-signaal')) not null,
        "confidence_score" real not null,
        "explanation" text null,
        "subject_type" text not null,
        "subject_id" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "ai_metadata_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_metadata_subject_type_subject_id" ON "ai_metadata" ("subject_type", "subject_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_metadata_recommendation_type" ON "ai_metadata" ("recommendation_type") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ai_metadata" cascade;`)
  }
}
