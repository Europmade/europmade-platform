/**
 * Corrigeert alleen het bestaande Inbouwapparatuur-concept.
 * Published blijft onaangeroerd. Geen extra advieskaart.
 */
import { readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { prepareCategoryCmsWrite } from "../modules/cms/category-cms-write.ts"

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

type Loc = { nl: string; en: string; de: string; fr: string }
type Block = Record<string, unknown>

function L(nl: string, en: string, de: string, fr: string): Loc {
  return { nl, en, de, fr }
}

function databaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim()
  if (fromEnv) return fromEnv
  try {
    const env = readFileSync(new URL("../../.env", import.meta.url), "utf8")
    const line = env.split(/\r?\n/).find((row) => row.startsWith("DATABASE_URL="))
    if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "")
  } catch {
    // De lokale ontwikkeldatabase is de terugval.
  }
  return "postgres://europmade:REDACTED_DATABASE_PASSWORD@127.0.0.1:5432/europmade"
}

const DISHWASHER_IMAGE = /1788336083367|1788509822754|bosch-smd8tcx04e/i

const intro = L(
  "Kies een productgroep om inbouwapparatuur te bekijken. De tegels openen de categorieën die in Product Cloud staan.",
  "Choose a product group to browse built-in appliances. The tiles open the categories that exist in Product Cloud.",
  "Wählen Sie eine Produktgruppe, um Einbaugeräte anzusehen. Die Kacheln öffnen die Kategorien, die in der Product Cloud stehen.",
  "Choisissez un groupe pour parcourir l'encastrable. Les tuiles ouvrent les catégories présentes dans le Product Cloud."
)
const choiceBody = L(
  "Beantwoord vragen over specificaties die bij de producten in deze categorie zijn ingevuld.",
  "Answer questions about specifications filled in on the products in this category.",
  "Beantworten Sie Fragen zu Angaben, die bei den Produkten in dieser Kategorie ausgefüllt sind.",
  "Répondez à des questions sur les caractéristiques renseignées pour les produits de cette catégorie."
)
const empty = L("", "", "", "")
const cards: Record<string, { summary: Loc; href: string }> = {
  "ib-advice-ovens": {
    href: "/categorie/ovens-en-magnetrons",
    summary: L(
      "Ovens en magnetrons staan in één productgroep. Open de categorie om de producten en aanbiedingen te zien die daar zijn opgenomen.",
      "Ovens and microwaves are one product group. Open the category to see the products and offers included there.",
      "Backöfen und Mikrowellen bilden eine Produktgruppe. Öffnen Sie die Kategorie, um die Produkte und Angebote zu sehen, die dort aufgenommen sind.",
      "Les fours et micro-ondes forment un seul groupe. Ouvrez la catégorie pour voir les produits et les offres qui y figurent."
    ),
  },
  "ib-advice-dish": {
    href: "/categorie/vaatwassers",
    summary: L(
      "Vaatwassers is een eigen categorie. Daar vergelijk je modellen en bekijk je de aanbieding van de verkoper.",
      "Dishwashers is its own category. There you compare models and view the seller's offer.",
      "Geschirrspüler ist eine eigene Kategorie. Dort vergleichen Sie Modelle und sehen das Angebot des Verkäufers.",
      "Le lave-vaisselle est une catégorie à part. Vous y comparez les modèles et consultez l'offre du vendeur."
    ),
  },
  "ib-advice-cold": {
    href: "/categorie/koelkasten-en-vriezers",
    summary: L(
      "Koelkasten en vriezers horen hier bij elkaar in één productgroep. Open de categorie om het aanbod te bekijken.",
      "Fridges and freezers belong together here in one product group. Open the category to view the assortment.",
      "Kühl- und Gefrierschränke gehören hier in einer Produktgruppe zusammen. Öffnen Sie die Kategorie, um das Angebot anzusehen.",
      "Les réfrigérateurs et congélateurs sont réunis ici dans un seul groupe. Ouvrez la catégorie pour voir l'offre."
    ),
  },
}

function correct(doc: { blocks: Block[] }) {
  const hero = doc.blocks.find((block) => block.type === "hero")
  if (hero) {
    hero.intro = intro
    const imageUrl = String(hero.image_url ?? "")
    const mobileUrl = String(hero.mobile_image_url ?? "")
    if (DISHWASHER_IMAGE.test(imageUrl) || DISHWASHER_IMAGE.test(mobileUrl)) {
      hero.image_url = null
      hero.mobile_image_url = null
      hero.image_alt = empty
      hero.mobile_image_alt = empty
    }
  }
  const choice = doc.blocks.find((block) => block.type === "choice_assistant_cta")
  if (choice) choice.body = choiceBody
  const advice = doc.blocks.find((block) => block.type === "advice_compare")
  const items = Array.isArray(advice?.items) ? advice.items as Block[] : []
  for (const item of items) {
    const next = cards[String(item.id)]
    if (!next) continue
    item.summary = next.summary
    item.body = empty
    item.href = next.href
  }
}

const client = new pg.Client({ connectionString: databaseUrl(), connectionTimeoutMillis: 8000 })
await client.connect()
try {
  await client.query("BEGIN")
  const found = await client.query(
    "SELECT id, draft_document, draft_revision, published_document FROM cms_category WHERE category_slug = 'inbouwapparatuur' FOR UPDATE"
  )
  const row = found.rows[0]
  if (!row?.draft_document) throw new Error("Geen concept voor inbouwapparatuur")
  const original = structuredClone(row.draft_document) as { blocks: Block[] }
  const draft = structuredClone(original)
  correct(draft)
  const next = prepareCategoryCmsWrite({
    raw: draft,
    slug: "inbouwapparatuur",
    profile: "level_2",
    previous: original,
  })
  if (JSON.stringify(next) === JSON.stringify(original)) {
    console.log(JSON.stringify({ slug: "inbouwapparatuur", changed: false, revision: row.draft_revision }))
    await client.query("ROLLBACK")
  } else {
    const published = row.published_document == null ? null : JSON.stringify(row.published_document)
    const revision = Number(row.draft_revision ?? 0) + 1
    const saved = await client.query(
      `UPDATE cms_category
       SET draft_document = $2::jsonb,
           draft_revision = $3,
           draft_updated_at = now(),
           draft_sync_state = 'unpublished_changes'
       WHERE id = $1
         AND published_document IS NOT DISTINCT FROM $4::jsonb
       RETURNING draft_revision, (published_document IS NULL) AS published_untouched`,
      [row.id, JSON.stringify(next), revision, published]
    )
    if (saved.rows.length !== 1) throw new Error("Opslaan geweigerd")
    const hero = next.blocks.find((block) => block.type === "hero") as Block | undefined
    const advice = next.blocks.find((block) => block.type === "advice_compare") as Block | undefined
    console.log(JSON.stringify({
      slug: "inbouwapparatuur",
      changed: true,
      revision: saved.rows[0]?.draft_revision,
      published_untouched: saved.rows[0]?.published_untouched,
      image_url: hero?.image_url ?? null,
      cards: Array.isArray(advice?.items) ? advice.items.length : 0,
    }))
    await client.query("COMMIT")
  }
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
