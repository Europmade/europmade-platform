/**
 * Startcatalogus voor automatiseringen.
 * Een nieuwe trigger is een regel in deze lijst. Alleen `available` start echt.
 * Ontbrekende events blijven zichtbaar als nog niet beschikbaar en enrollen niemand.
 */

export type TriggerAudience = "sellers" | "consumers" | "affiliates"

export type TriggerKind = "event" | "condition"

export type AutomationStartTrigger = {
  key: string
  label: string
  audience: TriggerAudience
  /** Gebeurtenis of een toestand in bestaande gegevens. */
  kind: TriggerKind
  available: boolean
}

export const SCHEDULE_TIMEZONES = [
  { value: "Europe/Amsterdam", label: "Amsterdam" },
  { value: "Europe/Brussels", label: "Brussel" },
  { value: "Europe/Berlin", label: "Berlijn" },
  { value: "Europe/Paris", label: "Parijs" },
  { value: "Europe/London", label: "Londen" },
  { value: "UTC", label: "UTC" },
] as const

const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
]

function trigger(
  key: string,
  label: string,
  audience: TriggerAudience,
  kind: TriggerKind,
  available: boolean
): AutomationStartTrigger {
  return { key, label, audience, kind, available }
}

/**
 * Eén registratie. Een nieuwe trigger is een regel plus, als hij beschikbaar is,
 * één verzamelaar in automation-occurrences.ts. De job en de subscribers
 * gebruiken alleen deze lijst.
 */
