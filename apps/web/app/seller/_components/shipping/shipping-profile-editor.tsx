"use client"

import { EU_MARKET_CODES } from "@europmade/types"
import { Button, Input } from "@europmade/ui"
import type {
  DeliveryTimeCode,
  ProcessingSettings,
  SellerShippingProfile,
  ShippingCountryConfig,
} from "../../_lib/commerce-cloud-api"

export const DELIVERY_TIME_OPTIONS: Array<{
  code: DeliveryTimeCode
  label: string
}> = [
  { code: "same_day", label: "Zelfde werkdag" },
  { code: "next_day", label: "Volgende werkdag" },
  { code: "1_2", label: "1–2 werkdagen" },
  { code: "2_3", label: "2–3 werkdagen" },
  { code: "3_5", label: "3–5 werkdagen" },
  { code: "5_plus", label: "Meer dan 5 werkdagen" },
]

export const WEEKDAY_LABELS: Record<string, string> = {
  mon: "Maandag",
  tue: "Dinsdag",
  wed: "Woensdag",
  thu: "Donderdag",
  fri: "Vrijdag",
  sat: "Zaterdag",
  sun: "Zondag",
}

export function defaultCountryRow(cost = 0): ShippingCountryConfig {
  return {
    active: true,
    shipping_cost: cost,
    free_shipping: false,
    free_shipping_threshold: null,
    delivery_time_code: "2_3",
    delivery_days_max: 3,
    delivery_weekdays: [1, 2, 3, 4, 5, 6],
    carrier_ref: null,
  }
}

export function defaultProcessing(): ProcessingSettings {
  const base = {
    enabled: true,
    cutoff_time: "15:00",
    processing_time_code: "next_day" as DeliveryTimeCode,
  }
  return {
    same_for_all_weekdays: true,
    default_handover: base,
    weekdays: {
      mon: { ...base, enabled: true },
      tue: { ...base, enabled: true },
      wed: { ...base, enabled: true },
      thu: { ...base, enabled: true },
      fri: { ...base, enabled: true },
      sat: { ...base, enabled: false },
      sun: { ...base, enabled: false },
    },
  }
}

export function buildEmptyProfileDraft(): Partial<SellerShippingProfile> {
  const country_rates: Record<string, ShippingCountryConfig> = {}
  for (const code of ["NL", "BE", "DE", "FR"] as const) {
    country_rates[code] = defaultCountryRow()
  }
  return {
    name: "",
    description: "",
    status: "draft",
    country_rates,
    processing_settings: defaultProcessing(),
    carrier_mode: "own",
  }
}

type Props = {
  draft: Partial<SellerShippingProfile>
  onChange: (next: Partial<SellerShippingProfile>) => void
  showAdvanced?: boolean
  onToggleAdvanced?: () => void
}

