/**
 * External / local LLM provider stubs — activate after EU-hosting ADR + credentials.
 */

import type { AiContentProviderId } from "../types"
import {
  ProviderNotConfiguredError,
  type AiContentProvider,
} from "./types"

function stubProvider(
  id: AiContentProviderId,
  label: string
): AiContentProvider {
  return {
    id,
    label,
    isConfigured: () => false,
    async generate() {
      throw new ProviderNotConfiguredError(id)
    },
  }
}

export const openaiProvider = stubProvider(
  "openai",
  "OpenAI (stub — requires EU ADR)"
)
export const anthropicProvider = stubProvider(
  "anthropic",
  "Anthropic Claude (stub — requires EU ADR)"
)
export const geminiProvider = stubProvider(
  "gemini",
  "Google Gemini (stub — requires EU ADR)"
)
export const localModelProvider = stubProvider(
  "local",
  "Local EU model (stub)"
)