export const AUTOMATION_START_TRIGGERS: AutomationStartTrigger[] = [
  trigger("seller_onboarded", "Een verkoper is onboarded", "sellers", "event", true),
  trigger("account_created", "Een verkoper maakt een account aan", "sellers", "condition", true),
  trigger("onboarding_submitted", "Een verkoper dient de onboarding in", "sellers", "condition", true),
  trigger("onboarding_approved", "Een verkoper is goedgekeurd", "sellers", "condition", true),
  trigger("first_product", "Een verkoper voegt een eerste product toe", "sellers", "event", true),
  trigger("product_incomplete", "Productinformatie is nog niet compleet", "sellers", "condition", true),
  trigger("product_published", "Een product is gepubliceerd", "sellers", "event", true),
  trigger("verification", "Een product is geverifieerd", "sellers", "condition", true),
  trigger("first_sale", "Een verkoper ontvangt een eerste bestelling", "sellers", "event", true),
  trigger("consumer_newsletter_subscribed", "Een consument schrijft zich in voor de nieuwsbrief", "consumers", "event", true),
  trigger("consumer_account_created", "Een consument maakt een account aan", "consumers", "event", true),
  trigger("consumer_first_order", "Een consument doet een eerste bestelling", "consumers", "event", true),
  trigger("consumer_first_order_received", "Een consument ontvangt een eerste bestelling", "consumers", "event", true),
  trigger("consumer_inactive_30d", "Een consument heeft 30 dagen geen bestelling geplaatst", "consumers", "condition", true),
  trigger("consumer_inactive_60d", "Een consument heeft 60 dagen geen bestelling geplaatst", "consumers", "condition", true),
  trigger("consumer_inactive_90d", "Een consument heeft 90 dagen geen bestelling geplaatst", "consumers", "condition", true),
  trigger("consumer_order_placed", "Een consument heeft een bestelling geplaatst", "consumers", "event", true),
  trigger("consumer_repeat_order", "Een consument heeft meerdere bestellingen geplaatst", "consumers", "condition", true),
  trigger("consumer_product_purchased", "Een consument heeft een bepaald product gekocht", "consumers", "condition", false),
  trigger("consumer_category_purchased", "Een consument heeft een productcategorie gekocht", "consumers", "condition", false),
  trigger("consumer_new_brand_purchased", "Een consument heeft een product van een nieuw merk gekocht", "consumers", "condition", false),
  trigger("consumer_product_viewed", "Een consument heeft een product bekeken", "consumers", "event", false),
  trigger("consumer_product_viewed_repeat", "Een consument heeft een product meerdere keren bekeken", "consumers", "condition", false),
  trigger("consumer_cart_abandoned", "Een consument heeft een winkelmandje verlaten", "consumers", "condition", false),
  trigger("consumer_wishlist_added", "Een consument heeft een favoriet product toegevoegd", "consumers", "event", false),
  trigger("brand_published", "Een nieuw merk wordt gepubliceerd", "consumers", "event", true),
  trigger("category_published", "Een nieuwe productcategorie wordt gepubliceerd", "consumers", "event", false),
  trigger("consumer_product_published", "Een nieuw product wordt gepubliceerd", "consumers", "event", true),
  trigger("category_three_brands", "Een categorie bevat voor het eerst producten van minimaal 3 merken", "consumers", "condition", true),
  trigger("brand_homepage_featured", "Een nieuw merk wordt op de homepage uitgelicht", "consumers", "event", false),
  trigger("collection_published", "Een nieuwe collectie wordt gepubliceerd", "consumers", "event", false),
  trigger("campaign_started", "Een EuropMade-campagne start", "consumers", "event", false),
  trigger("seasonal_campaign_started", "Een grote seizoenscampagne start", "consumers", "event", false),
  trigger("offer_published", "Een speciale actie of aanbieding wordt gepubliceerd", "consumers", "event", true),
  trigger("european_selection_published", "Een nieuwe Europese selectie wordt samengesteld", "consumers", "event", false),
  trigger("consumer_subscribed_no_order", "Een consument is ingeschreven maar heeft nog geen bestelling geplaatst", "consumers", "condition", true),
  trigger("consumer_no_interaction", "Een consument heeft een tijd geen interactie gehad", "consumers", "condition", false),
  trigger("consumer_category_interest", "Een consument heeft interesse getoond in een categorie", "consumers", "condition", false),
  trigger("consumer_brand_interest", "Een consument heeft interesse getoond in een merk", "consumers", "condition", false),
  trigger("affiliate_created", "Een nieuwe affiliate partner meldt zich aan", "affiliates", "event", true),
  trigger("affiliate_approved", "Een affiliate partner is goedgekeurd", "affiliates", "event", true),
  trigger("affiliate_first_sale", "Een affiliate partner realiseert een eerste verkoop", "affiliates", "event", true),
  trigger("affiliate_campaign_started", "Een nieuwe affiliate-campagne start", "affiliates", "event", false),
  trigger("affiliate_brand_published", "Een nieuw merk is interessant voor affiliate partners", "affiliates", "event", true),
  trigger("affiliate_product_published", "Een nieuw product is interessant voor affiliate partners", "affiliates", "event", true),
  trigger("affiliate_commission_changed", "De commissieafspraak is gewijzigd", "affiliates", "event", false),
  trigger("affiliate_campaign_ending", "Een affiliate-campagne loopt bijna af", "affiliates", "condition", false),
]

export const CONDITION_TRIGGER_KEYS = AUTOMATION_START_TRIGGERS.filter(
  (item) => item.kind === "condition"
).map((item) => item.key)

export function findStartTrigger(key: string | null | undefined): AutomationStartTrigger | null {
  const value = key?.trim()
  if (!value) return null
  return AUTOMATION_START_TRIGGERS.find((item) => item.key === value) ?? null
}

export function startTriggerLabel(key: string | null | undefined): string | null {
  return findStartTrigger(key)?.label ?? null
}

export function assertStartTrigger(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null
  const item = findStartTrigger(value)
  if (!item?.available) {
    throw new Error("Dit startmoment is nog niet beschikbaar.")
  }
  return item.key
}

export function audienceLabel(audience: string | null | undefined): string {
  if (audience === "sellers") return "Verkopers"
  if (audience === "consumers") return "Consumenten"
  if (audience === "affiliates") return "Affiliatepartners"
  return ""
}

export function describeChosenStart(startTrigger: string | null | undefined): {
  title: string
  note: string
} {
  const item = findStartTrigger(startTrigger)
  if (item?.available) {
    return {
      title: item.label,
      note: `Start wanneer: ${item.label}.`,
    }
  }
  if (item) {
    return {
      title: item.label,
      note: "Dit startmoment is nog niet beschikbaar. De automatisering start niet vanzelf.",
    }
  }
  return {
    title: "Deze automatisering start niet vanzelf",
    note: "Er is nog geen beschikbaar startmoment gekozen.",
  }
}

