"use client"

import type { ProductManagerDetail } from "../../../_lib/product-cloud-api"
import {
  WIZARD_STEPS,
  wizardStepGaps,
  wizardStepStatus,
  type WizardStepKey,
  type WizardStepStatus,
} from "../_lib/product-wizard"

function statusClasses(status: WizardStepStatus, active: boolean): string {
  if (active) return "border-wf-900 bg-wf-900 text-white"
  if (status === "ready") return "border-emerald-500 bg-emerald-50 text-emerald-900"
  if (status === "waiting") return "border-blue-400 bg-blue-50 text-blue-900"
  if (status === "action") return "border-amber-400 bg-amber-50 text-amber-900"
  return "border-wf-300 bg-wf-50 text-wf-600"
}

function dot(status: WizardStepStatus): string {
  if (status === "ready") return "bg-emerald-500"
  if (status === "waiting") return "bg-blue-500"
  if (status === "action") return "bg-amber-400"
  return "bg-wf-300"
}

export function ProductWizardProgress(props: {
  product: ProductManagerDetail
  current: WizardStepKey
  onSelect: (step: WizardStepKey) => void
}) {
  const { product, current, onSelect } = props
  const currentGaps = wizardStepGaps(product, current)

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
          Productflow
        </p>
        <p className="text-[11px] text-wf-600">
          Stap {WIZARD_STEPS.findIndex((s) => s.key === current) + 1} van{" "}
          {WIZARD_STEPS.length}
        </p>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {WIZARD_STEPS.map((step, index) => {
          const status = wizardStepStatus(product, step.key)
          const active = step.key === current
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onSelect(step.key)}
              title={
                wizardStepGaps(product, step.key).slice(0, 3).join(" · ") ||
                "Compleet"
              }
              className={`flex min-w-[88px] flex-1 flex-col items-start gap-1 rounded-md border px-2 py-2 text-left transition ${statusClasses(status, active)}`}
            >
              <span className="flex items-center gap-1.5 text-[10px] font-semibold">
                <span
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${active ? "bg-white" : dot(status)}`}
                />
                {index + 1}. {step.shortLabel}
              </span>
              <span className="hidden text-[10px] leading-tight opacity-80 tablet:block">
                {step.label}
              </span>
            </button>
          )
        })}
      </div>
      {currentGaps.length > 0 ? (
        <ul
          className={`mt-2 space-y-0.5 rounded border px-2 py-1.5 text-[11px] ${
            wizardStepStatus(product, current) === "waiting"
              ? "border-blue-200 bg-blue-50 text-blue-950"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          {currentGaps.slice(0, 5).map((gap) => (
            <li key={gap}>
              {wizardStepStatus(product, current) === "waiting" ? "⏳" : "❌"}{" "}
              {gap}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] font-semibold text-emerald-800">
          ✓ Deze stap is compleet
        </p>
      )}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-wf-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{
            width: `${Math.round(
              ((WIZARD_STEPS.findIndex((s) => s.key === current) + 1) /
                WIZARD_STEPS.length) *
                100
            )}%`,
          }}
        />
      </div>
    </div>
  )
}
