/**
 * AI Content Engine — orchestration only; never called from page render paths.
 */

import { STOREFRONT_LOCALES } from "../i18n/locales"
import { AI_CONTENT_PROMPT_VERSION, AI_CONTENT_REFRESH_MONTHS } from "./prompts/versions"
import { getAiContentProvider } from "./providers/registry"
import { assertEntityEnabled } from "./entities/registry"
import {
  getAiContentDocument,
  upsertAiContentDocument,
} from "./store/content-store"
import type {
  AiContentDocument,
  AiContentProviderId,
  AiGenerateRequest,
  AiRegenerationTrigger,
} from "./types"

function addMonths(iso: string, months: number): string {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

export type GenerateAiContentInput = {
  request: AiGenerateRequest
  providerId?: AiContentProviderId | null
  publish?: boolean
}

/**
 * Generate (or regenerate) AI content and persist to CMS store.
 * Call from admin actions / jobs only — never from category page load.
 */
export async function generateAiContent(
  input: GenerateAiContentInput
): Promise<AiContentDocument> {
  const { request, providerId, publish = true } = input
  assertEntityEnabled(request.context.entityType)

  const existing = getAiContentDocument(
    request.context.entityType,
    request.context.entityId
  )

  upsertAiContentDocument({
    id:
      existing?.id ??
      `ai_${request.context.entityType}_${request.context.entityId}`,
    entityType: request.context.entityType,
    entityId: request.context.entityId,
    payload:
      existing?.payload ??
      ({
        seoTitle: { nl: "", en: "", de: "", fr: "" },
        metaDescription: { nl: "", en: "", de: "", fr: "" },
        h1: { nl: "", en: "", de: "", fr: "" },
        intro: { nl: "", en: "", de: "", fr: "" },
        buyGuide: { nl: "", en: "", de: "", fr: "" },
        buyGuideSections: [],
        editorialBlocks: [],
        keyFeatures: [],
        whatToLookFor: { nl: "", en: "", de: "", fr: "" },
        buyingAdvice: { nl: "", en: "", de: "", fr: "" },
        benefits: [],
        drawbacks: [],
        comparison: { nl: "", en: "", de: "", fr: "" },
        maintenance: { nl: "", en: "", de: "", fr: "" },
        sustainability: { nl: "", en: "", de: "", fr: "" },
        suitableFor: [],
        lessSuitableFor: [],
        expertAdvice: { nl: "", en: "", de: "", fr: "" },
        faq: [],
        internalLinks: [],
        discoveryCards: [],
        discoveryRails: [],
        productCloudInsights: [],
        topicVisuals: [],
        importanceRows: [],
        relatedCategories: [],
        relatedProducers: [],
        relatedBrands: [],
        frequentlyCombined: [],
        structuredData: {},
        openGraph: {
          title: { nl: "", en: "", de: "", fr: "" },
          description: { nl: "", en: "", de: "", fr: "" },
          type: "website",
        },
        twitterCard: {
          card: "summary_large_image",
          title: { nl: "", en: "", de: "", fr: "" },
          description: { nl: "", en: "", de: "", fr: "" },
        },
        canonicalPath: "",
        altTexts: [],
        breadcrumbSeo: [],
        keywords: [],
        longTailKeywords: [],
        featuredSnippetAnswers: [],
        seoSummary: { nl: "", en: "", de: "", fr: "" },
      } as AiContentDocument["payload"]),
    generationStatus: "generating",
    published: existing?.published ?? false,
    lastGenerated: existing?.lastGenerated ?? null,
    generatedBy: existing?.generatedBy ?? "offline-analyzer",
    promptVersion: request.promptVersion,
    localeCoverage: [...STOREFRONT_LOCALES],
    lastTrigger: request.trigger,
    errorMessage: null,
    refreshAfter: existing?.refreshAfter ?? null,
  })

  try {
    const provider = getAiContentProvider(providerId)
    const result = await provider.generate({
      ...request,
      previous: existing?.payload ?? null,
      locales: request.locales.length
        ? request.locales
        : [...STOREFRONT_LOCALES],
      promptVersion: request.promptVersion || AI_CONTENT_PROMPT_VERSION,
    })

    const now = new Date().toISOString()
    const doc: AiContentDocument = {
      id: `ai_${request.context.entityType}_${request.context.entityId}`,
      entityType: request.context.entityType,
      entityId: request.context.entityId,
      payload: result.payload,
      generationStatus: "ready",
      published: publish,
      lastGenerated: now,
      generatedBy: result.providerId,
      promptVersion: result.promptVersion,
      localeCoverage: [...STOREFRONT_LOCALES],
      lastTrigger: request.trigger,
      errorMessage: null,
      refreshAfter: addMonths(now, AI_CONTENT_REFRESH_MONTHS),
    }
    return upsertAiContentDocument(doc)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed"
    const failed: AiContentDocument = {
      id: `ai_${request.context.entityType}_${request.context.entityId}`,
      entityType: request.context.entityType,
      entityId: request.context.entityId,
      payload: existing?.payload ?? ({} as AiContentDocument["payload"]),
      generationStatus: "failed",
      published: existing?.published ?? false,
      lastGenerated: existing?.lastGenerated ?? null,
      generatedBy: providerId ?? "offline-analyzer",
      promptVersion: request.promptVersion,
      localeCoverage: [...STOREFRONT_LOCALES],
      lastTrigger: request.trigger,
      errorMessage: message,
      refreshAfter: existing?.refreshAfter ?? null,
    }
    upsertAiContentDocument(failed)
    throw err
  }
}

export function shouldRegenerate(
  doc: AiContentDocument | null,
  trigger: AiRegenerationTrigger
): boolean {
  if (!doc) return true
  if (trigger === "manual" || trigger === "translations_only") return true
  if (doc.generationStatus === "stale" || doc.generationStatus === "failed") {
    return true
  }
  if (doc.promptVersion !== AI_CONTENT_PROMPT_VERSION) return true
  if (doc.refreshAfter && new Date(doc.refreshAfter) <= new Date()) return true
  if (
    trigger === "entity_changed" ||
    trigger === "filters_changed" ||
    trigger === "catalog_delta" ||
    trigger === "periodic_refresh"
  ) {
    return true
  }
  return false
}
