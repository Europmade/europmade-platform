/**
 * Presentatie-mapping voor API/demo-statuscodes.
 * Database/API-waarden blijven ongewijzigd; alleen UI-labels lokaliseren.
 */

import type { StorefrontLocale } from "./locales"
import { t, type StorefrontMessageKey } from "./messages"

const STATUS_KEYS: Record<string, StorefrontMessageKey> = {
  // Orders / shipping
  Onderweg: "statusInTransit",
  Geleverd: "statusDelivered",
  "In behandeling": "statusProcessing",
  Verzonden: "statusShipped",
  "Nog niet verzonden": "statusNotShipped",
  "Retour aangemeld": "statusReturnRequested",
  "Retour afgerond": "statusReturnCompleted",
  // Payment
  Betaald: "statusPaid",
  "Betaling wordt verwerkt": "statusPaymentProcessing",
  // Returns
  Aangevraagd: "statusRequested",
  Bevestigd: "statusConfirmed",
  Ontvangen: "statusReceived",
  Verwerkt: "statusProcessed",
  Afgewezen: "statusRejected",
  Geëscaleerd: "statusEscalated",
  Geaccepteerd: "statusAccepted",
  // Product / listing
  Actief: "statusActive",
  Concept: "statusDraft",
  Live: "statusLive",
  Gearchiveerd: "statusArchived",
  "Concept gecontroleerd": "statusDraftChecked",
  "Retailer Created": "statusRetailerCreated",
  Gekoppeld: "statusLinked",
  "Wacht op producent": "statusAwaitingProducer",
  "In beoordeling": "statusUnderReview",
  Conflict: "statusConflict",
  "Niet gekoppeld": "statusNotLinked",
  // Finance
  Gepland: "statusScheduled",
  Voltooid: "statusPaidOut",
  Geannuleerd: "statusCancelled",
  Uitbetaald: "statusPaidOut",
  "Nog te factureren": "statusToInvoice",
  Gefactureerd: "statusInvoiced",
  Open: "statusOpen",
  // Campaigns / affiliate
  Afgerond: "statusCompleted",
  Gepauzeerd: "statusPaused",
  Beëindigd: "statusEnded",
  // Onboarding
  Ingediend: "statusSubmitted",
  Goedgekeurd: "statusApproved",
  Afgekeurd: "statusApplicationRejected",
  Inactief: "statusInactive",
  Teruggedraaid: "statusReversed",
  "Teruggedraaid (retour)": "affCommReversedReturn",
  "Aanvullende informatie vereist": "statusAdditionalInfoRequired",
  // Reviews UI
  Beantwoord: "statusAnswered",
  Onbeantwoord: "statusUnanswered",
  // Returns / info request
  "Informatie gevraagd": "statusInfoRequested",
  // Ad campaign statuses (API codes)
  draft: "statusDraft",
  pending_review: "statusUnderReview",
  approved: "statusApproved",
  scheduled: "statusScheduled",
  active: "statusActive",
  completed: "statusCompleted",
  rejected: "statusRejected",
  cancelled: "statusCancelled",
}

/** Map canonical status string → localized label (fallback = original). */
export function statusLabel(
  status: string | null | undefined,
  locale: StorefrontLocale
): string {
  if (!status) return "—"
  const key = STATUS_KEYS[status]
  return key ? t(key, locale) : status
}
