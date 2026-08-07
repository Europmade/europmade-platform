/**
 * Provider registry — swap models without touching the engine.
 */

import type { AiContentProviderId } from "../types"
import { offlineAnalyzerProvider } from "./offline-analyzer"
import {
  anthropicProvider,
  geminiProvider,
  localModelProvider,
  openaiProvider,
} from "./stubs"
import type { AiContentProvider } from "./types"

const PROVIDERS: Record<AiContentProviderId, AiContentProvider> = {
  "offline-analyzer": offlineAnalyzerProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  local: localModelProvider,
}

export function listAiContentProviders(): AiContentProvider[] {
  return Object.values(PROVIDERS)
}

export function getAiContentProvider(
  id?: AiContentProviderId | null
): AiContentProvider {
  const preferred =
    id ??
    (process.env.AI_CONTENT_PROVIDER as AiContentProviderId | undefined) ??
    "offline-analyzer"
  return PROVIDERS[preferred] ?? offlineAnalyzerProvider
}
