"use client"

import { useState } from "react"
import { Button } from "@europmade/ui"
import {
  postCmsTranslate,
  type LocalizedCms,
} from "../../lib/cms-admin-api"
import {
  CMS_LOCALE_LABEL,
  localeOrigin,
  setLocaleOrigin,
  type CmsI18nMeta,
  type CmsLocale,
} from "../../lib/cms-i18n"
import { useCmsLocale } from "./cms-locale-toolbar"
import { CmsRichTextEditor } from "./cms-rich-text-editor"

/**
 * Localized rich-text field (visual editor per language).
 */
export function CmsLocalizedRichTextField({
  label,
  field,
  value,
  onChange,
  meta,
  onMetaChange,
}: {
  label: string
  field: string
  value: LocalizedCms
  onChange: (next: LocalizedCms) => void
  meta: CmsI18nMeta
  onMetaChange: (next: CmsI18nMeta) => void
}) {
  const { visibleLocales, translateConfigured, translateMessage } = useCmsLocale()
  const [busy, setBusy] = useState<CmsLocale | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function autoTranslate(target: CmsLocale) {
    const source = value.nl.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    if (!source) {
      setError("Vul eerst de Nederlandse brontekst in.")
      return
    }
    const existing = value[target].replace(/<[^>]+>/g, "").trim()
    if (existing) {
      const ok = window.confirm(
        "Er staat al tekst in deze taal. Automatisch vertalen vervangt de huidige tekst.\n\nOK = overschrijven. Annuleren = behouden."
      )
      if (!ok) return
    }
    setBusy(target)
    setError(null)
    try {
      const result = await postCmsTranslate({
        text: value.nl,
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
      <p className="text-[11px] text-wf-500">
        Visuele editor — koppen, vet/cursief, lijsten en links. HTML wordt veilig
        opgeslagen.
      </p>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      <div className="grid gap-4">
        {visibleLocales.map((loc) => {
          const origin = localeOrigin(meta, field, loc, value[loc])
          return (
            <div key={loc} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold uppercase text-wf-800">
                  {CMS_LOCALE_LABEL[loc]}
                </span>
                <span className="rounded-full border border-wf-200 bg-wf-50 px-2 py-0.5 text-[10px] font-semibold text-wf-700">
                  {origin}
                </span>
              </div>
              <CmsRichTextEditor
                value={value[loc]}
                onChange={(html) => {
                  onChange({ ...value, [loc]: html })
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
              {loc !== "nl" ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy === loc}
                  onClick={() => void autoTranslate(loc)}
                >
                  {busy === loc ? "Vertalen…" : "Automatisch vertalen"}
                </Button>
              ) : null}
              {loc !== "nl" && !translateConfigured ? (
                <p className="text-[11px] text-wf-500">
                  DeepL is nog niet geconfigureerd. Handmatig vertalen kan wel.
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
