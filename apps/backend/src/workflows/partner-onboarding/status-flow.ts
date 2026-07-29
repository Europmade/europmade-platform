/**
 * Partner Onboarding — statusmodel.
 *
 * Bron: `docs/03-functional-specs/partner-onboarding/spec.md` (v1.1, definitief
 * bevroren), sectie 1.2 ("Statusovergangen") en sectie 2.8A ("Aanvullende
 * informatie vereist"). De zes waarden komen letterlijk overeen met het
 * bevroren `onboarding_status`-enum op `seller` (Blueprint `02-database-model.md`
 * Deel A.3, geïmplementeerd in S3-02-01) — geen eigen statuswaarde toegevoegd.
 *
 * Belangrijke, expliciet vastgelegde interpretatiekeuzes (zie
 * implementatierapport S3-02-02):
 *
 * 1. "Opnieuw ingediend" (spec §2.8A) is GEEN aparte, opgeslagen waarde in het
 *    bevroren enum — het enum kent uitsluitend de zes onderstaande statussen.
 *    Dit document behandelt "Opnieuw ingediend" daarom uitsluitend als een
 *    logische/audit-omschrijving van de overgang
 *    "Aanvullende informatie vereist" → "In beoordeling", niet als een
 *    afzonderlijke database-status (zou het bevroren S3-02-01-schema wijzigen,
 *    wat buiten dit ticket valt).
 * 2. De spec beschrijft geen enkele expliciete, aparte actor-actie voor de
 *    overgang "Ingediend" → "In beoordeling" (in tegenstelling tot alle andere
 *    overgangen, die wél een expliciete partner- of reviewer-actie hebben).
 *    Beide statussen delen bovendien exact dezelfde partnermelding (spec
 *    §2.8: "Ingediend/In beoordeling"). Daarom voert het indienen van een
 *    aanvraag (vanuit Concept of Afgekeurd) beide overgangen na elkaar door,
 *    binnen dezelfde workflow: eerst "Ingediend" (opgeslagen, gelogd), direct
 *    gevolgd door "In beoordeling" (opgeslagen, gelogd) — géén nieuwe,
 *    niet-gedocumenteerde tussenactie verzonnen.
 */

import { MedusaError } from "@medusajs/framework/utils"

export const ONBOARDING_STATUS = {
  CONCEPT: "Concept",
  INGEDIEND: "Ingediend",
  IN_BEOORDELING: "In beoordeling",
  AANVULLENDE_INFORMATIE_VEREIST: "Aanvullende informatie vereist",
  GOEDGEKEURD: "Goedgekeurd",
  AFGEKEURD: "Afgekeurd",
} as const

export type OnboardingStatus =
  (typeof ONBOARDING_STATUS)[keyof typeof ONBOARDING_STATUS]

/**
 * Toegestane overgangen, exact conform spec §1.2/§2.8A (zie toelichting
 * hierboven voor "Ingediend → In beoordeling" en "Opnieuw ingediend").
 */
export const ONBOARDING_TRANSITIONS: Record<OnboardingStatus, OnboardingStatus[]> = {
  [ONBOARDING_STATUS.CONCEPT]: [ONBOARDING_STATUS.INGEDIEND],
  [ONBOARDING_STATUS.INGEDIEND]: [ONBOARDING_STATUS.IN_BEOORDELING],
  [ONBOARDING_STATUS.IN_BEOORDELING]: [
    ONBOARDING_STATUS.GOEDGEKEURD,
    ONBOARDING_STATUS.AFGEKEURD,
    ONBOARDING_STATUS.AANVULLENDE_INFORMATIE_VEREIST,
  ],
  [ONBOARDING_STATUS.AANVULLENDE_INFORMATIE_VEREIST]: [
    ONBOARDING_STATUS.IN_BEOORDELING,
  ],
  // Afgekeurd → Ingediend (niet terug naar Concept, spec §1.2, expliciet).
  [ONBOARDING_STATUS.AFGEKEURD]: [ONBOARDING_STATUS.INGEDIEND],
  [ONBOARDING_STATUS.GOEDGEKEURD]: [],
}

export function assertTransitionAllowed(
  from: string,
  to: OnboardingStatus
): void {
  const allowed = ONBOARDING_TRANSITIONS[from as OnboardingStatus]
  if (!allowed || !allowed.includes(to)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Ongeldige statusovergang: "${from}" → "${to}" is niet toegestaan conform partner-onboarding/spec.md §1.2.`
    )
  }
}

/**
 * Statussen waarin de partner de aanvraag nog zelf mag wijzigen — spec §1.2
 * ("Afgekeurd: ... partner kan de afgekeurde onderdelen aanpassen en
 * opnieuw indienen"), §2.8A. Correctie t.o.v. de oorspronkelijke S3-02-02-
 * oplevering, gevonden tijdens de UI-integratie (S3-02-03): "Afgekeurd"
 * ontbrak hier abusievelijk, terwijl het wél in `SUBMITTABLE_STATUSES`
 * stond — zonder deze correctie kon een afgekeurde aanvraag nooit
 * daadwerkelijk aangepast worden vóór herindiening.
 */
export const EDITABLE_STATUSES: OnboardingStatus[] = [
  ONBOARDING_STATUS.CONCEPT,
  ONBOARDING_STATUS.AANVULLENDE_INFORMATIE_VEREIST,
  ONBOARDING_STATUS.AFGEKEURD,
]

/** Statussen van waaruit de partner een (her)indiening mag doen (spec §1.2). */
export const SUBMITTABLE_STATUSES: OnboardingStatus[] = [
  ONBOARDING_STATUS.CONCEPT,
  ONBOARDING_STATUS.AFGEKEURD,
]
