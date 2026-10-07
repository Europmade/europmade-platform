import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { refuseManualConversionChange } from "../../../modules/engagement/prospect-rules"
import { loadEngagementOrganization } from "./admin-engagement-query"

export function guardConversion(body: Record<string, unknown>): void {
  try {
    refuseManualConversionChange({
      converted_customer_id:
        "converted_customer_id" in body
          ? body.converted_customer_id
          : undefined,
      converted_seller_id:
        "converted_seller_id" in body ? body.converted_seller_id : undefined,
    })
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      err instanceof Error ? err.message : String(err)
    )
  }
}

export function classificationFrom(
  body: Record<string, unknown>
): Record<string, unknown> | null | undefined {
  if (!("self_classification_payload" in body)) return undefined
  const value = body.self_classification_payload
  if (value === null) return null
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "self_classification_payload moet een object zijn."
    )
  }
  return value as Record<string, unknown>
}

export function roleList(body: Record<string, unknown>): string[] | undefined {
  if (!("roles" in body)) return undefined
  if (!Array.isArray(body.roles) || body.roles.some((role) => typeof role !== "string")) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "roles moet een lijst van tekst zijn."
    )
  }
  return body.roles
}

export async function respondOrganization(
  scope: MedusaContainer,
  id: string
) {
  const organization = await loadEngagementOrganization(scope, id)
  if (!organization) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Organization niet gevonden."
    )
  }
  return organization
}

export function paramId(value: string | undefined, label: string): string {
  const id = value?.trim() ?? ""
  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${label} vereist een id.`
    )
  }
  return id
}
