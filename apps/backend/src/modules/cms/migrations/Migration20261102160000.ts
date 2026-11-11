import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Category CMS Published / Draft — schema + idempotente legacy-backfill.
 * Spec: docs/10-implementation/category-cms-published-draft.md §3
 *
 * Behoudt legacy kolommen `document` + `published` (drop in latere stap).
 * Raakt cms_banner / Product Cloud niet.
 */
export class Migration20261102160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE IF EXISTS "cms_category"
        ADD COLUMN IF NOT EXISTS "published_document" jsonb NULL,
        ADD COLUMN IF NOT EXISTS "published_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "published_by" text NULL,
        ADD COLUMN IF NOT EXISTS "published_version" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "published_note" text NULL,
        ADD COLUMN IF NOT EXISTS "draft_document" jsonb NULL,
        ADD COLUMN IF NOT EXISTS "draft_updated_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "draft_updated_by" text NULL,
        ADD COLUMN IF NOT EXISTS "draft_base_version" integer NULL,
        ADD COLUMN IF NOT EXISTS "draft_revision" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "draft_sync_state" text NOT NULL DEFAULT 'absent',
        ADD COLUMN IF NOT EXISTS "legacy_migrated_at" timestamptz NULL;
    `)

    this.addSql(`
      DO $$ BEGIN
        ALTER TABLE "cms_category"
          ADD CONSTRAINT "cms_category_draft_sync_state_check"
          CHECK ("draft_sync_state" IN ('absent', 'in_sync', 'unpublished_changes'));
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_category_draft_sync_state"
      ON "cms_category" ("draft_sync_state")
      WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "cms_category_revision" (
        "id" text NOT NULL,
        "category_slug" text NOT NULL,
        "kind" text NOT NULL DEFAULT 'publish',
        "version" integer NOT NULL,
        "document" jsonb NOT NULL,
        "superseded_document" jsonb NULL,
        "published_at" timestamptz NULL,
        "published_by" text NULL,
        "note" text NULL,
        "source" text NOT NULL DEFAULT 'editor_publish',
        "restored_from_version" integer NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "cms_category_revision_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "cms_category_revision_kind_check"
          CHECK ("kind" IN ('publish', 'restore_publish')),
        CONSTRAINT "cms_category_revision_source_check"
          CHECK ("source" IN ('editor_publish', 'restore_and_publish'))
      );
    `)

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_category_revision_slug_version_unique"
      ON "cms_category_revision" ("category_slug", "version")
      WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_category_revision_slug"
      ON "cms_category_revision" ("category_slug")
      WHERE "deleted_at" IS NULL;
    `)

    // Idempotente backfill — alleen rijen zonder legacy_migrated_at.
    this.addSql(`
      CREATE OR REPLACE FUNCTION cms_category_document_is_empty(doc jsonb)
      RETURNS boolean
      LANGUAGE sql
      IMMUTABLE
      AS $fn$
        SELECT CASE
          WHEN doc IS NULL THEN true
          WHEN doc = '{}'::jsonb THEN true
          WHEN COALESCE(doc->>'bannerId', '') <> '' THEN false
          WHEN doc->'banner' IS NOT NULL
               AND jsonb_typeof(doc->'banner') = 'object' THEN false
          WHEN COALESCE(doc->>'heroImage', '') <> '' THEN false
          WHEN EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(doc->'usps', '[]'::jsonb)) e
            WHERE length(trim(
              COALESCE(e->'title'->>'nl', '') || COALESCE(e->'title'->>'en', '') ||
              COALESCE(e->'title'->>'de', '') || COALESCE(e->'title'->>'fr', '') ||
              COALESCE(e->'body'->>'nl', '') || COALESCE(e->'body'->>'en', '') ||
              COALESCE(e->'body'->>'de', '') || COALESCE(e->'body'->>'fr', '')
            )) > 0
          ) THEN false
          WHEN EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(doc->'faq', '[]'::jsonb)) e
            WHERE length(trim(
              COALESCE(e->'question'->>'nl', '') || COALESCE(e->'question'->>'en', '') ||
              COALESCE(e->'answer'->>'nl', '') || COALESCE(e->'answer'->>'en', '')
            )) > 0
          ) THEN false
          WHEN length(trim(
            COALESCE(doc->'title'->>'nl', '') || COALESCE(doc->'title'->>'en', '') ||
            COALESCE(doc->'title'->>'de', '') || COALESCE(doc->'title'->>'fr', '') ||
            COALESCE(doc->'intro'->>'nl', '') || COALESCE(doc->'intro'->>'en', '') ||
            COALESCE(doc->'subtitle'->>'nl', '') || COALESCE(doc->'description'->>'nl', '') ||
            COALESCE(doc->'seoTitle'->>'nl', '') || COALESCE(doc->'seoDescription'->>'nl', '') ||
            COALESCE(doc->'madeInEurope'->>'nl', '') || COALESCE(doc->'productsTitle'->>'nl', '')
          )) > 0 THEN false
          ELSE true
        END;
      $fn$;
    `)

    this.addSql(`
      WITH pending AS (
        SELECT
          c.id,
          c.category_slug,
          c.published,
          c.document,
          c.updated_at,
          cms_category_document_is_empty(c.document) AS is_empty
        FROM "cms_category" c
        WHERE c.deleted_at IS NULL
          AND c.legacy_migrated_at IS NULL
      ),
      mapped AS (
        SELECT
          p.*,
          CASE
            WHEN p.published THEN p.document
            ELSE NULL
          END AS next_published_document,
          CASE
            WHEN p.published THEN 1
            ELSE 0
          END AS next_published_version,
          CASE
            WHEN p.published THEN COALESCE(p.updated_at, now())
            ELSE NULL
          END AS next_published_at,
          CASE
            WHEN p.published THEN 'legacy-migration'
            ELSE NULL
          END AS next_published_note,
          CASE
            WHEN p.published THEN p.document
            WHEN NOT p.is_empty THEN p.document
            ELSE NULL
          END AS next_draft_document,
          CASE
            WHEN p.published THEN 1
            ELSE NULL
          END AS next_draft_base_version,
          CASE
            WHEN p.published THEN 1
            WHEN NOT p.is_empty THEN 1
            ELSE 0
          END AS next_draft_revision,
          CASE
            WHEN p.published THEN 'in_sync'
            WHEN NOT p.is_empty THEN 'unpublished_changes'
            ELSE 'absent'
          END AS next_draft_sync_state
        FROM pending p
      )
      UPDATE "cms_category" c
      SET
        published_document = m.next_published_document,
        published_version = m.next_published_version,
        published_at = m.next_published_at,
        published_by = NULL,
        published_note = m.next_published_note,
        draft_document = m.next_draft_document,
        draft_updated_at = CASE
          WHEN m.next_draft_document IS NOT NULL THEN COALESCE(c.updated_at, now())
          ELSE NULL
        END,
        draft_updated_by = NULL,
        draft_base_version = m.next_draft_base_version,
        draft_revision = m.next_draft_revision,
        draft_sync_state = m.next_draft_sync_state,
        legacy_migrated_at = now(),
        updated_at = now()
      FROM mapped m
      WHERE c.id = m.id;
    `)

    this.addSql(`
      INSERT INTO "cms_category_revision" (
        "id",
        "category_slug",
        "kind",
        "version",
        "document",
        "superseded_document",
        "published_at",
        "published_by",
        "note",
        "source",
        "restored_from_version",
        "created_at",
        "updated_at",
        "deleted_at"
      )
      SELECT
        'cmscr_leg_' || c.id,
        c.category_slug,
        'publish',
        1,
        c.published_document,
        NULL,
        c.published_at,
        c.published_by,
        'legacy-migration',
        'editor_publish',
        NULL,
        now(),
        now(),
        NULL
      FROM "cms_category" c
      WHERE c.deleted_at IS NULL
        AND c.published_version >= 1
        AND c.published_document IS NOT NULL
        AND c.legacy_migrated_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "cms_category_revision" r
          WHERE r.deleted_at IS NULL
            AND r.category_slug = c.category_slug
            AND r.version = 1
        );
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "cms_category_revision" CASCADE;`)
    this.addSql(`DROP FUNCTION IF EXISTS cms_category_document_is_empty(jsonb);`)
    this.addSql(`
      ALTER TABLE IF EXISTS "cms_category"
        DROP CONSTRAINT IF EXISTS "cms_category_draft_sync_state_check";
    `)
    this.addSql(`DROP INDEX IF EXISTS "IDX_cms_category_draft_sync_state";`)
    this.addSql(`
      ALTER TABLE IF EXISTS "cms_category"
        DROP COLUMN IF EXISTS "published_document",
        DROP COLUMN IF EXISTS "published_at",
        DROP COLUMN IF EXISTS "published_by",
        DROP COLUMN IF EXISTS "published_version",
        DROP COLUMN IF EXISTS "published_note",
        DROP COLUMN IF EXISTS "draft_document",
        DROP COLUMN IF EXISTS "draft_updated_at",
        DROP COLUMN IF EXISTS "draft_updated_by",
        DROP COLUMN IF EXISTS "draft_base_version",
        DROP COLUMN IF EXISTS "draft_revision",
        DROP COLUMN IF EXISTS "draft_sync_state",
        DROP COLUMN IF EXISTS "legacy_migrated_at";
    `)
  }
}
