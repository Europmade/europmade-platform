import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Category CMS proposals and generation costs.
 * Does not read or write cms_category draft/published documents.
 */
export class Migration20261106140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "cms_category_proposal" (
        "id" text NOT NULL,
        "category_slug" text NOT NULL,
        "category_id" text NOT NULL,
        "profile" text NOT NULL,
        "block_id" text NOT NULL,
        "block_type" text NOT NULL,
        "fact_fingerprint" text NOT NULL,
        "status" text NOT NULL,
        "confidence" text NOT NULL,
        "generation_reason" text NOT NULL,
        "used_facts" jsonb NOT NULL,
        "missing" jsonb NOT NULL,
        "missing_locales" jsonb NOT NULL,
        "content" jsonb NULL,
        "provider_id" text NOT NULL,
        "model_name" text NULL,
        "prompt_version" text NOT NULL,
        "locale_source" text NOT NULL DEFAULT 'nl',
        "generated_at" timestamptz NOT NULL,
        "applied_draft_revision" integer NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "cms_category_proposal_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "cms_category_proposal_profile_check"
          CHECK ("profile" IN ('level_1', 'level_2', 'level_3')),
        CONSTRAINT "cms_category_proposal_status_check"
          CHECK ("status" IN ('proposed', 'accepted', 'modified', 'rejected', 'outdated')),
        CONSTRAINT "cms_category_proposal_confidence_check"
          CHECK ("confidence" IN ('blocked', 'partial', 'factual'))
      );
    `)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_category_proposal_fingerprint"
      ON "cms_category_proposal" ("category_slug", "profile", "block_type", "fact_fingerprint")
      WHERE "deleted_at" IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_category_proposal_slug_status"
      ON "cms_category_proposal" ("category_slug", "status")
      WHERE "deleted_at" IS NULL;
    `)
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "cms_category_proposal_cost" (
        "id" text NOT NULL,
        "proposal_id" text NOT NULL,
        "category_slug" text NOT NULL,
        "block_type" text NOT NULL,
        "locale" text NOT NULL,
        "provider_id" text NOT NULL,
        "model_name" text NULL,
        "input_tokens" integer NULL,
        "output_tokens" integer NULL,
        "currency" text NULL,
        "amount_minor" integer NULL,
        "generated_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "cms_category_proposal_cost_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "cms_category_proposal_cost_locale_check"
          CHECK ("locale" IN ('nl', 'en', 'de', 'fr')),
        CONSTRAINT "cms_category_proposal_cost_proposal_fk"
          FOREIGN KEY ("proposal_id") REFERENCES "cms_category_proposal" ("id")
      );
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_category_proposal_cost_proposal"
      ON "cms_category_proposal_cost" ("proposal_id")
      WHERE "deleted_at" IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_category_proposal_cost_slug"
      ON "cms_category_proposal_cost" ("category_slug")
      WHERE "deleted_at" IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "cms_category_proposal_cost";`)
    this.addSql(`DROP TABLE IF EXISTS "cms_category_proposal";`)
  }
}
