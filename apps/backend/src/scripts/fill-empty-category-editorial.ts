/**
 * Vult lege velden in bestaande CMS-concepten.
 * Een veld met tekst blijft staan. Published wordt niet aangeraakt.
 */
import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import {
  categoryCmsListExclusion,
  categoryProfileFromDepth,
  fillEmptyCategoryEditorial,
  restoreGenericCategoryCopy,
  validateCategoryCmsDocument,
  type CategoryCmsDocumentV2,
  type CategoryCmsProfile,
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
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "apps/backend/.env"),
  ]
  for (const candidate of candidates) {
    try {
      const env = readFileSync(candidate, "utf8")
      const line = env.split(/\r?\n/).find((row) => row.replace(/^\uFEFF/, "").trim().startsWith("DATABASE_URL="))
      if (line) return line.replace(/^\uFEFF/, "").trim().slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "")
    } catch {
      // Volgend env-bestand.
    }
  }
  throw new Error("DATABASE_URL ontbreekt.")
}

function isDraft(value: unknown, profile: CategoryCmsProfile): value is CategoryCmsDocumentV2 {
  if (!value || typeof value !== "object") return false
  const row = value as { schema_version?: unknown; profile?: unknown; blocks?: unknown }
  return row.schema_version === 2 && row.profile === profile && Array.isArray(row.blocks)
}

async function main() {
  const client = new pg.Client({ connectionString: databaseUrl(), connectionTimeoutMillis: 15000 })
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
      SELECT t.id, t.slug, t.name, t.depth, p.name AS parent_name,
             d.id AS cms_id, d.draft_document
      FROM tree t
      LEFT JOIN pc_category p ON p.id = t.parent_category_id
      LEFT JOIN cms_category d ON d.category_slug = t.slug AND d.deleted_at IS NULL
      WHERE t.slug IS NOT NULL AND t.depth BETWEEN 1 AND 3
    `)
    const links = await client.query(`
      SELECT parent.slug AS parent_slug, child.slug, child.name
      FROM pc_category child
      JOIN pc_category parent ON parent.id = child.parent_category_id
      WHERE child.deleted_at IS NULL AND parent.deleted_at IS NULL AND child.slug IS NOT NULL
    `)
    const counts = await client.query(`
      SELECT c.slug, count(DISTINCT pc.product_id)::int AS products
      FROM pc_category c
      JOIN pc_product_category pc ON pc.category_id = c.id AND pc.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
      GROUP BY c.slug
    `)
    const brands = await client.query(`
      SELECT c.slug, b.name
      FROM pc_category c
      JOIN pc_product_category pc ON pc.category_id = c.id AND pc.deleted_at IS NULL
      JOIN pc_product p ON p.id = pc.product_id AND p.deleted_at IS NULL
      JOIN brand b ON b.id = p.brand_id AND b.deleted_at IS NULL
      WHERE c.deleted_at IS NULL AND b.name IS NOT NULL
    `)
    const filters = await client.query(`
      SELECT c.slug, d.name
      FROM attribute_definition d
      JOIN pc_category c ON c.id = d.category_id
      WHERE d.deleted_at IS NULL AND c.deleted_at IS NULL AND d.is_filterable = true AND d.name IS NOT NULL
    `)
    const children = new Map<string, Array<{ slug: string; name: string }>>()
    for (const row of links.rows) {
      const parent = String(row.parent_slug)
      const list = children.get(parent) ?? []
      list.push({ slug: String(row.slug), name: String(row.name) })
      children.set(parent, list)
    }
    const productCount = new Map(counts.rows.map((row) => [String(row.slug), Number(row.products)]))
    const brandNames = new Map<string, string[]>()
    for (const row of brands.rows) {
      const list = brandNames.get(String(row.slug)) ?? []
      if (!list.includes(String(row.name))) list.push(String(row.name))
      brandNames.set(String(row.slug), list)
    }
    const filterNames = new Map<string, string[]>()
    for (const row of filters.rows) {
      const list = filterNames.get(String(row.slug)) ?? []
      if (!list.includes(String(row.name))) list.push(String(row.name))
      filterNames.set(String(row.slug), list)
    }
    const sameName = new Map<string, Array<{ slug: string; parentName: string | null }>>()
    for (const row of tree.rows) {
      const key = String(row.name).trim().toLowerCase()
      const list = sameName.get(key) ?? []
      list.push({ slug: String(row.slug), parentName: row.parent_name ? String(row.parent_name) : null })
      sameName.set(key, list)
    }

    await client.query("BEGIN")
    let written = 0
    let skipped = 0
    for (const row of tree.rows) {
      const slug = String(row.slug)
      const name = String(row.name)
      const profile = categoryProfileFromDepth(Number(row.depth))
      if (!profile || !row.cms_id || categoryCmsListExclusion({ name, slug }) || !isDraft(row.draft_document, profile)) {
        skipped += 1
        continue
      }
      const namesakes = (sameName.get(name.trim().toLowerCase()) ?? []).filter((item) => item.slug !== slug)
      const editorialContext = {
        slug,
        name,
        parentName: row.parent_name ? String(row.parent_name) : null,
        children: children.get(slug) ?? [],
        profile,
        productCount: productCount.get(slug) ?? 0,
        brands: brandNames.get(slug) ?? [],
        filterNames: filterNames.get(slug) ?? [],
        distinguishedFrom: namesakes[0]?.parentName ?? null,
      }
      const restored = restoreGenericCategoryCopy(row.draft_document, editorialContext)
      const result = fillEmptyCategoryEditorial(restored.document, editorialContext)
      result.filled.unshift(...restored.filled)
      if (result.filled.length === 0) {
        skipped += 1
        continue
      }
      const issues = validateCategoryCmsDocument(result.document, { slug, expectedProfile: profile })
      if (issues.length > 0) {
        skipped += 1
        console.log(`${slug}:invalid:${issues.map((issue) => issue.code).join(",")}`)
        continue
      }
      await client.query(
        `UPDATE cms_category
         SET draft_document = $1::jsonb,
             draft_updated_at = now(),
             draft_revision = draft_revision + 1,
             draft_sync_state = 'unpublished_changes',
             updated_at = now()
         WHERE id = $2 AND deleted_at IS NULL`,
        [JSON.stringify(result.document), row.cms_id]
      )
      written += 1
      console.log(`${slug}:${result.filled.length}`)
    }
    await client.query("COMMIT")
    console.log(`written ${written}`)
    console.log(`skipped ${skipped}`)
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "fill failed")
  process.exit(1)
})
