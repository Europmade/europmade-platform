"use client"

import type { ProductManagerDetail } from "../../../_lib/product-cloud-api"
import {
  READINESS_CARDS,
  readinessCardStatus,
  readinessCardStep,
  readinessSummary,
  wizardStepGaps,
  type ReadinessCardKey,
  type WizardStepKey,
  type WizardStepStatus,
} from "../_lib/product-wizard"

function cardLabel(
  status: WizardStepStatus,
  key: ReadinessCardKey
): string {
  if (status === "ready") {
    return key === "compliance" ? "Goedgekeurd" : "Gereed"
  }
  if (status === "waiting") return "Wachten op goedkeuring"
  if (status === "action") return "Actie nodig"
  return "Ontbreekt"
}

function cardClasses(status: WizardStepStatus): string {
  if (status === "ready")
    return "border-emerald-200 bg-emerald-50 text-emerald-900"
  if (status === "waiting")
    return "border-blue-200 bg-blue-50 text-blue-900"
  if (status === "action")
    return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-wf-200 bg-wf-50 text-wf-700"
}

export function PublicationReadinessCards(props: {
  product: ProductManagerDetail
  onOpenStep: (step: WizardStepKey) => void
}) {
  const { product, onOpenStep } = props
  const summary = readinessSummary(product)
  const cards = READINESS_CARDS.map((c) => {
    const status = readinessCardStatus(product, c.key)
    const gaps =
      status === "ready" || status === "waiting"
        ? []
        : wizardStepGaps(product, readinessCardStep(c.key)).slice(0, 3)
    return { ...c, status, gaps }
  })
  const onlyWaiting =
    !summary.ready &&
    cards.every((c) => c.status === "ready" || c.status === "waiting") &&
    cards.some((c) => c.status === "waiting")

  return (
    <div className="space-y-3">
      <div
        className={`rounded-lg border p-4 ${
          summary.ready
            ? "border-emerald-200 bg-emerald-50"
            : onlyWaiting
              ? "border-blue-200 bg-blue-50"
              : "border-wf-300 bg-white"
        }`}
      >
        <p
          className={`text-sm font-semibold ${
            summary.ready
              ? "text-emerald-900"
              : onlyWaiting
                ? "text-blue-900"
                : "text-wf-900"
          }`}
        >
          {summary.headline}
        </p>
        {summary.ready ? (
          <p className="mt-1 text-xs text-emerald-800">
            Je product is compleet. Je kunt het nu publiceren of indienen voor
            beoordeling.
          </p>
        ) : onlyWaiting ? (
          <p className="mt-1 text-xs text-blue-800">
            Je hebt de benodigde gegevens aangeleverd. EuropMade beoordeelt je
            compliance-bewijs. Er is nu geen actie van jou nodig.
          </p>
        ) : (
          <p className="mt-1 text-xs text-wf-600">
            Vul de onderstaande onderdelen aan om je product te kunnen
            publiceren.
          </p>
        )}
      </div>

      <div className="grid gap-2 tablet:grid-cols-2 desktop:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() =>
              onOpenStep(readinessCardStep(card.key as ReadinessCardKey))
            }
            className={`rounded-lg border p-3 text-left transition hover:opacity-90 ${cardClasses(card.status)}`}
          >
            <p className="text-xs font-semibold">{card.label}</p>
            <p className="mt-1 text-[11px]">{cardLabel(card.status, card.key)}</p>
            {card.gaps.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-[10px]">
                {card.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
