import { NextResponse } from "next/server"
import {
  listAiContentDocuments,
  listAiContentProviders,
  seedCategoryAiContent,
} from "../../_lib/ai-content"
import { hydrateAiContentStore } from "../../_lib/ai-content/store/hydrate"
import { CATEGORY_CMS_BY_SLUG } from "../../_lib/cms/category-cms"
import { MARKETPLACE_CATEGORIES } from "../../_lib/marketplace-categories"

export const dynamic = "force-dynamic"

/**
 * GET — list stored AI content + provider registry (admin CMS).
 * Hydrates offline seed into CMS store if empty (not a page-load path).
 */
export async function GET() {
  await hydrateAiContentStore()
  return NextResponse.json({
    documents: listAiContentDocuments("category"),
    providers: listAiContentProviders().map((p) => ({
      id: p.id,
      label: p.label,
      configured: p.isConfigured(),
    })),
    entitiesEnabled: ["category"],
    entitiesSprint4: [
      "brand",
      "producer",
      "collection",
      "campaign",
      "landing",
      "search",
      "seller",
    ],
  })
}

/**
 * POST — batch seed / regenerate known categories (admin job).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: "seed" | "list"
    slugs?: string[]
  }
  if (body.action === "list") {
    await hydrateAiContentStore()
    return NextResponse.json({ documents: listAiContentDocuments("category") })
  }

  const slugs =
    body.slugs ??
    [
      ...Object.keys(CATEGORY_CMS_BY_SLUG),
      ...MARKETPLACE_CATEGORIES.filter((c) => c.popular).map((c) => c.slug),
    ].filter((v, i, a) => a.indexOf(v) === i)

  const documents = await seedCategoryAiContent(slugs)
  return NextResponse.json({
    count: documents.length,
    documents: documents.map((d) => ({
      entityId: d.entityId,
      status: d.generationStatus,
      lastGenerated: d.lastGenerated,
      promptVersion: d.promptVersion,
      generatedBy: d.generatedBy,
      published: d.published,
    })),
  })
}
