import type { ProductManagerDetail } from "../../../_lib/product-cloud-api"

/** Linear seller product wizard (Sprint 3B). */
export type WizardStepKey =
  | "information"
  | "offer"
  | "shipping"
  | "media"
  | "compliance"
  | "translations"
  | "publish"

export type WizardStepStatus = "ready" | "action" | "waiting" | "empty"

export type WizardStep = {
  key: WizardStepKey
  label: string
  shortLabel: string
}

export const WIZARD_STEPS: WizardStep[] = [
  { key: "information", label: "Productinformatie", shortLabel: "Info" },
  { key: "offer", label: "Verkoopinformatie", shortLabel: "Verkoop" },
  { key: "shipping", label: "Voorraad & verzending", shortLabel: "Voorraad" },
  { key: "media", label: "Media", shortLabel: "Media" },
  { key: "compliance", label: "Compliance", shortLabel: "Compliance" },
  { key: "translations", label: "Vertalingen", shortLabel: "Vertalingen" },
  { key: "publish", label: "Publiceren", shortLabel: "Publiceren" },
]

const LEGACY_TAB_MAP: Record<string, WizardStepKey> = {
  overview: "information",
  information: "information",
  variants: "information",
  offer: "offer",
  media: "media",
  translations: "translations",
  publication: "publish",
  history: "information",
}

export function resolveWizardStep(
  raw: string | null | undefined
): WizardStepKey {
  if (!raw) return "information"
  if (WIZARD_STEPS.some((s) => s.key === raw)) return raw as WizardStepKey
  return LEGACY_TAB_MAP[raw] ?? "information"
}

export function nextWizardStep(current: WizardStepKey): WizardStepKey | null {
  const idx = WIZARD_STEPS.findIndex((s) => s.key === current)
  if (idx < 0 || idx >= WIZARD_STEPS.length - 1) return null
  return WIZARD_STEPS[idx + 1].key
}

function sectionFilled(
  product: ProductManagerDetail,
  keys: string[]
): { filled: number; total: number } {
  const sections = product.completeness?.sections || []
  const fields = sections
    .filter((s) => keys.includes(s.key))
    .flatMap((s) => s.fields)
  if (!fields.length) return { filled: 0, total: 0 }
  return {
    filled: fields.filter((f) => f.filled).length,
    total: fields.length,
  }
}

export function wizardStepStatus(
  product: ProductManagerDetail,
  step: WizardStepKey
): WizardStepStatus {
  if (step === "compliance") {
    const status = product.completeness?.compliance_review_status
    if (
      status === "pending_review" ||
      status === "precheck_warning" ||
      product.completeness?.compliance_status === "pending_review"
    ) {
      return "waiting"
    }
  }
  const gaps = wizardStepGaps(product, step)
  if (gaps.length === 0) return "ready"
  if (
    step === "information" &&
    (product.title?.trim() || product.brand_id)
  )
    return "action"
  if (step === "offer" && (product.offer?.has_offer || product.offers?.offer_count))
    return "action"
  if (step === "shipping" && product.offer?.has_offer) return "action"
  if (step === "media" && (product.media || []).length > 0) return "action"
  if (step === "compliance") {
    if (sectionFilled(product, ["compliance"]).filled > 0) return "action"
  }
  if (step === "publish" && product.publication_status === "In review")
    return "waiting"
  return "empty"
}

/** Concrete missing items for a wizard step (NL). Safety warnings never listed. */
export function wizardStepGaps(
  product: ProductManagerDetail,
  step: WizardStepKey
): string[] {
  const c = product.completeness
  const offer = product.offer
  const gaps: string[] = []

  switch (step) {
    case "information": {
      if (!product.title?.trim()) gaps.push("Producttitel ontbreekt")
      if (!product.brand_id) gaps.push("Merk ontbreekt")
      break
    }
    case "offer": {
      const hasOffer = Boolean(
        offer?.has_offer || (product.offers?.offer_count ?? 0) > 0
      )
      if (!hasOffer) {
        gaps.push("Verkoopaanbod ontbreekt")
        break
      }
      const price = offer?.price ?? product.offers?.price ?? null
      if (price == null) gaps.push("Standaardprijs ontbreekt")
      break
    }
    case "shipping": {
      if (!product.shipping_profile_id && !product.shipping_profile) {
        gaps.push("Verzendprofiel ontbreekt")
      }
      if (offer?.quantity_available == null && product.offers?.stock_total == null) {
        gaps.push("Voorraad niet ingesteld")
      }
      break
    }
    case "media": {
      const media = product.media || []
      if (!media.some((m) => m.media_type === "Hoofdafbeelding")) {
        gaps.push("Hoofdafbeelding ontbreekt")
      }
      break
    }
    case "compliance": {
      const status = c?.compliance_review_status
      if (status === "missing" || c?.compliance_status === "incomplete") {
        gaps.push("Compliance-bewijs incompleet")
      }
      if (status === "rejected") gaps.push("Compliance-bewijs afgekeurd")
      if (status === "pending_review" || status === "precheck_warning") {
        gaps.push("Wachten op goedkeuring")
      }
      for (const doc of c?.documents || []) {
        if (!doc.required) continue
        if (doc.status === "approved") continue
        if (
          doc.status === "pending" ||
          doc.status === "pending_review" ||
          doc.status === "pending_evidence_review"
        ) {
          if (!gaps.includes("Wachten op goedkeuring")) {
            gaps.push("Wachten op goedkeuring")
          }
          continue
        }
        if (!doc.present || doc.status === "missing") {
          gaps.push(`${doc.name} ontbreekt`)
        }
      }
      break
    }
    case "translations": {
      const translationDocs = (c?.documents || []).filter((d) =>
        String(d.code || "").startsWith("translation.")
      )
      if (!translationDocs.length) {
        gaps.push("Vertalingen nog niet gecontroleerd")
        break
      }
      for (const doc of translationDocs) {
        if (!doc.required) continue
        if (doc.status === "approved") continue
        if (!doc.present || doc.status === "missing") {
          gaps.push(`${doc.name} ontbreekt`)
        } else {
          gaps.push(`${doc.name} incompleet`)
        }
      }
      break
    }
    case "publish": {
      if (product.publication_status === "Gepubliceerd") return []
      if (c?.publishable) return []
      for (const r of c?.publication_blocked_reasons || []) {
        if (
          r.toLowerCase().includes("veiligheid") ||
          r.toLowerCase().includes("safety")
        ) {
          continue
        }
        gaps.push(r)
      }
      if (!gaps.length) gaps.push("Nog niet publiceerbaar")
      break
    }
    default:
      break
  }
  return gaps
}