export function timezoneLabel(value: string | null | undefined): string {
  return SCHEDULE_TIMEZONES.find((item) => item.value === value)?.label ?? "Amsterdam"
}

export function normalizeTimezone(value: string | null | undefined): string | null {
  const found = SCHEDULE_TIMEZONES.find((item) => item.value === value?.trim())
  return found?.value ?? null
}

/** Bewaart datum en tijd zoals gekozen. Er wordt niets omgezet naar een verzendactie. */
export function normalizeScheduleMoment(value: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value?.trim() ?? "")
  if (!match) return null
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`
}

export function formatScheduleMoment(value: string | null | undefined): string | null {
  const moment = normalizeScheduleMoment(value)
  if (!moment) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(moment)
  if (!match) return null
  const month = MONTHS[Number(match[2]) - 1]
  return `${Number(match[3])} ${month} ${match[1]} om ${match[4]}:${match[5]}`
}

export function describeProgramStart(input: {
  start_mode?: string | null
  start_trigger?: string | null
  scheduled_at?: string | null
  schedule_timezone?: string | null
}): { title: string; note: string } {
  if (input.start_mode === "scheduled") {
    const when = formatScheduleMoment(input.scheduled_at)
    if (!when) {
      return {
        title: "Gepland startmoment ontbreekt",
        note: "Kies een datum en tijd. Er wordt niets verzonden.",
      }
    }
    return {
      title: when,
      note: `Gepland. Tijdzone: ${timezoneLabel(input.schedule_timezone)}. Er wordt niets verzonden.`,
    }
  }
  return describeChosenStart(input.start_trigger)
}

export type ProgramStartMode = "event" | "condition" | "scheduled"

export function planProgramStart(input: {
  programType: string
  start_mode?: string | null
  start_trigger?: string | null
  scheduled_at?: string | null
  schedule_timezone?: string | null
  audience?: string | null
}): {
  start_mode: ProgramStartMode | null
  start_trigger: string | null
  scheduled_at: string | null
  schedule_timezone: string | null
  audience: "consumers" | "sellers" | "affiliates" | null
} {
  if (input.start_mode === "scheduled") {
    if (input.programType !== "newsletter" && input.programType !== "campaign") {
      throw new Error("Een gepland startmoment hoort bij een nieuwsbrief of campagne.")
    }
    const scheduled_at = normalizeScheduleMoment(input.scheduled_at)
    if (!scheduled_at) throw new Error("Kies een startdatum en starttijd.")
    const schedule_timezone = normalizeTimezone(input.schedule_timezone)
    if (!schedule_timezone) throw new Error("Kies een tijdzone.")
    if (input.audience !== "consumers" && input.audience !== "sellers" && input.audience !== "affiliates") {
      throw new Error("Kies een doelgroep.")
    }
    return {
      start_mode: "scheduled",
      start_trigger: null,
      scheduled_at,
      schedule_timezone,
      audience: input.audience,
    }
  }
  if (input.start_mode === "condition" || input.start_mode === "event") {
    const start_trigger = assertStartTrigger(input.start_trigger)
    if (!start_trigger) throw new Error("Kies een startmoment.")
    const item = findStartTrigger(start_trigger)
    if (item && item.kind !== input.start_mode) {
      throw new Error(
        item.kind === "condition"
          ? "Dit startmoment hoort bij gegevens of voorwaarden."
          : "Dit startmoment hoort bij een gebeurtenis."
      )
    }
    return {
      start_mode: input.start_mode,
      start_trigger,
      scheduled_at: null,
      schedule_timezone: null,
      audience: item?.audience ?? null,
    }
  }
  const start_trigger = assertStartTrigger(input.start_trigger)
  const item = findStartTrigger(start_trigger)
  return {
    start_mode: start_trigger ? (item?.kind ?? "event") : null,
    start_trigger,
    scheduled_at: null,
    schedule_timezone: null,
    audience: item?.audience ?? null,
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Lokale datum en tijd in de gekozen tijdzone, als UTC-moment. */
export function scheduleInstant(
  value: string | null | undefined,
  timeZone: string | null | undefined
): Date | null {
  const moment = normalizeScheduleMoment(value)
  const zone = normalizeTimezone(timeZone)
  if (!moment || !zone) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(moment)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const wanted = Date.UTC(year, month - 1, day, hour, minute)
  let utc = wanted
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts: Record<string, string> = {}
    for (const part of format.formatToParts(new Date(utc))) {
      if (part.type !== "literal") parts[part.type] = part.value
    }
    const shown = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    )
    const delta = shown - wanted
    if (delta === 0) return new Date(utc)
    utc -= delta
  }
  return new Date(utc)
}

export function isScheduleDue(
  scheduledAt: string | null | undefined,
  timeZone: string | null | undefined,
  now: Date
): boolean {
  const instant = scheduleInstant(scheduledAt, timeZone)
  if (!instant) return false
  return instant.getTime() <= now.getTime()
}

export function programActivationErrors(input: {
  name: string
  programType: string
  start_mode?: string | null
  start_trigger?: string | null
  scheduled_at?: string | null
  schedule_timezone?: string | null
  audience?: string | null
  steps: Array<{ template_name: string; sendable: boolean; type_matches: boolean }>
}): string[] {
  const problems: string[] = []
  if (!input.name.trim()) problems.push("Geef de automatisering een naam.")
  let start: ReturnType<typeof planProgramStart> | null = null
  try {
    start = planProgramStart({
      programType: input.programType,
      start_mode: input.start_mode,
      start_trigger: input.start_trigger,
      scheduled_at: input.scheduled_at,
      schedule_timezone: input.schedule_timezone,
      audience: input.audience,
    })
  } catch (err) {
    problems.push(err instanceof Error ? err.message : "Kies een geldige start.")
  }
  if (start && !start.start_mode) problems.push("Kies een startmethode.")
  if (input.steps.length === 0) problems.push("Voeg minimaal één bericht toe.")
  for (const step of input.steps) {
    const label = step.template_name.trim() || "dit bericht"
    if (!step.type_matches) {
      problems.push(`Het bericht '${label}' hoort niet bij dit type automatisering.`)
    } else if (!step.sendable) {
      problems.push(`Het bericht '${label}' is nog niet actief.`)
    }
  }
  return problems
}

export { DAY_MS }

export function planMessageSchedule(input: {
  communicationType: string
  scheduled_at?: string | null
  schedule_timezone?: string | null
  audience?: string | null
}): {
  scheduled_at: string
  schedule_timezone: string
  schedule_status: "scheduled"
  audience: "consumers" | "sellers" | "affiliates"
} {
  if (input.communicationType !== "newsletter" && input.communicationType !== "campaign") {
    throw new Error("Alleen een nieuwsbrief of campagne kan worden gepland.")
  }
  const scheduled_at = normalizeScheduleMoment(input.scheduled_at)
  if (!scheduled_at) throw new Error("Kies een startdatum en starttijd.")
  const schedule_timezone = normalizeTimezone(input.schedule_timezone)
  if (!schedule_timezone) throw new Error("Kies een tijdzone.")
  if (input.audience !== "consumers" && input.audience !== "sellers" && input.audience !== "affiliates") {
    throw new Error("Kies een doelgroep.")
  }
  return {
    scheduled_at,
    schedule_timezone,
    schedule_status: "scheduled",
    audience: input.audience,
  }
}

export function assertScheduleStatus(value: string | null | undefined): "scheduled" | null {
  if (value == null || value.trim() === "") return null
  if (value === "sent" || value === "verzonden") {
    throw new Error("Verzonden is nog niet beschikbaar.")
  }
  if (value !== "scheduled") throw new Error("Deze status is nog niet beschikbaar.")
  return "scheduled"
}

export function pickDeliveryVariant(input: {
  variants: Array<{ id: string; locale: string }>
  sourceVariantId: string
  recipientLocale: string | null | undefined
}): string {
  const wanted = input.recipientLocale?.trim().toLowerCase().slice(0, 2) || ""
  if (wanted) {
    const match = input.variants.find((variant) => variant.locale.trim().toLowerCase().slice(0, 2) === wanted)
    if (match) return match.id
  }
  return input.sourceVariantId
}
