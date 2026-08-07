import { NextResponse } from "next/server"
import {
  generateCategoryAiContent,
  getAiContentDocument,
  listAiContentProviders,
  publishAiContentDocument,
  type AiContentEntityType,
  type AiContentProviderId,
  type AiRegenerationTrigger,
} from "../../../../_lib/ai-content"
import { AI_ENTITY_ADAPTERS } from "../../../../_lib/ai-content/entities/registry"

export const dynamic = "force-dynamic"

type RouteParams = {
  params: Promise<{ entityType: string; entityId: string }>
}

function parseEntityType(value: string): AiContentEntityType | null {
  if (value in AI_ENTITY_ADAPTERS) return value as AiContentEntityType
  return null
}

/**
 * GET — read stored AI content (CMS). No generation.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { entityType: rawType, entityId } = await params
  const entityType = parseEntityType(rawType)
  if (!entityType) {
    return NextResponse.json({ error: "Unknown entity type" }, { status: 400 })
  }
  const doc = getAiContentDocument(entityType, decodeURIComponent(entityId))
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({
    document: doc,
    providers: listAiContentProviders().map((p) => ({
      id: p.id,
      label: p.label,
      configured: p.isConfigured(),
    })),
  })
}

/**
 * POST — generate / regenerate / publish / translations.
 * Admin & jobs only — never invoked by storefront page load.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { entityType: rawType, entityId: rawId } = await params
  const entityType = parseEntityType(rawType)
  if (!entityType) {
    return NextResponse.json({ error: "Unknown entity type" }, { status: 400 })
  }
  if (entityType !== "category") {
    return NextResponse.json(
      {
        error: `Entity "${entityType}" is registered for Sprint 4 but not enabled yet.`,
      },
      { status: 501 }
    )
  }

  const entityId = decodeURIComponent(rawId)
  const body = (await req.json().catch(() => ({}))) as {
    action?: "generate" | "regenerate" | "translations" | "publish" | "preview"
    providerId?: AiContentProviderId
    trigger?: AiRegenerationTrigger
  }

  const action = body.action ?? "generate"

  try {
    if (action === "publish") {
      const published = publishAiContentDocument(entityType, entityId)
      if (!published) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      return NextResponse.json({ document: published })
    }

    if (action === "preview") {
      const doc = await generateCategoryAiContent({
        slug: entityId,
        trigger: body.trigger ?? "manual",
        providerId: body.providerId,
        force: true,
        publish: false,
      })
      return NextResponse.json({ document: doc, preview: true })
    }

    const doc = await generateCategoryAiContent({
      slug: entityId,
      trigger:
        body.trigger ??
        (action === "translations" ? "translations_only" : "manual"),
      providerId: body.providerId,
      translationsOnly: action === "translations",
      force: action === "regenerate" || action === "generate" || action === "translations",
      publish: true,
    })

    return NextResponse.json({ document: doc })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
