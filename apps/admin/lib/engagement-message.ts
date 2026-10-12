import type { EngagementTemplate, EngagementVersion } from "./engagement-admin-api"

export const MESSAGE_LOCALES = [
  { value: "nl", label: "Nederlands" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
] as const

export const MESSAGE_TYPE_LABELS: Record<string, string> = {
  acquisition: "Acquisitie",
  onboarding: "Onboarding",
  lifecycle: "Opvolging",
  newsletter: "Nieuwsbrief",
  campaign: "Campagne",
  operational: "Operationeel",
}

export const MESSAGE_STATUSES = [
  "Concept",
  "Ter beoordeling",
  "Goedgekeurd",
  "Gepland",
  "Klaar voor verzending",
  "Actief",
  "Afgekeurd",
  "Gearchiveerd",
] as const

export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

export const MESSAGE_TOKENS = [
  { key: "voornaam", label: "Voornaam", sample: "Maria" },
  { key: "bedrijfsnaam", label: "Bedrijfsnaam", sample: "ABC GmbH" },
  { key: "email", label: "E-mail", sample: "maria@abc.eu" },
] as const

export const MESSAGE_AUDIENCES = [
  { value: "consumers", label: "Consumenten" },
  { value: "sellers", label: "Verkopers" },
  { value: "affiliates", label: "Affiliate Partners" },
] as const

export function isMessageAudience(
  value: string | null | undefined
): value is (typeof MESSAGE_AUDIENCES)[number]["value"] {
  return MESSAGE_AUDIENCES.some((item) => item.value === value)
}

export function audienceLabel(type: string, audience: string | null | undefined): string {
  const chosen = MESSAGE_AUDIENCES.find((item) => item.value === audience)
  if (chosen && (type === "newsletter" || type === "campaign" || audience === "affiliates")) {
    return chosen.label
  }
  if (type === "newsletter" || type === "campaign") return "Kies een doelgroep"
  if (type === "acquisition") return "Prospects"
  if (type === "onboarding" || type === "lifecycle" || type === "operational") return "Verkopers"
  return "—"
}

export function messageTypeLabel(value: string): string {
  return MESSAGE_TYPE_LABELS[value] ?? value
}

export function localeLabel(locale: string): string {
  const found = MESSAGE_LOCALES.find((item) => item.value === locale.toLowerCase())
  return found?.label ?? (locale || "—")
}

export function messageStatus(version: {
  approval_status: string
  activation_status: string
}): MessageStatus {
  if (version.activation_status === "archived") return "Gearchiveerd"
  if (version.approval_status === "rejected") return "Afgekeurd"
  if (
    version.approval_status === "approved" &&
    version.activation_status === "active"
  ) {
    return "Actief"
  }
  if (version.approval_status === "approved") return "Goedgekeurd"
  if (version.approval_status === "pending_review") return "Ter beoordeling"
  return "Concept"
}

/** Nieuwsbrief toont klaarzetten apart. Activeren en verzenden gebeurt hier niet. */
export function displayMessageStatus(
  template: {
    communication_type?: string
    ready_to_send?: boolean
    schedule_status?: string | null
  },
  version: { approval_status: string; activation_status: string }
): MessageStatus {
  if (template.schedule_status === "scheduled" && version.approval_status === "approved") {
    return "Gepland"
  }
  if (
    template.communication_type === "newsletter" &&
    version.approval_status === "approved" &&
    (template.ready_to_send || version.activation_status === "active")
  ) {
    return "Klaar voor verzending"
  }
  return messageStatus(version)
}

export function isEditableDraft(version: {
  approval_status: string
  activation_status: string
  used_at: string | null
} | null): boolean {
  if (!version) return true
  return (
    !version.used_at &&
    version.approval_status === "draft" &&
    version.activation_status === "inactive"
  )
}

export function versionHistoryLabel(version: EngagementVersion): string {
  const status = messageStatus(version)
  if (version.used_at && status === "Actief") return "Actief · Gebruikt"
  if (version.used_at) return "Gebruikt"
  return status
}

export function primaryVariant(template: EngagementTemplate) {
  return (
    template.variants.find((variant) => variant.locale.toLowerCase() === "nl") ??
    template.variants[0] ??
    null
  )
}

export function headlineVersion(template: EngagementTemplate): EngagementVersion | null {
  const variant = primaryVariant(template)
  if (!variant || variant.versions.length === 0) return null
  const active = variant.versions
    .filter(
      (version) =>
        version.approval_status === "approved" &&
        version.activation_status === "active"
    )
    .sort((a, b) => b.version_number - a.version_number)[0]
  if (active) return active
  return (
    [...variant.versions].sort((a, b) => b.version_number - a.version_number)[0] ??
    null
  )
}

export function tokensToEditor(value: string): string {
  let next = value
  for (const token of MESSAGE_TOKENS) {
    next = next.replaceAll(`{{${token.key}}}`, `[${token.label}]`)
  }
  return next
}

export function editorToStored(value: string): { text: string; tokens: string[] } {
  let text = value
  const tokens: string[] = []
  for (const token of MESSAGE_TOKENS) {
    const label = `[${token.label}]`
    if (text.includes(label) || text.includes(`{{${token.key}}}`)) {
      tokens.push(token.key)
    }
    text = text.replaceAll(label, `{{${token.key}}}`)
  }
  return { text, tokens }
}

export { fillMessageTokens } from "./engagement-tokens"

export function previewHtml(value: string): string {
  const stored = editorToStored(value).text
  let next = stored
  for (const token of MESSAGE_TOKENS) {
    next = next.replaceAll(`{{${token.key}}}`, token.sample)
  }
  return next
}

export function changedLabel(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const start = (item: Date) =>
    new Date(item.getFullYear(), item.getMonth(), item.getDate()).getTime()
  const diff = Math.round((start(new Date()) - start(date)) / 86400000)
  const time = new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
  if (diff === 0) return `Vandaag ${time}`
  if (diff === 1) return `Gisteren ${time}`
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(date)
}

export function translateMessageError(raw: string): string {
  if (/activation active is alleen|niet is goedgekeurd/i.test(raw)) {
    return "Dit bericht kan niet worden geactiveerd omdat het nog niet is goedgekeurd."
  }
  if (/alleen een concept kan ter beoordeling/i.test(raw)) {
    return "Alleen een concept kan ter beoordeling worden gezet."
  }
  if (/communication_type wijzigt niet|SequenceStep/i.test(raw)) {
    return "Dit type kan niet meer veranderen omdat het bericht in een automatisering wordt gebruikt."
  }
  if (
    /onwijzigbaar|wijzigt niet|kan niet worden gewijzigd|Versienummer en taal/i.test(
      raw
    )
  ) {
    return "Deze versie is actief of al gebruikt en kan niet worden gewijzigd."
  }
  return raw
    .replaceAll("TemplateVersion", "versie")
    .replaceAll("TemplateVariant", "taal")
    .replaceAll("CommunicationTemplate", "bericht")
    .replaceAll("communication_template", "bericht")
    .replaceAll("communication_type", "type")
}
