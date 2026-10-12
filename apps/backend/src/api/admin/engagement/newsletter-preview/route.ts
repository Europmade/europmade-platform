import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { fillNewsletter, isVisualNewsletter } from "../../../../modules/engagement/newsletter-fill"
import { loadNewsletterCatalog } from "./catalog"

type PreviewBody = {
  body?: string
  preheader?: string
  cta_label?: string
  cta_url?: string
  locale?: string
  audience?: string
}

function origin(req: AuthenticatedMedusaRequest): { backend: string; storefront: string } {
  const protocol = req.protocol || "http"
  const raw = req.get("host") || req.hostname || "127.0.0.1:9000"
  const backendHost = /:\d+$/.test(raw) ? raw : `${raw}:9000`
  const storefrontHost = `${backendHost.replace(/:\d+$/, "")}:3000`
  return {
    backend: `${protocol}://${backendHost}`,
    storefront: `${protocol}://${storefrontHost}`,
  }
}

function absoluteCta(storefront: string, value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return `${storefront}${trimmed}`
  return trimmed
}

/** POST — dezelfde HTML als de latere mail. Keurt niets goed en verzendt niets. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as PreviewBody
  const source = typeof body.body === "string" ? body.body : ""
  if (!isVisualNewsletter(source)) {
    res.status(200).json({ html: "", problems: [], warnings: [] })
    return
  }
  const audience =
    body.audience === "affiliates" || body.audience === "sellers" || body.audience === "prospects"
      ? body.audience
      : "consumers"
  const base = origin(req)
  try {
    const catalog = await loadNewsletterCatalog(req.scope, base)
    const filled = fillNewsletter({
      body: source,
      preheader: typeof body.preheader === "string" ? body.preheader : "",
      ctaLabel: typeof body.cta_label === "string" ? body.cta_label : "",
      ctaUrl: absoluteCta(base.storefront, typeof body.cta_url === "string" ? body.cta_url : ""),
      unsubscribeUrl: `${base.storefront}/nieuwsbrief/uitschrijven/voorbeeld`,
      locale: typeof body.locale === "string" && body.locale.trim() ? body.locale.trim() : "nl",
      audience,
      catalog,
      context: { currentCatalog: true },
    })
    res.status(200).json({
      html: filled.html,
      problems: filled.problems,
      warnings: filled.warnings,
    })
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      err instanceof Error ? err.message : "De nieuwsbriefpreview kon niet worden opgebouwd."
    )
  }
}
