/**
 * Vult ontbrekende Category CMS-drafts en zet een afwijkend profiel gelijk aan de taxonomiediepte.
 * Published blijft staan. Een draft met het juiste profiel wordt niet herschreven.
 */
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import {
  categoryCmsListExclusion,
  categoryProfileFromDepth,
  planCategoryStructureDraft,
} from "@europmade/utils"

const require = createRequire(import.meta.url)
const pgRoot = new URL("../../../../node_modules/.pnpm/", import.meta.url)
const pgFolder = readdirSync(pgRoot).filter((name) => name.startsWith("pg@")).sort().at(-1)
if (!pgFolder) throw new Error("De lokale Postgres-client ontbreekt.")
const pg = require(fileURLToPath(new URL(`${pgFolder}/node_modules/pg`, pgRoot))) as {
  Client: new (config: { connectionString: string; connectionTimeoutMillis: number }) => {
    connect: () => Promise<void>
    query: (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
    end: () => Promise<void>
  }
}

function databaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim()
  if (fromEnv) return fromEnv
  const candidates = [
    new URL("../../.env", import.meta.url),
    new URL("../../../.env", import.meta.url),
  ]
  for (const candidate of candidates) {
    try {
      const env = readFileSync(candidate, "utf8")
      const line = env.split(/\r?\n/).find((row) => row.startsWith("DATABASE_URL="))
      if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "")
    } catch {
      // Probeer het volgende lokale env-bestand.
    }
  }
  throw new Error("DATABASE_URL ontbreekt.")
}

async function main() {
  const client = new pg.Client({
    connectionString: databaseUrl(),
    connectionTimeoutMillis: 15000,
  })
  await client.connect()
  try {
    const tree = await client.query(`
      WITH RECURSIVE tree AS (
        SELECT id, slug, name, parent_category_id, 1 AS depth
        FROM pc_category
        WHERE parent_category_id IS NULL AND deleted_at IS NULL
        UNION ALL
        SELECT c.id, c.slug, c.name, c.parent_category_id, t.depth + 1
        FROM pc_category c
        JOIN tree t ON c.parent_category_id = t.id
        WHERE c.deleted_at IS NULL
      )
      SELECT t.slug, t.name, t.depth, d.id AS cms_id, d.draft_document, d.published_document,
             d.draft_revision, d.published_version
      FROM tree t
      LEFT JOIN cms_category d ON d.category_slug = t.slug
      WHERE t.slug IS NOT NULL AND t.depth BETWEEN 1 AND 3
      ORDER BY t.slug
    `)
    await client.query("BEGIN")
    const written: string[] = []
    const skipped: string[] = []
    for (const row of tree.rows) {
      const slug = String(row.slug)
      const profile = categoryProfileFromDepth(Number(row.depth))
      if (!profile) continue
      const plan = planCategoryStructureDraft({
        slug,
        profile,
        draft: row.draft_document ?? null,
        published: row.published_document ?? null,
        excluded: categoryCmsListExclusion({ slug, name: String(row.name || "") }) != null,
      })
      if (plan.action === "skip" || !plan.document) {
        skipped.push(`${slug}:${plan.reason}`)
        continue
      }
      const publishedVersion = Number(row.published_version ?? 0)
      const hasPublication = publishedVersion >= 1 && row.published_document != null
      const revision = Number(row.draft_revision ?? 0) + 1
      const sync = hasPublication ? "unpublished_changes" : "unpublished_changes"
      if (row.cms_id) {
        await client.query(
          `UPDATE cms_category
           SET draft_document = $2::jsonb,
               draft_updated_at = now(),
               draft_base_version = $3,
               draft_revision = $4,
               draft_sync_state = $5,
               updated_at = now()
           WHERE id = $1`,
          [
            row.cms_id,
            JSON.stringify(plan.document),
            hasPublication ? publishedVersion : null,
            revision,
            sync,
          ]
        )
      } else {
        await client.query(
          `INSERT INTO cms_category (
             id, category_slug, document, published, published_document, published_version,
             draft_document, draft_revision, draft_sync_state, draft_base_version, draft_updated_at
           ) VALUES (
             $1, $2, '{}'::jsonb, false, NULL, 0, $3::jsonb, 1, 'unpublished_changes', NULL, now()
           )`,
          [
            `cmsca_${createHash("sha256").update(`cms:${slug}`).digest("hex").slice(0, 26)}`,
            slug,
            JSON.stringify(plan.document),
          ]
        )
      }
      written.push(`${slug}:${plan.reason}`)
    }
    await client.query("COMMIT")
    console.log(`written ${written.length}`)
    console.log(written.join("\n"))
    console.log(`skipped ${skipped.length}`)
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
