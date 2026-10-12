import { randomUUID } from "node:crypto"
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import { listPublishedCatalogProducts } from "../../../../../store/catalog/catalog-helpers"
import {
  ContentProviderError,
  generateEngagementContent,
  type CatalogFact,
  type ContentKind,
  type ContentLength,
} from "../../../../../../modules/engagement/content-provider"
import { cmsService, recordBody, requiredString, writeTemplate } from "../../../cms-request"

/**
 * POST /admin/engagement/templates/:id/generate
 * Maakt een nieuwe conceptversie. Keurt, activeert en verzendt niet.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const templateId = req.params.id?.trim() ?? ""
  if (!templateId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Bericht vereist een id.")
  }
  const body = recordBody(req.body)
  const kind = contentKind(body.kind)
  const length = contentLength(body.length)
  const service = cmsService(req.scope)
  const template = await service.retrieveCommunicationTemplate(templateId)
  const variants = (await service.listCommunicationTemplateVariants(
    { template_id: templateId },
    { take: 20 }
  )) as Array<{ id: string; locale?: string }>
  const variant =
    variants.find((item) => item.locale?.toLowerCase() === "nl") ?? variants[0]
  if (!variant) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Dit bericht heeft nog geen taal. Sla eerst een taal op."
    )
  }
  const idea = requiredString(body, "idea", "Onderwerp")
  const goal = requiredString(body, "goal", "Doel")
  const products = await catalogFacts(req, `${idea} ${goal}`)
  if (
    (template as { audience?: string | null }).audience === "affiliates" &&
    products.length > 0
  ) {
    const catalog = await listPublishedCatalogProducts(req.scope, {
      ids: products.map((product) => product.id).filter(Boolean),
      limit: products.length,
      region_code: "NL",
    })
    const commissionById = new Map(
      catalog.products.map((product) => [
        product.id,
        product.affiliate_commission_label,
      ])
    )
    for (const product of products) {
      const label = product.id ? commissionById.get(product.id) : null
      if (label) product.commission_note = `Commissie: ${label}.`
    }
  }
  let draft
  try {
    draft = await generateEngagementContent({
      kind,
      idea,
      goal,
      tone: typeof body.tone === "string" ? body.tone : "",
      language: "nl",
      length,
      products,
    })
  } catch (err) {
    const message =
      err instanceof ContentProviderError
        ? err.message
        : "Het AI-concept kon niet worden gemaakt. Probeer het opnieuw."
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
  }
  try {
    const logger = req.scope.resolve("logger") as { info: (message: string) => void }
    logger.info(
      `[engagement] content concept ${randomUUID()} provider=local template=${template.id} kind=${kind}`
    )
  } catch {
    /* logging mag het concept niet blokkeren */
  }
  await service.createVersion({
    variant_id: variant.id,
    subject: draft.subject,
    preheader: draft.preheader,
    body: draft.body,
    cta_label: draft.cta_label,
    cta_url: draft.cta_url,
    personalization_tokens: [],
  })
  res.status(201).json({ template: await writeTemplate(req.scope, templateId) })
}

function contentKind(value: unknown): ContentKind {
  if (value === "newsletter" || value === "email" || value === "follow_up") return value
  throw new MedusaError(MedusaError.Types.INVALID_DATA, "Kies wat je wilt maken.")
}

function contentLength(value: unknown): ContentLength {
  if (value === "kort" || value === "normaal" || value === "uitgebreid") return value
  return "normaal"
}

async function catalogFacts(req: AuthenticatedMedusaRequest, text: string): Promise<CatalogFact[]> {
  if (!/product|merk|aanbod|nieuw/i.test(text)) return []
  try {
    const cloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as {
      listProductVersions: (
        filters: { publication_status: string },
        config: { take: number; relations?: string[] }
      ) => Promise<
        Array<{
          product_id?: string
          title?: string
          description?: string
          media_items?: Array<{ storage_reference?: string; media_type?: string }>
        }>
      >
    }
    const rows = await cloud.listProductVersions(
      { publication_status: "Gepubliceerd" },
      { take: 3, relations: ["media_items"] }
    )
    return rows
      .map((row) => {
        const image = (row.media_items ?? []).find(
          (item) => item.media_type === "Hoofdafbeelding" && item.storage_reference
        )
        const url = image?.storage_reference?.trim() || null
        return {
          id: row.product_id?.trim() || "",
          title: row.title?.trim() || "",
          description: row.description?.trim() || "",
          image_url: url && (/^https?:\/\//i.test(url) || url.startsWith("/")) ? url : null,
        }
      })
      .filter((row) => row.title)
  } catch {
    return []
  }
}

