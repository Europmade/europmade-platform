"use client"

import { useState } from "react"
import { Button, Input } from "@europmade/ui"
import {
  postCmsTranslate,
  type LocalizedCms,
} from "../../lib/cms-admin-api"
import {
  CMS_LOCALE_LABEL,
  localeOrigin,
  originLabel,
  setLocaleOrigin,
  type CmsI18nMeta,
  type CmsLocale,
  type I18nOrigin,
} from "../../lib/cms-i18n"
import { useCmsLocale } from "./cms-locale-toolbar"

function OriginBadge({ origin, locale }: { origin: I18nOrigin; locale: CmsLocale }) {
  const tone =
    origin === "empty"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : origin === "manual"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : origin === "source"
          ? "border-wf-200 bg-wf-50 text-wf-700"
          : "border-sky-200 bg-sky-50 text-sky-800"
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {locale.toUpperCase()} · {originLabel(origin, locale)}
    </span>
  )
}

export function CmsLocalizedField({
  label,
  field,
  value,
  onChange,
  meta,
  onMetaChange,
  multiline = false,
  rows = 4,
}: {
  label: string
  field: string
  value: LocalizedCms
  onChange: (next: LocalizedCms) => void
  meta: CmsI18nMeta
  onMetaChange: (next: CmsI18nMeta) => void
  multiline?: boolean
  rows?: number
}) {
  const { visibleLocales, translateConfigured, translateMessage } = useCmsLocale()
  const [busy, setBusy] = useState<CmsLocale | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function autoTranslate(target: CmsLocale) {
    const source = value.nl.trim()
    if (!source) {
      setError("Vul eerst de Nederlandse brontekst in.")
      return
    }
    const origin = localeOrigin(meta, field, target, value[target])
    const existing = value[target].trim()
    if (existing) {
      const ok = window.confirm(
        origin === "manual"
          ? "Deze vertaling is handmatig aangepast. Automatisch vertalen vervangt de huidige tekst.\n\nOK = overschrijven. Annuleren = behouden."
          : "Er staat al tekst in deze taal. Automatisch vertalen vervangt de huidige tekst.\n\nOK = overschrijven. Annuleren = behouden."
      )
      if (!ok) return
    }
    setBusy(target)
    setError(null)
    try {
      const result = await postCmsTranslate({
        text: source,
        source_language: "nl",
        target_language: target,
      })
      onChange({ ...value, [target]: result.text })
      onMetaChange(setLocaleOrigin(meta, field, target, "machine"))
    } catch (e) {
      setError(e instanceof Error ? e.message : translateMessage)
    } finally {
      setBusy(null)
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-wf-800">{label}</legend>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      <div className={visibleLocales.length > 1 ? "grid gap-3 desktop:grid-cols-2" : "grid gap-3"}>
        {visibleLocales.map((loc) => {
          const origin = localeOrigin(meta, field, loc, value[loc])
          return (
            <label key={loc} className="block text-xs text-wf-600">
              <span className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold uppercase text-wf-800">
                  {CMS_LOCALE_LABEL[loc]}
                </span>
                <OriginBadge origin={origin} locale={loc} />
              </span>
              {multiline ? (
                <textarea
                  className="mt-1 w-full rounded-lg border border-wf-300 p-2 text-sm text-wf-900"
                  rows={rows}
                  value={value[loc]}
                  onChange={(e) => {
                    const next = { ...value, [loc]: e.target.value }
                    onChange(next)
                    onMetaChange(
                      setLocaleOrigin(
                        meta,
                        field,
                        loc,
                        loc === "nl" ? "source" : "manual"
                      )
                    )
                  }}
                />
              ) : (
                <Input
                  className="mt-1"
                  value={value[loc]}
                  onChange={(e) => {
                    onChange({ ...value, [loc]: e.target.value })
                    onMetaChange(
                      setLocaleOrigin(
                        meta,
                        field,
                        loc,
                        loc === "nl" ? "source" : "manual"
                      )
                    )
                  }}
                />
              )}
              {loc !== "nl" ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-2"
                  disabled={busy === loc}
                  onClick={() => autoTranslate(loc)}
                >
                  {busy === loc ? "Vertalen…" : "Automatisch vertalen"}
                </Button>
              ) : null}
              {loc !== "nl" && !translateConfigured ? (
                <p className="mt-1 text-[11px] text-wf-500">
                  DeepL is nog niet geconfigureerd. Handmatig vertalen kan wel.
                </p>
              ) : null}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function CmsLocaleStatusRow({
  fields,
  meta,
}: {
  fields: Array<{ key: string; label: string; value: LocalizedCms }>
  meta: CmsI18nMeta
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["nl", "en", "de", "fr"] as const).map((loc) => {
        const origins = fields.map((f) =>
          localeOrigin(meta, f.key, loc, f.value[loc])
        )
        const worst = origins.includes("empty")
          ? "empty"
          : origins.includes("manual")
            ? "manual"
            : origins.includes("machine")
              ? "machine"
              : "source"
        return <OriginBadge key={loc} origin={worst} locale={loc} />
      })}
    </div>
  )
}
