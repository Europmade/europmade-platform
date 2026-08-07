/**
 * AI Content Engine public API — offline generation + CMS read helpers.
 * ADR-0036: never invoke generate* from storefront page components.
 */

export type {
  AiContentDocument,
  AiContentEntityType,
  AiContentProviderId,
  AiGeneratedContentPayload,
  AiGenerationStatus,
  AiRegenerationTrigger,
} from "./types"

export { AI_CONTENT_PROMPT_VERSION, AI_CONTENT_REFRESH_MONTHS } from "./prompts/versions"
export { AI_ENTITY_ADAPTERS } from "./entities/registry"
export { listAiContentProviders, getAiContentProvider } from "./providers/registry"
export {
  getAiContentDocument,
  listAiContentDocuments,
  publishAiContentDocument,
  markAiContentStale,
} from "./store/content-store"
export { hydrateAiContentStore } from "./store/hydrate"
export { generateAiContent, shouldRegenerate } from "./engine"
export {
  generateCategoryAiContent,
  seedCategoryAiContent,
} from "./jobs/category"
export { analyzeCategorySignals } from "./analysis/category-signals"
