"use client"

import { useCallback, useEffect, useState } from "react"
import { Button, Input } from "@europmade/ui"
import {
  CommerceCloudApiError,
  createShippingProfile,
  listShippingProfiles,
  type SellerShippingProfile,
} from "../../../_lib/commerce-cloud-api"

const DEFAULT_MARKETS = ["NL", "BE", "DE", "FR"] as const

type Props = {
  regionCode?: string | null
  onApplyProfile: (profile: SellerShippingProfile) => void
}

export function SellerShippingProfilesPanel(props: Props) {
  const { regionCode, onApplyProfile } = props
  const [profiles, setProfiles] = useState<SellerShippingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [rates, setRates] = useState<Record<string, string>>({
    NL: "0",
    BE: "0",
    DE: "0",
    FR: "0",
  })
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    listShippingProfiles()
      .then((res) => setProfiles(res.shipping_profiles || []))
      .catch((err: unknown) =>
        setError(
          err instanceof CommerceCloudApiError
            ? err.message
            : "Verzendprofielen laden mislukt."
        )
      )
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate() {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const country_rates: SellerShippingProfile["country_rates"] = {}
      for (const code of DEFAULT_MARKETS) {
        const value = Number(rates[code] || 0)
        if (Number.isFinite(value)) {
          country_rates[code] = { shipping_cost: value }
        }
      }
      await createShippingProfile({ name: name.trim(), country_rates })
      setName("")
      setShowCreate(false)
      load()
    } catch (err: unknown) {
      setError(
        err instanceof CommerceCloudApiError
          ? err.message
          : "Verzendprofiel opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded border border-wf-200 bg-wf-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-wf-800">
          Verzendprofielen
        </p>
        <Button
          size="sm"
          variant="secondary"
          type="button"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? "Annuleren" : "Nieuw profiel"}
        </Button>
      </div>

      {error ? <p className="text-[11px] text-red-700">{error}</p> : null}

      {showCreate ? (
        <div className="space-y-2 rounded border border-wf-300 bg-white p-2">
          <Input
            label="Profielnaam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bijv. Klein pakket"
          />
          <div className="grid gap-2 tablet:grid-cols-2">
            {DEFAULT_MARKETS.map((code) => (
              <Input
                key={code}
                label={`${code} verzendkosten (€)`}
                value={rates[code] || ""}
                onChange={(e) =>
                  setRates((prev) => ({ ...prev, [code]: e.target.value }))
                }
              />
            ))}
          </div>
          <Button size="sm" disabled={busy} onClick={() => void handleCreate()}>
            Profiel opslaan
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-[11px] text-wf-500">Laden…</p>
      ) : profiles.length === 0 ? (
        <p className="text-[11px] text-wf-600">
          Nog geen verzendprofielen. Maak bijvoorbeeld Klein pakket, Middel
          pakket of Pallet aan.
        </p>
      ) : (
        <ul className="space-y-1">
          {profiles.map((profile) => {
            const rate =
              regionCode &&
              profile.country_rates?.[regionCode.toUpperCase()]
            return (
              <li
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-wf-300 bg-white px-2 py-1.5 text-[11px]"
              >
                <span className="font-semibold text-wf-900">{profile.name}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => onApplyProfile(profile)}
                >
                  Gebruiken
                  {rate ? ` (${rate.shipping_cost} €)` : ""}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
