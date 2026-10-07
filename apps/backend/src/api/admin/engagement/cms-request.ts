import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { ENGAGEMENT_MODULE } from "../../../modules/engagement"
import { assertCreatedVersionStatus } from "../../../modules/engagement/communication-cms-rules"
import type EngagementModuleService from "../../../modules/engagement/service"
import { assertVariantBelongsToTemplate } from "../../../modules/engagement/sequence-rules"
import { loadEngagementTemplate } from "./admin-engagement-query"

export function cmsService(scope: MedusaContainer): EngagementModuleService {
  return scope.resolve(ENGAGEMENT_MODULE) as EngagementModuleService
}

export function recordBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {}
  return body as Record<string, unknown>
}

export function requiredString(
  body: Record<string, unknown>,
  key: string,
  label: string
): string {
  const value = body[key]
  if (typeof value !== "string" || !value.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${label} is verplicht.`
    )
  }
  return value
}

export function optionalString(
  body: Record<string, unknown>,
  key: string
): string | undefined {
  if (!(key in body)) return undefined
  const value = body[key]
  if (typeof value !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${key} moet tekst zijn.`
    )
  }
  return value
}

export function assertDraftVersionCreate(body: Record<string, unknown>): void {
  if ("version_number" in body) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "version_number wordt automatisch gekozen."
    )
  }
  try {
    assertCreatedVersionStatus({
      approval_status:
        typeof body.approval_status === "string"
          ? body.approval_status
          : undefined,
      activation_status:
        typeof body.activation_status === "string"
          ? body.activation_status
          : undefined,
    })
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      err instanceof Error ? err.message : String(err)
    )
  }
}

export function actorId(req: {
  auth_context?: { actor_id?: string }
}): string | null {
  const id = req.auth_context?.actor_id?.trim()
  return id || null
}

export async function requireVariantOnTemplate(
  service: EngagementModuleService,
  templateId: string,
  variantId: string
) {
  const variant = (await service.retrieveCommunicationTemplateVariant(
    variantId
  )) as { id: string; template_id: string }
  try {
    assertVariantBelongsToTemplate({
      template_id: templateId,
      variant_template_id: variant.template_id,
    })
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      err instanceof Error ? err.message : String(err)
    )
  }
  return variant
}

export async function requireVersionOnTemplate(
  service: EngagementModuleService,
  templateId: string,
  versionId: string
) {
  const version = (await service.retrieveCommunicationTemplateVersion(
    versionId
  )) as { id: string; variant_id: string }
  await requireVariantOnTemplate(service, templateId, version.variant_id)
  return version
}

export async function writeTemplate(
  scope: MedusaContainer,
  templateId: string
) {
  const template = await loadEngagementTemplate(scope, templateId)
  if (!template) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Template niet gevonden."
    )
  }
  return template
}
