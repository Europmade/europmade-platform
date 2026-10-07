"use client"

import { useState } from "react"
import { Notice } from "@europmade/ui"
import {
  EngagementAdminApiError,
  createEngagementVersion,
  type EngagementTemplate,
} from "../../../../../lib/engagement-admin-api"

const fieldClass =
  "mt-1 w-full rounded border border-wf-400 px-2 py-2 text-xs text-wf-900"

export function VersionForm({
  templateId,
  variantId,
  initial,
  onSaved,
}: {
  templateId: string
  variantId: string
  initial?: {
    subject: string
    preheader: string
    body: string
    cta_label: string
    cta_url: string | null
    personalization_tokens: string[]
  }
  onSaved: (template: EngagementTemplate) => void
}) {
  const [subject, setSubject] = useState(initial?.subject ?? "")
  const [preheader, setPreheader] = useState(initial?.preheader ?? "")
  const [body, setBody] = useState(initial?.body ?? "")
  const [ctaLabel, setCtaLabel] = useState(initial?.cta_label ?? "")
  const [ctaUrl, setCtaUrl] = useState(initial?.cta_url ?? "")
  const [tokens, setTokens] = useState(
    initial?.personalization_tokens.join(", ") ?? ""
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  return (
    <form
      className="mt-3 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        setSaving(true)
        setError(null)
        setSaved(false)
        const personalization_tokens = tokens
          .split(/[,\s]+/)
          .map((token) => token.trim())
          .filter(Boolean)
        createEngagementVersion(templateId, variantId, {
          subject,
          preheader,
          body,
          cta_label: ctaLabel,
          cta_url: ctaUrl,
          personalization_tokens,
        })
          .then((template) => {
            setSaved(true)
            onSaved(template)
          })
          .catch((err: unknown) => {
            setError(
              err instanceof EngagementAdminApiError
                ? err.message
                : "Version aanmaken mislukt."
            )
          })
          .finally(() => setSaving(false))
      }}
    >
      <p className="text-[11px] text-wf-600">
        Een nieuwe version wordt draft en inactive. Approval en activation kies
        je daarna, niet hier.
      </p>
      <label className="text-[11px] text-wf-600">
        Onderwerp
        <input
          className={fieldClass}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
        />
      </label>
      <label className="text-[11px] text-wf-600">
        Preheader
        <input
          className={fieldClass}
          value={preheader}
          onChange={(event) => setPreheader(event.target.value)}
          required
        />
      </label>
      <label className="text-[11px] text-wf-600">
        Body
        <textarea
          className={`${fieldClass} min-h-[120px]`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
        />
      </label>
      <label className="text-[11px] text-wf-600">
        CTA-label
        <input
          className={fieldClass}
          value={ctaLabel}
          onChange={(event) => setCtaLabel(event.target.value)}
          required
        />
      </label>
      <label className="text-[11px] text-wf-600">
        CTA-url
        <input
          className={fieldClass}
          value={ctaUrl}
          onChange={(event) => setCtaUrl(event.target.value)}
        />
      </label>
      <label className="text-[11px] text-wf-600">
        Personalisatie-tokens
        <input
          className={fieldClass}
          value={tokens}
          onChange={(event) => setTokens(event.target.value)}
          placeholder="company_name, first_name"
        />
      </label>
      {error ? <Notice variant="warning">{error}</Notice> : null}
      {saved ? <p className="text-xs text-wf-700">Version aangemaakt.</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="h-9 w-fit rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
      >
        {saving ? "Opslaan…" : "Nieuwe version"}
      </button>
    </form>
  )
}
