"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import {
  getTranslationSummary,
  markTranslationsStale,
  publishTranslation,
  ProductCloudTranslationsApiError,
  retranslate,
  saveManualTranslation,
  reviewStatusLabel,
  uiStatusLabel,
  type TranslationRow,
} from "../../../../../lib/product-cloud-translations-api"

type SummaryState = {
  version: {
    id: string
    product_id: string
    title: string
    description: string
    source_language_code: string | null
  }
  source_language_code: string | null
  translations: TranslationRow[]
  provider_configured: boolean
}

/**
 * Admin detail: bekijken / handmatig / publiceren / retranslate / stale.
 */
export default function ProductCloudTranslationDetailPage() {
  const params = useParams<{ versionId: string }>()
  const versionId = params.versionId

  const [data, setData] = useState<SummaryState | "loading" | null>("loading")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setError(null)
    const summary = await getTranslationSummary(versionId)
    setData({
      version: summary.version,
      source_language_code: summary.source_language_code,
      translations: summary.translations,
      provider_configured: summary.provider_configured,
    })
  }, [versionId])

  useEffect(() => {
    let cancelled = false
    setData("loading")
    reload()
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ProductCloudTranslationsApiError
            ? err.message
            : "Vertalingen laden mislukt."
        )
        setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [reload])

  const selected =
    data && data !== "loading"
      ? data.translations.find((t) => t.id === selectedId) ?? null
      : null

  function openRow(row: TranslationRow) {
    setSelectedId(row.id)
    setEditValue(row.value ?? "")
    setNotice(null)
  }

  async function handleSaveManual() {
    if (!data || data === "loading" || !selected) return
    setBusy(true)
    setNotice(null)
    try {
      await saveManualTranslation({
        entity_type: "product_version",
        entity_id: data.version.id,
        field_name: selected.field_name,
        language_code: selected.language_code,
        value: editValue,
        source_language_code: data.source_language_code,
        source_value: selected.source_value ?? null,
        source_version: selected.source_version,
        publish: false,
      })
      setNotice("Handmatige vertaling opgeslagen (origin=manual).")
      await reload()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudTranslationsApiError
          ? err.message
          : "Opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish() {
    if (!data || data === "loading" || !selected) return
    setBusy(true)
    try {
      await publishTranslation({
        entity_type: "product_version",
        entity_id: data.version.id,
        field_name: selected.field_name,
        language_code: selected.language_code,
      })
      setNotice("Vertaling gepubliceerd (Beschikbaar).")
      await reload()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudTranslationsApiError
          ? err.message
          : "Publiceren niet mogelijk."
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleRetranslate(opts: {
    only_failed?: boolean
    only_stale?: boolean
    language?: string
  }) {
    if (!data || data === "loading") return
    if (!data.source_language_code) {
      setError("Geen bron-taal op deze versie. Laat de seller die eerst instellen.")
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const result = await retranslate({
        entity_type: "product_version",
        entity_id: data.version.id,
        source_language_code: data.source_language_code,
        source_fields: {
          title: data.version.title,
          description: data.version.description,
        },
        target_language_code: opts.language,
        only_failed: opts.only_failed,
        only_stale: opts.only_stale,
      })
      if (!result.provider_configured) {
        setNotice(
          "Opnieuw vertalen gestart, maar automatische vertaling is nog niet geactiveerd (geen neptekst)."
        )
      } else {
        setNotice("Opnieuw vertalen gestart.")
      }
      await reload()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudTranslationsApiError
          ? err.message
          : "Opnieuw vertalen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleMarkStale() {
    if (!data || data === "loading") return
    setBusy(true)
    try {
      const maxSv = data.translations.reduce(
        (m, t) => Math.max(m, Number(t.source_version ?? 1)),
        1
      )
      await markTranslationsStale({
        entity_type: "product_version",
        entity_id: data.version.id,
        new_source_version: maxSv + 1,
      })
      setNotice("Vertalingen gemarkeerd als Verouderd.")
      await reload()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudTranslationsApiError
          ? err.message
          : "Markeren als verouderd mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (data === "loading") {
    return <p className="text-xs text-wf-600">Laden…</p>
  }

  if (!data) {
    return (
      <div>
        <Notice variant="warning">{error ?? "Niet gevonden."}</Notice>
        <Link
          href="/product-cloud/translations"
          className="mt-4 inline-block text-xs font-semibold underline"
        >
          Terug naar overzicht
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/product-cloud/translations"
        className="text-xs font-semibold text-wf-700 underline"
      >
        ← Overzicht
      </Link>
      <h1 className="mt-3 text-[19px] font-bold text-wf-900">
        {data.version.title}
      </h1>
      <p className="mt-1 text-xs text-wf-600">
        Bron-taal:{" "}
        <span className="font-semibold uppercase">
          {data.source_language_code ?? "niet ingesteld"}
        </span>{" "}
        · Versie {data.version.id}
      </p>

      {!data.provider_configured ? (
        <Notice variant="info" className="mt-3">
          Automatische vertaling nog niet geactiveerd. Handmatige correcties
          blijven beschikbaar.
        </Notice>
      ) : null}

      {error ? (
        <Notice variant="warning" className="mt-3">
          {error}
        </Notice>
      ) : null}
      {notice ? (
        <Notice variant="info" className="mt-3">
          {notice}
        </Notice>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => handleRetranslate({ only_stale: true })}
        >
          Verouderde opnieuw vertalen
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => handleRetranslate({ only_failed: true })}
        >
          Mislukte opnieuw proberen
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={handleMarkStale}
        >
          Alles als verouderd markeren
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-wf-300 text-wf-600">
              <th className="py-2 pr-2 font-semibold">Veld</th>
              <th className="py-2 pr-2 font-semibold">Doel</th>
              <th className="py-2 pr-2 font-semibold">Status</th>
              <th className="py-2 pr-2 font-semibold">Origin</th>
              <th className="py-2 pr-2 font-semibold">src/ver</th>
              <th className="py-2 pr-2 font-semibold">Brontekst</th>
              <th className="py-2 pr-2 font-semibold">Vertaling</th>
              <th className="py-2 font-semibold">Updated by</th>
            </tr>
          </thead>
          <tbody>
            {data.translations.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-4 text-wf-600">
                  Nog geen vertaalrijen. Seller kan &quot;Vertalingen
                  voorbereiden&quot; gebruiken, of start opnieuw vertalen.
                </td>
              </tr>
            ) : (
              data.translations.map((row) => (
                <tr
                  key={row.id}
                  className={`cursor-pointer border-b border-wf-200 ${
                    selectedId === row.id ? "bg-wf-200" : "hover:bg-wf-100"
                  }`}
                  onClick={() => openRow(row)}
                >
                  <td className="py-2 pr-2">{row.field_name}</td>
                  <td className="py-2 pr-2 uppercase">{row.language_code}</td>
                  <td className="py-2 pr-2">
                    <Badge variant="outline">
                      {reviewStatusLabel(row.translation_status, row.origin)}{" "}
                      · {uiStatusLabel(row.translation_status)}
                    </Badge>
                  </td>
                  <td className="py-2 pr-2">{row.origin ?? "—"}</td>
                  <td className="py-2 pr-2">
                    {row.source_version ?? "—"}/{row.translation_version ?? "—"}
                  </td>
                  <td className="max-w-[160px] truncate py-2 pr-2">
                    {row.source_value || "—"}
                  </td>
                  <td className="max-w-[160px] truncate py-2 pr-2">
                    {row.value || "—"}
                  </td>
                  <td className="py-2">{row.updated_by ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="mt-6 rounded-md border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">
            Vertaling bewerken — {selected.field_name} /{" "}
            {selected.language_code.toUpperCase()}
          </h2>
          <p className="mt-1 text-xs text-wf-600">
            Origineel: {selected.source_value || data.version.title || "—"}
          </p>
          <label className="mt-3 block text-xs font-semibold text-wf-700">
            Vertaalde tekst
            <textarea
              className="mt-1 w-full rounded-md border border-wf-300 px-3 py-2 text-xs text-wf-900"
              rows={4}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={handleSaveManual}>
              Handmatig opslaan
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={handlePublish}
            >
              Publiceren
            </Button>
            {selected.translation_status === "Mislukt" ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  handleRetranslate({
                    only_failed: true,
                    language: selected.language_code,
                  })
                }
              >
                Opnieuw proberen
              </Button>
            ) : null}
            {selected.translation_status === "Verouderd" ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  handleRetranslate({
                    only_stale: true,
                    language: selected.language_code,
                  })
                }
              >
                Opnieuw vertalen
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-wf-500">
            Handmatige opslag zet origin=manual en wordt niet door automatische
            synchronisatie overschreven zonder force.
          </p>
        </div>
      ) : null}
    </div>
  )
}