export function ShippingProfileEditor(props: Props) {
  const { draft, onChange, showAdvanced, onToggleAdvanced } = props
  const rates = draft.country_rates || {}
  const selected = Object.keys(rates)
  const processing = draft.processing_settings || defaultProcessing()

  function setRate(code: string, patch: Partial<ShippingCountryConfig>) {
    onChange({
      ...draft,
      country_rates: {
        ...rates,
        [code]: { ...rates[code], ...patch },
      },
    })
  }

  function toggleCountry(code: string) {
    if (rates[code]) {
      const next = { ...rates }
      delete next[code]
      onChange({ ...draft, country_rates: next })
      return
    }
    onChange({
      ...draft,
      country_rates: { ...rates, [code]: defaultCountryRow() },
    })
  }

  function applyBulkCost(value: string) {
    const cost = Number(value)
    if (!Number.isFinite(cost)) return
    const next = { ...rates }
    for (const code of Object.keys(next)) {
      next[code] = { ...next[code], shipping_cost: cost, free_shipping: cost === 0 }
    }
    onChange({ ...draft, country_rates: next })
  }

  function applyBulkDelivery(code: DeliveryTimeCode) {
    const next = { ...rates }
    for (const c of Object.keys(next)) {
      next[c] = {
        ...next[c],
        delivery_time_code: code,
        delivery_days_max:
          code === "same_day"
            ? 0
            : code === "next_day"
              ? 1
              : code === "1_2"
                ? 2
                : code === "2_3"
                  ? 3
                  : code === "3_5"
                    ? 5
                    : 7,
      }
    }
    onChange({ ...draft, country_rates: next })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-wf-300 bg-white p-4">
        <h2 className="text-sm font-bold text-wf-900">Basis</h2>
        <p className="mt-1 text-xs text-wf-600">
          Gebruik een duidelijke naam zodat je later eenvoudig kunt herkennen
          welke producten dit verzendprofiel gebruiken.
        </p>
        <div className="mt-3 grid gap-3 tablet:grid-cols-2">
          <Input
            label="Profielnaam"
            value={draft.name || ""}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="Standaard pakket EU"
          />
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
              Status
            </label>
            <select
              className="h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
              value={draft.status || "draft"}
              onChange={(e) =>
                onChange({
                  ...draft,
                  status: e.target.value as SellerShippingProfile["status"],
                })
              }
            >
              <option value="draft">Concept</option>
              <option value="active">Actief</option>
              <option value="inactive">Inactief</option>
            </select>
          </div>
          <div className="tablet:col-span-2">
            <Input
              label="Beschrijving (optioneel)"
              value={draft.description || ""}
              onChange={(e) =>
                onChange({ ...draft, description: e.target.value })
              }
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-wf-300 bg-white p-4">
        <h2 className="text-sm font-bold text-wf-900">Waar lever je?</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {EU_MARKET_CODES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => toggleCountry(code)}
              className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                rates[code]
                  ? "border-wf-900 bg-wf-900 text-white"
                  : "border-wf-400 bg-white text-wf-700"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-wf-300 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-wf-900">Levering per land</h2>
          <div className="flex flex-wrap gap-2">
            <Input
              label="Zelfde kosten (€)"
              value=""
              placeholder="7,95"
              onChange={(e) => applyBulkCost(e.target.value.replace(",", "."))}
            />
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                Zelfde levertijd
              </label>
              <select
                className="h-9 rounded border border-wf-400 bg-white px-2 text-xs"
                defaultValue=""
                onChange={(e) =>
                  applyBulkDelivery(e.target.value as DeliveryTimeCode)
                }
              >
                <option value="" disabled>
                  Kies…
                </option>
                {DELIVERY_TIME_OPTIONS.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-wf-300 text-[10px] uppercase text-wf-500">
                <th className="px-2 py-2">Land</th>
                <th className="px-2 py-2">Levertijd ⓘ</th>
                <th className="px-2 py-2">Verzendkosten</th>
                <th className="px-2 py-2">Gratis</th>
              </tr>
            </thead>
            <tbody>
              {selected.sort().map((code) => {
                const row = rates[code]
                return (
                  <tr key={code} className="border-b border-wf-200">
                    <td className="px-2 py-2 font-semibold">{code}</td>
                    <td className="px-2 py-2">
                      <select
                        className="h-8 w-full rounded border border-wf-400 px-1"
                        value={row.delivery_time_code}
                        onChange={(e) =>
                          setRate(code, {
                            delivery_time_code: e.target.value as DeliveryTimeCode,
                          })
                        }
                      >
                        {DELIVERY_TIME_OPTIONS.map((o) => (
                          <option key={o.code} value={o.code}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="h-8 w-24 rounded border border-wf-400 px-2"
                        value={row.free_shipping ? "" : String(row.shipping_cost)}
                        disabled={row.free_shipping}
                        onChange={(e) =>
                          setRate(code, {
                            shipping_cost: Number(
                              e.target.value.replace(",", ".")
                            ),
                            free_shipping: false,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={row.free_shipping}
                          onChange={(e) =>
                            setRate(code, {
                              free_shipping: e.target.checked,
                              shipping_cost: e.target.checked
                                ? 0
                                : row.shipping_cost,
                            })
                          }
                        />
                        <span>Gratis</span>
                      </label>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-wf-300 bg-white p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={onToggleAdvanced}
        >
          <h2 className="text-sm font-bold text-wf-900">Geavanceerde instellingen</h2>
          <span className="text-xs text-wf-500">{showAdvanced ? "▲" : "▼"}</span>
        </button>
        {showAdvanced ? (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-semibold text-wf-800">
                Van bestelling tot overdracht
              </p>
              <p className="mt-1 text-[11px] text-wf-600">
                Bestellingen die vóór de uiterste besteltijd binnenkomen, kunnen
                op die dag worden overgedragen. Daarna geldt de volgende
                overdrachtsdag.
              </p>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={processing.same_for_all_weekdays}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      processing_settings: {
                        ...processing,
                        same_for_all_weekdays: e.target.checked,
                      },
                    })
                  }
                />
                Zelfde instelling voor alle werkdagen
              </label>
              <div className="mt-2 grid gap-2 tablet:grid-cols-2">
                <Input
                  label="Uiterste besteltijd"
                  value={processing.default_handover.cutoff_time}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      processing_settings: {
                        ...processing,
                        default_handover: {
                          ...processing.default_handover,
                          cutoff_time: e.target.value,
                        },
                      },
                    })
                  }
                />
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                    Verwerkingstijd ⓘ
                  </label>
                  <select
                    className="h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
                    value={processing.default_handover.processing_time_code}
                    onChange={(e) =>
                      onChange({
                        ...draft,
                        processing_settings: {
                          ...processing,
                          default_handover: {
                            ...processing.default_handover,
                            processing_time_code: e.target
                              .value as DeliveryTimeCode,
                          },
                        },
                      })
                    }
                  >
                    {DELIVERY_TIME_OPTIONS.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-wf-500">
              Carrier-integraties (DHL, PostNL, FedEx) worden later ondersteund.
              Dit profiel gebruikt nu eigen verzending.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
