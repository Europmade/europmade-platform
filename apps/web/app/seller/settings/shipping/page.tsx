"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import {
  CommerceCloudApiError,
  deleteShippingProfile,
  duplicateShippingProfile,
  listShippingProfiles,
  type SellerShippingProfile,
} from "../../_lib/commerce-cloud-api"
import { formatEuro } from "../../../_components/storefront-shell"

export default function SellerShippingProfilesPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<SellerShippingProfile[] | "loading">(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    listShippingProfiles()
      .then((res) => setProfiles(res.shipping_profiles || []))
      .catch((err: unknown) => {
        setProfiles([])
        setError(
          err instanceof CommerceCloudApiError
            ? err.message
            : "Verzendprofielen laden mislukt."
        )
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDuplicate(profile: SellerShippingProfile) {
    const name = window.prompt("Naam voor het nieuwe profiel:", `${profile.name} (kopie)`)
    if (!name?.trim()) return
    setBusyId(profile.id)
    try {
      const res = await duplicateShippingProfile(profile.id, name.trim())
      setNotice(`Profiel gedupliceerd als "${res.shipping_profile.name}".`)
      load()
    } catch (err: unknown) {
      setError(
        err instanceof CommerceCloudApiError
          ? err.message
          : "Dupliceren mislukt."
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(profile: SellerShippingProfile) {
    if (
      !window.confirm(
        `Verzendprofiel "${profile.name}" verwijderen? Dit kan alleen als er geen producten aan gekoppeld zijn.`
      )
    ) {
      return
    }
    setBusyId(profile.id)
    try {
      await deleteShippingProfile(profile.id)
      setNotice("Verzendprofiel verwijderd.")
      load()
    } catch (err: unknown) {
      setError(
        err instanceof CommerceCloudApiError
          ? err.message
          : "Verwijderen mislukt."
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: "Dashboard", href: "/seller" },
        { label: "Instellingen", href: "/seller/settings" },
        { label: "Verzending" },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-wf-900">Verzendprofielen</h1>
          <p className="mt-1 max-w-2xl text-xs text-wf-600">
            Stel één keer je verzendkosten en levertijden in en koppel daarna
            meerdere producten aan hetzelfde profiel.
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/seller/settings/shipping/new")}>
          + Verzendprofiel toevoegen
        </Button>
      </div>

      {error ? <Notice variant="warning">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}

      {profiles === "loading" ? (
        <p className="text-xs text-wf-500">Laden…</p>
      ) : profiles.length === 0 ? (
        <div className="rounded-lg border border-wf-300 bg-white p-6 text-xs text-wf-600">
          Je hebt nog geen verzendprofielen. Maak bijvoorbeeld &quot;Klein
          pakket&quot;, &quot;Standaard pakket&quot; of &quot;Groot pakket&quot;
          aan.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-wf-300 text-[10px] uppercase text-wf-500">
                <th className="px-3 py-2">Profiel</th>
                <th className="px-3 py-2">Producten</th>
                <th className="px-3 py-2">Landen</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Vanaf</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-wf-200">
                  <td className="px-3 py-3">
                    <Link
                      href={`/seller/settings/shipping/${p.id}`}
                      className="font-semibold text-wf-900 underline-offset-2 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{p.linked_product_count ?? 0}</td>
                  <td className="px-3 py-3">{p.active_country_count ?? 0}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        p.status === "active"
                          ? "bg-emerald-50 text-emerald-800"
                          : p.status === "draft"
                            ? "bg-wf-100 text-wf-700"
                            : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {p.status === "active"
                        ? "Actief"
                        : p.status === "draft"
                          ? "Concept"
                          : "Inactief"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {p.min_shipping_cost != null
                      ? formatEuro(p.min_shipping_cost)
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/seller/settings/shipping/${p.id}`}
                        className="text-[11px] font-semibold underline"
                      >
                        Bewerken
                      </Link>
                      <button
                        type="button"
                        className="text-[11px] font-semibold underline"
                        disabled={busyId === p.id}
                        onClick={() => void handleDuplicate(p)}
                      >
                        Dupliceren
                      </button>
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-red-700 underline"
                        disabled={busyId === p.id}
                        onClick={() => void handleDelete(p)}
                      >
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SellerGate>
  )
}
