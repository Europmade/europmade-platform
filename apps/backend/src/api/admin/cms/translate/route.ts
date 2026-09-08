import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  createTranslationProviderFromEnv,
  TranslationProviderNotConfiguredError,
} from "../../../../modules/product-cloud/translation/provider"

/**
 * GET /admin/cms/translate — provider status (geen fake configured).
 * POST — translate one string via existing Product Cloud provider.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const provider = createTranslationProviderFromEnv()
  res.status(200).json({
    configured: provider.id !== "none",
    provider: provider.id,
    message:
      provider.id === "none"
        ? "Automatische vertaling is niet geconfigureerd (geen DeepL-key). Handmatig vertalen kan wel."
        : `Provider: ${provider.id}`,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>
  const text = typeof body.text === "string" ? body.text.trim() : ""
  const source =
    typeof body.source_language === "string"
      ? body.source_language.trim().toLowerCase()
      : "nl"
  const target =
    typeof body.target_language === "string"
      ? body.target_language.trim().toLowerCase()
      : ""
  if (!text || !target) {
    res.status(400).json({ message: "text en target_language zijn verplicht." })
    return
  }
  if (source === target) {
    res.status(200).json({ text, provider: "none", origin: "source" })
    return
  }

  const provider = createTranslationProviderFromEnv()
  try {
    const result = await provider.translate({
      text,
      source_language: source,
      target_language: target,
      entity_type: "cms",
    })
    res.status(200).json({
      text: result.text,
      provider: result.provider,
      origin: "machine",
    })
  } catch (err) {
    if (err instanceof TranslationProviderNotConfiguredError) {
      res.status(503).json({
        configured: false,
        provider: provider.id,
        message:
          "Automatische vertaling is niet geconfigureerd. Stel PRODUCT_CLOUD_TRANSLATION_PROVIDER en PRODUCT_CLOUD_TRANSLATION_API_KEY in.",
      })
      return
    }
    res.status(502).json({
      message: err instanceof Error ? err.message : "Vertaling mislukt",
    })
  }
}
