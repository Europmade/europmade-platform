/**
 * DeepL TranslationProvider (ADR-0039).
 * Requires PRODUCT_CLOUD_TRANSLATION_API_KEY. No fake output.
 */

import { MedusaError } from "@medusajs/framework/utils"
import type {
  TranslateRequest,
  TranslateResult,
  TranslationProvider,
} from "./provider"
import { isProductContentType } from "../languages"
import { validateTechnicalTokensPreserved } from "./technical-tokens"

const DEFAULT_DEEPL_URL = "https://api-free.deepl.com/v2/translate"

export class DeepLTranslationProvider implements TranslationProvider {
  readonly id = "deepl"

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = DEFAULT_DEEPL_URL
  ) {}

  async translate(input: TranslateRequest): Promise<TranslateResult> {
    const sourceLang = input.source_language.toUpperCase()
    const targetLang = input.target_language.toUpperCase()

    const body = new URLSearchParams()
    body.set("auth_key", this.apiKey)
    body.set("text", input.text)
    body.set("source_lang", sourceLang)
    body.set("target_lang", targetLang === "EN" ? "EN-GB" : targetLang)

    if (isProductContentType(input.content_type)) {
      body.set("formality", "prefer_more")
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })

    if (!response.ok) {
      // Never echo credentials; truncate provider body for diagnostics only.
      const detail = (await response.text().catch(() => ""))
        .replace(/auth_key=[^&\s]*/gi, "auth_key=REDACTED")
        .slice(0, 200)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `deepl_http_${response.status}${detail ? `:${detail}` : ""}`
      )
    }

    const json = (await response.json()) as {
      translations?: Array<{ text?: string }>
    }
    const text = json.translations?.[0]?.text
    if (!text || typeof text !== "string") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "deepl_empty_response"
      )
    }

    if (isProductContentType(input.content_type)) {
      const tokenError = validateTechnicalTokensPreserved(input.text, text)
      if (tokenError) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, tokenError)
      }
    }

    return { text, provider: this.id }
  }
}