export type WizardAttention = {
  visited: WizardStepKey[]
  attempted: WizardStepKey[]
}

export function emptyWizardAttention(current?: WizardStepKey): WizardAttention {
  return { visited: current ? [current] : [], attempted: [] }
}

export function markWizardVisited(
  attention: WizardAttention,
  step: WizardStepKey
): WizardAttention {
  if (attention.visited.includes(step)) return attention
  return { ...attention, visited: [...attention.visited, step] }
}

export function markWizardAttempted(
  attention: WizardAttention,
  step: WizardStepKey
): WizardAttention {
  const visited = attention.visited.includes(step)
    ? attention.visited
    : [...attention.visited, step]
  if (attention.attempted.includes(step)) return { ...attention, visited }
  return { ...attention, visited, attempted: [...attention.attempted, step] }
}

/** Missing fields of a step stay hidden until the seller tries to leave it. */
export function wizardStepShowsGaps(
  step: WizardStepKey,
  attention: WizardAttention
): boolean {
  if (step === "publish") return false
  return attention.attempted.includes(step)
}

/**
 * Incomplete steps stay neutral until the seller tries to skip or continue.
 * Ready and waiting states stay visible.
 */
export function wizardChromeStatus(
  product: ProductManagerDetail,
  step: WizardStepKey,
  attention: WizardAttention
): WizardStepStatus {
  const real = wizardStepStatus(product, step)
  if (real === "ready" || real === "waiting") return real
  if (!attention.attempted.includes(step)) return "empty"
  return real
}

export type ReadinessCardKey =
  | "information"
  | "offer"
  | "stock"
  | "media"
  | "compliance"
  | "translations"

export const READINESS_CARDS: Array<{ key: ReadinessCardKey; label: string }> =
  [
    { key: "information", label: "Productinformatie" },
    { key: "offer", label: "Verkoopinformatie" },
    { key: "stock", label: "Voorraad" },
    { key: "media", label: "Media" },
    { key: "compliance", label: "Compliance" },
    { key: "translations", label: "Vertalingen" },
  ]

export function readinessCardStatus(
  product: ProductManagerDetail,
  key: ReadinessCardKey
): WizardStepStatus {
  if (key === "stock") return wizardStepStatus(product, "shipping")
  if (key === "information") return wizardStepStatus(product, "information")
  if (key === "offer") return wizardStepStatus(product, "offer")
  if (key === "media") return wizardStepStatus(product, "media")
  if (key === "compliance") return wizardStepStatus(product, "compliance")
  return wizardStepStatus(product, "translations")
}

export function readinessSummary(product: ProductManagerDetail): {
  ready: boolean
  missingCount: number
  headline: string
} {
  const cards = READINESS_CARDS.map((c) => readinessCardStatus(product, c.key))
  const waitingCount = cards.filter((s) => s === "waiting").length
  const sellerActionCount = cards.filter(
    (s) => s === "action" || s === "empty"
  ).length
  const missingCount = cards.filter((s) => s !== "ready").length
  const ready = missingCount === 0 && Boolean(product.completeness?.publishable)
  let headline: string
  if (ready) {
    headline = "Gereed om te publiceren"
  } else if (sellerActionCount === 0 && waitingCount > 0) {
    headline = "Wachten op goedkeuring van EuropMade"
  } else if (missingCount === 1) {
    headline = "Nog 1 onderdeel ontbreekt."
  } else {
    headline = `Nog ${missingCount} onderdelen ontbreken.`
  }
  return { ready, missingCount, headline }
}

export function readinessCardStep(key: ReadinessCardKey): WizardStepKey {
  if (key === "stock") return "shipping"
  return key
}
