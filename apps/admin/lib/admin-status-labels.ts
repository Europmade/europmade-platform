/** Dutch display labels for admin product review (API keys stay English). */

export const ADMIN_PUBLICATION_LABELS: Record<string, string> = {
  Concept: "Concept",
  "In review": "In beoordeling",
  Goedgekeurd: "Goedgekeurd",
  Gepubliceerd: "Gepubliceerd",
  Gearchiveerd: "Gearchiveerd",
  Verwijderd: "Verwijderd",
}

export const ADMIN_LIFECYCLE_LABELS: Record<string, string> = {
  "Retailer Created": "Retailer aangemaakt",
  "Concept gecontroleerd": "Concept gecontroleerd",
  Actief: "Actief",
  "Verified™": "Verified™",
  Uitlopend: "Uitlopend",
  "Niet meer leverbaar": "Niet meer leverbaar",
  Gearchiveerd: "Gearchiveerd",
}

export const ADMIN_WORKFLOW_LABELS: Record<string, string> = {
  published: "Gepubliceerd",
  pending_admin_approval: "Wacht op productgoedkeuring",
  rejected: "Afgewezen",
  pending_evidence_review: "Bewijs te beoordelen",
  needs_information: "Aanvulling gevraagd",
  paused: "Gepauzeerd",
  complete: "Compleet",
  incomplete: "Onvolledig",
  concept: "Concept",
}

export const ADMIN_EVIDENCE_STATUS_LABELS: Record<string, string> = {
  pending: "Nog te beoordelen",
  pending_review: "Nog te beoordelen",
  needs_info: "Aanvulling gevraagd",
  approved: "Goedgekeurd / beschikbaar",
  rejected: "Afgewezen",
  superseded: "Vervangen",
  missing: "Ontbreekt",
  incomplete: "Incompleet",
}

export function adminLabel(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback = "—"
): string {
  if (!value) return fallback
  return map[value] ?? value
}
