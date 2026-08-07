/**
 * Pluggable AI content providers — swap OpenAI / Claude / Gemini / local without engine changes.
 */

import type {
  AiContentProviderId,
  AiGenerateRequest,
  AiGenerateResult,
} from "../types"

export type AiContentProvider = {
  id: AiContentProviderId
  /** Human label for admin UI. */
  label: string
  /** Whether credentials/config allow live calls. */
  isConfigured(): boolean
  generate(request: AiGenerateRequest): Promise<AiGenerateResult>
}

export class ProviderNotConfiguredError extends Error {
  constructor(providerId: AiContentProviderId) {
    super(
      `AI content provider "${providerId}" is not configured. Use offline-analyzer or set EU-hosted credentials (ADR-0036).`
    )
    this.name = "ProviderNotConfiguredError"
  }
}
