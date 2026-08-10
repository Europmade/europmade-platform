/**
 * UI-label mapping for ADR-0039 translation_status (no DB duplicate).
 * Sprint labels ↔ backend enum.
 */

export type BackendTranslationStatus =
  | "Ontbreekt"
  | "Concept"
  | "Machine"
  | "Beoordeeld"
  | "Gepubliceerd"
  | "Verouderd"
  | "Mislukt"

/** Labels shown in admin/seller management UI (NL). */
export type TranslationUiStatusLabel =
  | "Ontbreekt"
  | "In wachtrij"
  | "Bezig"
  | "Beoordeeld"
  | "Beschikbaar"
  | "Verouderd"
  | "Mislukt"

const UI_BY_STATUS: Record<BackendTranslationStatus, TranslationUiStatusLabel> =
  {
    Ontbreekt: "Ontbreekt",
    Concept: "In wachtrij",
    Machine: "Bezig",
    Beoordeeld: "Beoordeeld",
    Gepubliceerd: "Beschikbaar",
    Verouderd: "Verouderd",
    Mislukt: "Mislukt",
  }

export function translationStatusUiLabel(
  status: string | null | undefined
): TranslationUiStatusLabel {
  if (!status) return "Ontbreekt"
  if (status in UI_BY_STATUS) {
    return UI_BY_STATUS[status as BackendTranslationStatus]
  }
  return "Ontbreekt"
}

/** Lower = more attention needed. */
const SEVERITY: Record<string, number> = {
  Mislukt: 0,
  Verouderd: 1,
  Ontbreekt: 2,
  Concept: 3,
  Machine: 4,
  Beoordeeld: 5,
  Gepubliceerd: 6,
}

export function worstTranslationStatus(
  statuses: Array<string | null | undefined>
): BackendTranslationStatus {
  if (!statuses.length) return "Ontbreekt"
  let worst: BackendTranslationStatus = "Gepubliceerd"
  let worstScore = SEVERITY.Gepubliceerd
  for (const raw of statuses) {
    const status = (raw ?? "Ontbreekt") as BackendTranslationStatus
    const score = SEVERITY[status] ?? 2
    if (score < worstScore) {
      worst = status in SEVERITY ? status : "Ontbreekt"
      worstScore = score
    }
  }
  return worst
}
