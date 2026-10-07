import type {
  EngagementProgram,
  EngagementSequence,
  EngagementStep,
  EngagementTemplate,
  EngagementVariant,
} from "./engagement-admin-api"
import { localeLabel, messageStatus, messageTypeLabel } from "./engagement-message"

export type DelayUnit = "minuten" | "uren" | "dagen"

export function flowSequence(program: EngagementProgram): EngagementSequence | null {
  if (program.linked_sequence_id) {
    const linked = program.sequences.find(
      (sequence) => sequence.id === program.linked_sequence_id
    )
    if (linked) return linked
  }
  return program.sequences[0] ?? null
}

export function sendableVariant(template: EngagementTemplate): EngagementVariant | null {
  const variants = [...template.variants].sort((a, b) => {
    if (a.locale.toLowerCase() === "nl") return -1
    if (b.locale.toLowerCase() === "nl") return 1
    return a.locale.localeCompare(b.locale)
  })
  return (
    variants.find((variant) =>
      variant.versions.some((version) => messageStatus(version) === "Actief")
    ) ?? null
  )
}

export function stepTemplate(
  step: EngagementStep,
  templates: EngagementTemplate[]
): EngagementTemplate | null {
  return templates.find((template) => template.id === step.template_id) ?? null
}

export function stepIsSendable(
  step: EngagementStep,
  templates: EngagementTemplate[]
): boolean {
  const template = stepTemplate(step, templates)
  if (!template) return false
  const variant =
    template.variants.find((item) => item.id === step.variant_id) ?? null
  if (!variant) return false
  return variant.versions.some((version) => messageStatus(version) === "Actief")
}

export function automationStatus(
  steps: EngagementStep[],
  templates: EngagementTemplate[]
): "Concept" | "Actief" {
  if (steps.length === 0) return "Concept"
  return steps.every((step) => stepIsSendable(step, templates)) ? "Actief" : "Concept"
}

export function startLines(program: EngagementProgram): { title: string; note: string } {
  if (program.automatic_start === "linked") {
    return {
      title: "De start wordt automatisch door EuropMade bepaald.",
      note: "",
    }
  }
  return {
    title: "Deze automatisering start niet vanzelf.",
    note: "De start wordt automatisch door EuropMade bepaald.",
  }
}

export function delayParts(minutes: number): { amount: number; unit: DelayUnit } {
  const safe = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0
  if (safe > 0 && safe % 1440 === 0) return { amount: safe / 1440, unit: "dagen" }
  if (safe > 0 && safe % 60 === 0) return { amount: safe / 60, unit: "uren" }
  return { amount: safe, unit: "minuten" }
}

export function minutesFromDelay(amount: number, unit: DelayUnit): number {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0
  if (unit === "dagen") return safe * 1440
  if (unit === "uren") return safe * 60
  return safe
}

export function delayLabel(minutes: number, first: boolean): string {
  if (!minutes) return first ? "Direct na start" : "Direct"
  const { amount, unit } = delayParts(minutes)
  if (unit === "dagen") return amount === 1 ? "Wacht 1 dag" : `Wacht ${amount} dagen`
  if (unit === "uren") return amount === 1 ? "Wacht 1 uur" : `Wacht ${amount} uur`
  return amount === 1 ? "Wacht 1 minuut" : `Wacht ${amount} minuten`
}

export function stepLanguage(
  step: EngagementStep,
  templates: EngagementTemplate[]
): string {
  const template = stepTemplate(step, templates)
  const variant = template?.variants.find((item) => item.id === step.variant_id)
  return variant ? localeLabel(variant.locale) : "—"
}

export function stepSubject(
  step: EngagementStep,
  templates: EngagementTemplate[]
): string {
  const template = stepTemplate(step, templates)
  const variant = template?.variants.find((item) => item.id === step.variant_id)
  const active = variant?.versions.find((version) => messageStatus(version) === "Actief")
  return active?.subject || variant?.versions[0]?.subject || ""
}

export function activationProblems(
  name: string,
  steps: EngagementStep[],
  templates: EngagementTemplate[]
): string[] {
  const problems: string[] = []
  if (!name.trim()) problems.push("Geef de automatisering een naam.")
  if (steps.length === 0) problems.push("Voeg minimaal één bericht toe.")
  for (const step of steps) {
    const template = stepTemplate(step, templates)
    const label = template?.name || step.template_name || "dit bericht"
    if (!template) {
      problems.push(`Het bericht '${label}' is niet meer beschikbaar.`)
      continue
    }
    if (!stepIsSendable(step, templates)) {
      problems.push(`Het bericht '${template.name}' is nog niet actief.`)
    }
  }
  return problems
}

export function translateAutomationError(raw: string): string {
  if (/enrollment/i.test(raw) && /verwijder|step/i.test(raw)) {
    return "Dit bericht kan niet worden verwijderd omdat deze stap al in gebruik is."
  }
  if (/program_type wijzigt niet|enrollments naar dit programma/i.test(raw)) {
    return "Het type kan niet meer veranderen omdat er al deelnemers zijn."
  }
  if (/hoort niet bij program_type|hoort niet bij dit/i.test(raw)) {
    return "Dit bericht hoort niet bij dit type automatisering."
  }
  if (/delay_minutes/i.test(raw)) return "De wachttijd moet nul of meer zijn."
  if (/step_order/i.test(raw)) return "De volgorde van de berichten is ongeldig."
  if (/deelnemers|in gebruik/i.test(raw)) {
    return "Deze stap kan niet worden gewijzigd omdat er al deelnemers in deze stap zitten."
  }
  return raw
    .replaceAll("LifecycleProgram", "automatisering")
    .replaceAll("SequenceStep", "stap")
    .replaceAll("Sequence", "reeks")
    .replaceAll("CommunicationTemplate", "bericht")
    .replaceAll("TemplateVariant", "taal")
    .replaceAll("TemplateVersion", "versie")
    .replaceAll("program_type", "type")
    .replaceAll("delay_minutes", "wachttijd")
    .replaceAll("step_order", "volgorde")
    .replaceAll("enrollment", "deelnemer")
}

export function typeLabel(value: string): string {
  return messageTypeLabel(value)
}
