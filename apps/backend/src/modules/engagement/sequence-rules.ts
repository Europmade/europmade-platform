/**
 * Sequence-definities (architectuur §4–§6, bouwstap 4).
 * Programmatype volgt communication_type. `growth` is geen token; dat is `lifecycle`.
 * Geen enrollment, geen next_step_at, geen inhoud.
 */
import {
  COMMUNICATION_TYPES,
  isCommunicationType,
  type CommunicationType,
} from "./communication-cms-rules"

export const PROGRAM_TYPES = COMMUNICATION_TYPES

export type ProgramType = CommunicationType

export function normalizeProgramType(value: string): ProgramType {
  const token = value.trim()
  if (token === "growth") {
    throw new Error("Programmatype growth bestaat niet. Gebruik lifecycle.")
  }
  if (!isCommunicationType(token)) {
    throw new Error(`Onbekend program_type "${value}".`)
  }
  return token
}

/** Vaste volgorde binnen één sequence. Geen limiet op het aantal stappen. */
export function normalizeStepOrder(value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("step_order moet een geheel getal vanaf 1 zijn.")
  }
  return value
}

/**
 * Wachttijd tot deze stap, in minuten.
 * `0` is direct. De job die `next_step_at` zet hoort bij Enrollment, niet hier.
 */
export function normalizeDelayMinutes(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("delay_minutes moet een geheel getal vanaf 0 zijn.")
  }
  return value
}

export function assertUniqueStepOrder(
  existingOrders: number[],
  stepOrder: number
): void {
  if (existingOrders.includes(stepOrder)) {
    throw new Error(`step_order ${stepOrder} bestaat al in deze sequence.`)
  }
}

export function assertStepOrderSet(orders: number[]): void {
  const seen = new Set<number>()
  for (const order of orders) {
    normalizeStepOrder(order)
    if (seen.has(order)) {
      throw new Error(`step_order ${order} komt dubbel voor in deze sequence.`)
    }
    seen.add(order)
  }
}

export function assertVariantBelongsToTemplate(input: {
  template_id: string
  variant_template_id: string
}): void {
  if (input.variant_template_id !== input.template_id) {
    throw new Error(
      "TemplateVariant hoort niet bij de gekozen CommunicationTemplate."
    )
  }
}

/**
 * Een stap mag elk actief communicatie-item gebruiken.
 * De opmaak bepaalt de weergave. Goedkeuring blijft op de versie.
 */
export function assertTemplateMatchesProgram(input: {
  program_type: string
  communication_type: string
}): void {
  if (!isCommunicationType(input.program_type)) {
    throw new Error(`Onbekend program_type "${input.program_type}".`)
  }
  if (!isCommunicationType(input.communication_type)) {
    throw new Error(`Onbekend communication_type "${input.communication_type}".`)
  }
}

const STEP_CONTENT_KEYS = [
  "template_version_id",
  "subject",
  "preheader",
  "body",
  "cta_label",
  "cta_url",
  "personalization_tokens",
] as const

/** Een step verwijst naar template + variant. Geen version en geen tekst. */
export function assertNoStepContent(patch: object): void {
  const present = STEP_CONTENT_KEYS.filter((key) =>
    Object.prototype.hasOwnProperty.call(patch, key)
  )
  if (present.length > 0) {
    throw new Error(
      `SequenceStep bevat geen inhoud of version (${present.join(", ")}).`
    )
  }
}

/** Verwijderen laat bestaande enrollments met rust. */
export function assertStepDeletable(referencedByEnrollment: boolean): void {
  if (referencedByEnrollment) {
    throw new Error(
      "Een SequenceStep waar een enrollment naar verwijst kan niet worden verwijderd."
    )
  }
}
