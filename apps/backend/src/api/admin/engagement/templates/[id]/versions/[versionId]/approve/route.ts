import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { fillNewsletter, isVisualNewsletter } from "../../../../../../../../modules/engagement/newsletter-fill"
import { loadNewsletterCatalog } from "../../../../../newsletter-preview/catalog"
import {
  actorId,
  cmsService,
  requireVersionOnTemplate,
  writeTemplate,
} from "../../../../../cms-request"

/** POST — draft (of andere ongebruikte status) naar approved. Geen verzending. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const templateId = req.params.id?.trim() ?? ""
  const versionId = req.params.versionId?.trim() ?? ""
  if (!templateId || !versionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Version vereist een template en een id."
    )
  }
  const service = cmsService(req.scope)
  const version = (await requireVersionOnTemplate(service, templateId, versionId)) as {
    body?: string | null
    preheader?: string | null
    cta_label?: string | null
    cta_url?: string | null
  }
  const source = typeof version.body === "string" ? version.body : ""
  if (isVisualNewsletter(source)) {
    const protocol = req.protocol || "http"
    const raw = req.get("host") || req.hostname || "127.0.0.1:9000"
    const backendHost = /:\d+$/.test(raw) ? raw : `${raw}:9000`
    const storefront = `${protocol}://${backendHost.replace(/:\d+$/, "")}:3000`
    const template = (await service.retrieveCommunicationTemplate(templateId)) as {
      audience?: string | null
      communication_type?: string | null
    }
    const audience =
      template.audience === "affiliates" || template.audience === "sellers"
        ? template.audience
        : template.communication_type === "acquisition"
          ? "prospects"
          : "consumers"
    const filled = fillNewsletter({
      body: source,
      preheader: typeof version.preheader === "string" ? version.preheader : "",
      ctaLabel: typeof version.cta_label === "string" ? version.cta_label : "",
      ctaUrl:
        typeof version.cta_url === "string" && version.cta_url.startsWith("/")
          ? `${storefront}${version.cta_url}`
          : typeof version.cta_url === "string"
            ? version.cta_url
            : "",
      unsubscribeUrl: `${storefront}/nieuwsbrief/uitschrijven/voorbeeld`,
      locale: "nl",
      audience,
      catalog: await loadNewsletterCatalog(req.scope, {
        backend: `${protocol}://${backendHost}`,
        storefront,
      }),
      context: { currentCatalog: true },
    })
    if (filled.problems.length > 0) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, filled.problems.join(" "))
    }
  }
  await service.transitionVersion({
    id: versionId,
    approval_status: "approved",
    approved_by: actorId(req),
  })
  res.status(200).json({ template: await writeTemplate(req.scope, templateId) })
}
