import type {
  CompletenessReport,
  ProductManagerDetail,
} from "./product-cloud-api"
import { t } from "../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../_lib/i18n/locales"

export function complianceReviewLabel(
  c?: CompletenessReport | null,
  locale: StorefrontLocale = "nl"
): { label: string; className: string } {
  const status = c?.compliance_review_status
  if (status === "approved")
    return { label: t("complianceApproved", locale), className: "text-emerald-700" }
  if (status === "pending_review")
    return { label: t("compliancePendingReview", locale), className: "text-blue-700" }
  if (status === "precheck_warning")
    return { label: t("compliancePrecheckWarning", locale), className: "text-amber-700" }
  if (status === "rejected")
    return { label: t("complianceRejected", locale), className: "text-red-700" }
  if (c?.compliance_status === "complete")
    return { label: t("complianceComplete", locale), className: "text-emerald-700" }
  if (c?.compliance_status === "not_applicable")
    return { label: t("complianceNotApplicable", locale), className: "text-wf-500" }
  return { label: t("complianceMissing", locale), className: "text-amber-700 font-semibold" }
}

export function salePresentationLabel(
  c?: CompletenessReport | null,
  offer?: { sales_status?: string | null; has_offer?: boolean },
  locale: StorefrontLocale = "nl"
): { label: string; className: string; offerHint?: string; detail?: string } {
  const presentation = c?.sale_presentation
  const reasons = (c?.sale_blocked_reasons || []).filter(Boolean)
  const reasonText = reasons.length ? reasons.join(" · ") : undefined
  const offerActive =
    offer?.sales_status === "active" || offer?.sales_status === "mixed"
  const offerHint =
    offerActive && presentation === "blocked"
      ? t("saleOfferActive", locale)
      : offer?.sales_status === "paused"
        ? t("saleOfferPaused", locale)
        : undefined

  switch (presentation) {
    case "for_sale":
      return {
        label: t("saleForSale", locale),
        className: "text-emerald-800 bg-emerald-50",
      }
    case "paused":
      return {
        label: t("salePaused", locale),
        className: "text-amber-800 bg-amber-50",
        offerHint,
      }
    case "no_offer":
      return {
        label: t("saleNoOffer", locale),
        className: "text-wf-600 bg-wf-50",
        detail: t("saleNeedOffer", locale),
      }
    case "not_published":
      return {
        label: t("saleNotPublished", locale),
        className: "text-wf-700 bg-wf-100",
        offerHint,
        detail: t("saleNeedPublish", locale),
      }
    case "blocked":
    default:
      return {
        label: reasonText
          ? `${t("saleBlockedFull", locale)} — ${reasons[0]}`
          : t("saleBlockedFull", locale),
        className: "text-red-800 bg-red-50",
        offerHint,
        detail: reasonText,
      }
  }
}

export function publicationGateLabel(product: {
  publication_status?: string | null
  completeness?: CompletenessReport | null
}, locale: StorefrontLocale = "nl"): { label: string; className: string; detail?: string } {
  if (product.publication_status === "Gepubliceerd")
    return { label: t("pubPublished", locale), className: "text-emerald-800 bg-emerald-50" }
  if (product.completeness?.publishable)
    return {
      label: t("pubPublishable", locale),
      className: "text-emerald-700 bg-emerald-50",
    }
  const reasons = product.completeness?.publication_blocked_reasons || []
  return {
    label: t("pubNotPublishable", locale),
    className: "text-red-800 bg-red-50",
    detail: reasons.length ? reasons.join(" · ") : undefined,
  }
}

export function workflowStatusLabel(product: {
  publication_status?: string | null
  approval_rejection_reason?: string | null
  admin_review_outcome?: string | null
  workflow_status?: string | null
  completeness?: CompletenessReport | null
}, locale: StorefrontLocale = "nl"): string {
  const status = product.workflow_status
  if (status === "published" || product.publication_status === "Gepubliceerd")
    return t("wfPublished", locale)
  if (
    status === "needs_information" ||
    product.admin_review_outcome === "needs_info"
  )
    return t("wfNeedsInformation", locale)
  if (status === "pending_admin_approval" || product.publication_status === "In review")
    return t("wfPendingApproval", locale)
  if (
    status === "rejected" ||
    product.admin_review_outcome === "rejected" ||
    (product.approval_rejection_reason &&
      product.admin_review_outcome !== "needs_info")
  )
    return t("wfRejected", locale)
  if (status === "pending_evidence_review")
    return t("wfPendingEvidence", locale)
  if (status === "paused") return t("wfPaused", locale)
  if (status === "complete" || product.completeness?.publishable)
    return t("wfComplete", locale)
  if (status === "incomplete") return t("wfIncomplete", locale)
  return t("wfDraft", locale)
}

export function parseMultiSelectValue(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed))
      return parsed.filter((x): x is string => typeof x === "string")
  } catch {
    /* legacy single value */
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function serializeMultiSelectValue(values: string[]): string {
  return JSON.stringify([...new Set(values.map((v) => v.trim()).filter(Boolean))])
}

export function productHasSaleBlock(product: ProductManagerDetail): boolean {
  return (
    product.completeness?.sale_presentation === "blocked" ||
    product.completeness?.sale_presentation === "no_offer" ||
    product.completeness?.sale_presentation === "not_published"
  )
}
