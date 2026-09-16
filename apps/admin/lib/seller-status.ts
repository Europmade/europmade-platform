/**
 * Seller status labels & badge variants — P2.19.
 * Uses only backend-supported onboarding_status values.
 */

import type { OnboardingStatus } from "./partner-admin-api"

export type StatusBadgeVariant = "solid" | "outline" | "destructive"

export function onboardingBadgeVariant(
  status: OnboardingStatus
): StatusBadgeVariant {
  if (status === "Goedgekeurd") return "solid"
  if (status === "Afgekeurd") return "destructive"
  return "outline"
}

export function displayOnboardingStatus(status: OnboardingStatus): string {
  if (status === "Goedgekeurd") return "Actief"
  if (status === "Aanvullende informatie vereist") return "Informatie nodig"
  return status
}

export const STATUS_FILTERS: Array<{
  key: string
  label: string
  tab?: "all" | "queue" | "active"
  status?: OnboardingStatus
}> = [
  { key: "all", label: "Alle", tab: "all" },
  { key: "queue", label: "Nieuw / pending", tab: "queue" },
  {
    key: "info",
    label: "Informatie nodig",
    tab: "all",
    status: "Aanvullende informatie vereist",
  },
  { key: "active", label: "Goedgekeurd / actief", tab: "active" },
  { key: "rejected", label: "Afgewezen", tab: "all", status: "Afgekeurd" },
  {
    key: "review",
    label: "In beoordeling",
    tab: "all",
    status: "In beoordeling",
  },
]

export const DOCUMENT_LABELS: Record<string, string> = {
  identity_document_file_id: "Identiteitsbewijs",
  chamber_of_commerce_extract_file_id: "KvK-uittreksel",
  production_proof_file_id: "Productiebewijs (Made in Europe Laag 1)",
  authorization_proof_file_id: "Autorisatiebewijs",
  additional_certifications_file_id: "Aanvullende certificeringen",
}

export function evidenceStatusLabel(status: string): string {
  switch (status) {
    case "pending":
    case "pending_review":
      return "In beoordeling"
    case "approved":
      return "Goedgekeurd"
    case "rejected":
      return "Afgewezen"
    case "superseded":
      return "Vervangen"
    default:
      return status
  }
}
