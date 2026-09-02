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

export type WizardStepStatus = "ready" | "action" | "empty"

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
  const c = product.completeness
  const offer = product.offer
  const hasOffer = Boolean(offer?.has_offer || (product.offers?.offer_count ?? 0) > 0)
  const hasPrice =
    (product.offers?.price ?? offer?.price ?? null) != null &&
    Number(product.offers?.price ?? offer?.price ?? 0) > 0
  const hasStock =
    (product.offers?.stock_total ?? offer?.quantity_available ?? null) != null
  const hasDelivery =
    offer?.delivery_days_max != null ||
    offer?.shipping_cost != null ||
    c?.sale_blocked_reasons?.every((r) => !r.toLowerCase().includes("levertijd")) ===
      false

  switch (step) {
    case "information": {
      const basis = sectionFilled(product, ["basis", "required"])
      if (basis.total > 0 && basis.filled === basis.total) return "ready"
      if (product.title?.trim() && product.brand_id) return "action"
      return "empty"
    }
    case "offer":
      if (hasOffer && hasPrice) return "ready"
      if (hasOffer || hasPrice) return "action"
      return "empty"
    case "shipping":
      if (product.shipping_profile_id || product.shipping_profile) return "ready"
      if (hasOffer && hasStock) return "action"
      return "empty"
    case "media":
      if ((product.media || []).some((m) => m.media_type === "Hoofdafbeelding"))
        return "ready"
      if ((product.media || []).length > 0) return "action"
      return "empty"
    case "compliance": {
      const status = c?.compliance_review_status
      if (status === "approved" || c?.compliance_status === "complete")
        return "ready"
      if (
        status === "pending_review" ||
        status === "precheck_warning" ||
        c?.compliance_status === "pending_review"
      )
        return "action"
      const comp = sectionFilled(product, ["compliance"])
      if (comp.filled > 0) return "action"
      return "empty"
    }
    case "translations":
      return "empty"
    case "publish":
      if (product.publication_status === "Gepubliceerd") return "ready"
      if (c?.publishable) return "ready"
      if (product.publication_status === "In review") return "action"
      return "empty"
    default:
      return "empty"
  }
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
  const missingCount = cards.filter((s) => s !== "ready").length
  const ready = missingCount === 0 && Boolean(product.completeness?.publishable)
  const headline = ready
    ? "Gereed om te publiceren"
    : missingCount === 1
      ? "Nog 1 onderdeel ontbreekt."
      : `Nog ${missingCount} onderdelen ontbreken.`
  return { ready, missingCount, headline }
}

export function readinessCardStep(key: ReadinessCardKey): WizardStepKey {
  if (key === "stock") return "shipping"
  return key
}
