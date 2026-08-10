/**
 * Machine-translation provider abstraction (ADR-0038 / ADR-0039).
 * Geen nep-vertaaltekst: zonder credentials blijft de provider "none".
 */

import { DeepLTranslationProvider } from "./deepl-provider"

export type TranslateRequest = {
  text: string
  source_language: string
  target_language: string
  field_name?: string
  content_type?: string
  entity_type?: string
  entity_id?: string
  category?: string
}

export type TranslateResult = {
  text: string
  provider: string
}

export class TranslationProviderNotConfiguredError extends Error {
  constructor(
    message = "Product Cloud translation provider is not configured"
  ) {
    super(message)
    this.name = "TranslationProviderNotConfiguredError"
  }
}

export interface TranslationProvider {
  readonly id: string
  translate(input: TranslateRequest): Promise<TranslateResult>
}

/** Default: expliciet niet geconfigureerd — geen fake output. */
export class NullTranslationProvider implements TranslationProvider {
  readonly id = "none"

  async translate(_input: TranslateRequest): Promise<TranslateResult> {
    throw new TranslationProviderNotConfiguredError(
      "Set PRODUCT_CLOUD_TRANSLATION_PROVIDER and PRODUCT_CLOUD_TRANSLATION_API_KEY to enable machine translation"
    )
  }
}

/**
 * Resolve provider from environment.
 * Supported: `none` (default), `deepl` (requires API key).
 */
export function createTranslationProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env
): TranslationProvider {
  const raw = (env.PRODUCT_CLOUD_TRANSLATION_PROVIDER ?? "none")
    .trim()
    .toLowerCase()
  const key = (env.PRODUCT_CLOUD_TRANSLATION_API_KEY ?? "").trim()
  const baseUrl = (env.PRODUCT_CLOUD_TRANSLATION_BASE_URL ?? "").trim()

  if (!raw || raw === "none") {
    return new NullTranslationProvider()
  }

  if (!key) {
    return new NullTranslationProvider()
  }

  if (raw === "deepl") {
    return new DeepLTranslationProvider(
      key,
      baseUrl || "https://api-free.deepl.com/v2/translate"
    )
  }

  // openai e.d. nog niet geïmplementeerd — geen silent fake
  return new NullTranslationProvider()
}

let cached: TranslationProvider | null = null

export function getTranslationProvider(): TranslationProvider {
  if (!cached) {
    cached = createTranslationProviderFromEnv()
  }
  return cached
}

/** Test helper — reset module cache. */
export function resetTranslationProviderCache(): void {
  cached = null
}
