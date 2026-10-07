"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Notice } from "@europmade/ui"
import { CmsRichTextEditor, type CmsRichTextEditorHandle } from "../../../../../components/cms/cms-rich-text-editor"
import { uploadCmsMedia } from "../../../../../lib/cms-admin-api"
import {
  COMMUNICATION_TYPES,
  EngagementAdminApiError,
  activateEngagementVersion,
  approveEngagementVersion,
  createEngagementVariant,
  createEngagementVersion,
  formatEngagementDate,
  generateEngagementDraft,
  getEngagementTemplate,
  markNewsletterReady,
  saveEngagementVersion,
  submitEngagementVersionForReview,
  updateEngagementTemplate,
  updateEngagementVariant,
  type EngagementTemplate,
  type EngagementVariant,
  type EngagementVersion,
} from "../../../../../lib/engagement-admin-api"
import {
  MESSAGE_LOCALES,
  MESSAGE_TOKENS,
  displayMessageStatus,
  editorToStored,
  headlineVersion,
  isEditableDraft,
  localeLabel,
  messageTypeLabel,
  tokensToEditor,
  translateMessageError,
  versionHistoryLabel,
} from "../../../../../lib/engagement-message"
import { AiDraftDialog } from "../_components/ai-draft-dialog"
import { MessagePreview } from "../_components/message-preview"

const fieldClass =
  "mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm text-wf-900"

function messageOf(err: unknown, fallback: string): string {
  const raw = err instanceof EngagementAdminApiError ? err.message : fallback
  return translateMessageError(raw)
}

function findVariant(template: EngagementTemplate, variantId: string | null): EngagementVariant | null {
  if (variantId) {
    return template.variants.find((variant) => variant.id === variantId) ?? null
  }
  return (
    template.variants.find((variant) => variant.locale.toLowerCase() === "nl") ??
    template.variants[0] ??
    null
  )
}

function findVersion(
  variant: EngagementVariant | null,
  versionId: string | null
): EngagementVersion | null {
  if (!variant) return null
  if (versionId) {
    return variant.versions.find((version) => version.id === versionId) ?? null
  }
  return headlineVersion({ variants: [variant] } as EngagementTemplate)
}

export default function EngagementMessagePage() {
  const { id } = useParams<{ id: string }>()
  const editorRef = useRef<CmsRichTextEditorHandle>(null)
  const [template, setTemplate] = useState<EngagementTemplate | null>(null)
  const [variantId, setVariantId] = useState<string | null>(null)
  const [versionId, setVersionId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [type, setType] = useState<string>(COMMUNICATION_TYPES[0])
  const [locale, setLocale] = useState("nl")
  const [subject, setSubject] = useState("")
  const [preheader, setPreheader] = useState("")
  const [body, setBody] = useState("")
  const [ctaLabel, setCtaLabel] = useState("")
  const [ctaUrl, setCtaUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [aiOpen, setAiOpen] = useState(false)

  function applyTemplate(
    next: EngagementTemplate,
    prefer?: { variantId?: string | null; versionId?: string | null }
  ) {
    setTemplate(next)
    setName(next.name)
    setType(next.communication_type)
    const variant = findVariant(next, prefer?.variantId ?? variantId)
    setVariantId(variant?.id ?? null)
    setLocale(variant?.locale.toLowerCase() || "nl")
    const version = findVersion(variant, prefer?.versionId ?? versionId)
    setVersionId(version?.id ?? null)
    setSubject(tokensToEditor(version?.subject ?? ""))
    setPreheader(tokensToEditor(version?.preheader ?? ""))
    setBody(tokensToEditor(version?.body ?? ""))
    setCtaLabel(version?.cta_label ?? "")
    setCtaUrl(version?.cta_url ?? "")
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const requested = Number(new URLSearchParams(window.location.search).get("versie"))
    getEngagementTemplate(id)
      .then((row) => {
        if (cancelled) return
        const variant =
          row.variants.find((item) => item.locale.toLowerCase() === "nl") ??
          row.variants[0] ??
          null
        const version =
          (Number.isFinite(requested)
            ? variant?.versions.find((item) => item.version_number === requested)
            : null) ??
          (variant ? headlineVersion({ ...row, variants: [variant] }) : null)
        setTemplate(row)
        setName(row.name)
        setType(row.communication_type)
        setVariantId(variant?.id ?? null)
        setLocale(variant?.locale.toLowerCase() || "nl")
        setVersionId(version?.id ?? null)
        setSubject(tokensToEditor(version?.subject ?? ""))
        setPreheader(tokensToEditor(version?.preheader ?? ""))
        setBody(tokensToEditor(version?.body ?? ""))
        setCtaLabel(version?.cta_label ?? "")
        setCtaUrl(version?.cta_url ?? "")
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(messageOf(err, "Bericht laden mislukt."))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const variant = template ? findVariant(template, variantId) : null
  const version = variant ? findVersion(variant, versionId) : null
  const editable = isEditableDraft(version)
  const status = version
    ? displayMessageStatus(template ?? { communication_type: type }, version)
    : "Concept"
  const versions = [...(variant?.versions ?? [])].sort(
    (a, b) => b.version_number - a.version_number
  )

  function selectVersion(next: EngagementVersion) {
    setVersionId(next.id)
    setSubject(tokensToEditor(next.subject))
    setPreheader(tokensToEditor(next.preheader))
    setBody(tokensToEditor(next.body))
    setCtaLabel(next.cta_label)
    setCtaUrl(next.cta_url ?? "")
    setNotice(null)
    setError(null)
    const url = new URL(window.location.href)
    url.searchParams.set("versie", String(next.version_number))
    window.history.replaceState(null, "", url.toString())
  }

  function contentInput() {
    const storedBody = editorToStored(body)
    const storedSubject = editorToStored(subject)
    const storedPreheader = editorToStored(preheader)
    const tokens = [
      ...new Set([
        ...storedBody.tokens,
        ...storedSubject.tokens,
        ...storedPreheader.tokens,
      ]),
    ]
    return {
      subject: storedSubject.text.trim(),
      preheader: storedPreheader.text.trim(),
      body: storedBody.text.trim(),
      cta_label: ctaLabel.trim(),
      cta_url: ctaUrl.trim(),
      personalization_tokens: tokens,
    }
  }

  function validateContent(): string | null {
    const input = contentInput()
    if (!input.subject) return "Vul een onderwerp in."
    if (!input.preheader) return "Vul een preheader in."
    if (!input.body || input.body === "<p></p>") return "Schrijf de berichttekst."
    if (!input.cta_label) return "Vul de knoptekst in."
    return null
  }

  async function persistIdentity(next?: { name?: string; type?: string; locale?: string }) {
    if (!template) return template
    const nextName = (next?.name ?? name).trim()
    const nextType = next?.type ?? type
    const nextLocale = (next?.locale ?? locale).trim().toLowerCase()
    if (!nextName) throw new Error("Geef het bericht een naam.")
    let current = template
    const audience = nextType === "newsletter" ? "consumers" : null
    if (
      nextName !== template.name ||
      nextType !== template.communication_type ||
      (nextType === "newsletter" && template.audience !== "consumers")
    ) {
      current = await updateEngagementTemplate(template.id, {
        name: nextName,
        communication_type: nextType,
        audience,
      })
    }
    const currentVariant = findVariant(current, variantId)
    if (currentVariant && nextLocale && nextLocale !== currentVariant.locale.toLowerCase()) {
      const taken = current.variants.some(
        (item) =>
          item.id !== currentVariant.id && item.locale.toLowerCase() === nextLocale
      )
      if (!taken) {
        current = await updateEngagementVariant(current.id, currentVariant.id, {
          name: nextLocale,
          locale: nextLocale,
        })
      }
    }
    return current
  }

  async function saveDraft(): Promise<{
    template: EngagementTemplate
    versionId: string
  }> {
    if (!id) throw new Error("Bericht laden mislukt.")
    const problem = validateContent()
    if (problem) throw new Error(problem)
    const identity = await persistIdentity()
    if (!identity) throw new Error("Bericht laden mislukt.")
    let currentVariant = findVariant(identity, variantId)
    if (!currentVariant) {
      const created = await createEngagementVariant(identity.id, {
        name: locale || "nl",
        locale: locale || "nl",
      })
      currentVariant =
        created.variants.find((item) => item.locale.toLowerCase() === (locale || "nl")) ??
        null
      if (!currentVariant) throw new Error("De taal kon niet worden bewaard.")
    }
    const input = contentInput()
    const currentVersion = findVersion(currentVariant, versionId)
    const saved =
      isEditableDraft(currentVersion) && currentVersion
        ? await saveEngagementVersion(identity.id, currentVersion.id, input)
        : await createEngagementVersion(identity.id, currentVariant.id, input)
    const savedVariant =
      saved.variants.find((item) => item.id === currentVariant?.id) ??
      saved.variants[0]
    const savedVersion = currentVersion
      ? savedVariant?.versions.find((item) => item.id === currentVersion.id) ??
        savedVariant?.versions[0]
      : [...(savedVariant?.versions ?? [])].sort(
          (a, b) => b.version_number - a.version_number
        )[0]
    if (!savedVersion) throw new Error("Concept opslaan mislukt.")
    applyTemplate(saved, {
      variantId: savedVariant?.id,
      versionId: savedVersion.id,
    })
    return { template: saved, versionId: savedVersion.id }
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (err: unknown) {
      setError(messageOf(err, "Opslaan mislukt."))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-xs text-wf-500">Laden…</p>
  }
  if (!template) {
    return error ? <Notice variant="warning">{error}</Notice> : <p className="text-xs">Bericht niet gevonden.</p>
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/engagement/templates" className="text-[11px] text-wf-600 hover:text-wf-900">
        ← Berichten
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label className="block text-[11px] text-wf-600">
            Berichtnaam
            <input
              className={fieldClass}
              value={name}
              disabled={!editable || busy}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        </div>
        <span className="mb-1 rounded bg-wf-900 px-2 py-1 text-[11px] font-semibold text-white">
          {status}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-2">
        <label className="text-[11px] text-wf-600">
          Type
          <select
            className={fieldClass}
            value={type}
            disabled={!editable || busy}
            onChange={(event) => setType(event.target.value)}
          >
            {COMMUNICATION_TYPES.map((item) => (
              <option key={item} value={item}>
                {messageTypeLabel(item)}
              </option>
            ))}
          </select>
        </label>
        {type === "newsletter" ? (
          <label className="text-[11px] text-wf-600">
            Doelgroep
            <select className={fieldClass} value="consumers" disabled>
              <option value="consumers">Consumenten</option>
            </select>
          </label>
        ) : null}
        <label className="text-[11px] text-wf-600">
          Taal
          <select
            className={fieldClass}
            value={locale}
            disabled={!editable || busy}
            onChange={(event) => setLocale(event.target.value)}
          >
            {MESSAGE_LOCALES.some((item) => item.value === locale) ? null : (
              <option value={locale}>{localeLabel(locale)}</option>
            )}
            {MESSAGE_LOCALES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {editable ? (
          <button
            type="button"
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await saveDraft()
                setNotice("Concept opgeslagen.")
              })
            }
          >
            Opslaan
          </button>
        ) : null}
        <button
          type="button"
          className="h-8 rounded border border-wf-400 bg-white px-3 text-[11px] font-medium text-wf-900 disabled:opacity-50"
          disabled={busy}
          onClick={() => setAiOpen(true)}
        >
          Maken met AI
        </button>
        {editable && status === "Concept" ? (
          <button
            type="button"
            className="h-8 rounded border border-wf-400 bg-white px-3 text-[11px] font-medium text-wf-900 disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const saved = await saveDraft()
                const reviewed = await submitEngagementVersionForReview(
                  saved.template.id,
                  saved.versionId
                )
                applyTemplate(reviewed, { versionId: saved.versionId })
                setNotice("Het bericht staat ter beoordeling.")
              })
            }
          >
            Ter beoordeling
          </button>
        ) : null}
        {status === "In beoordeling" && version && !version.used_at ? (
          <button
            type="button"
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const approved = await approveEngagementVersion(template.id, version.id)
                applyTemplate(approved, { variantId, versionId: version.id })
                setNotice("Bericht goedgekeurd.")
              })
            }
          >
            Goedkeuren
          </button>
        ) : null}
        {type !== "newsletter" && status === "Goedgekeurd" && version && !version.used_at ? (
          <button
            type="button"
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const active = await activateEngagementVersion(template.id, version.id)
                applyTemplate(active, { variantId, versionId: version.id })
                setNotice("Bericht geactiveerd.")
              })
            }
          >
            Activeren
          </button>
        ) : null}
        {type === "newsletter" && status === "Goedgekeurd" && version ? (
          <button
            type="button"
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const ready = await markNewsletterReady(template.id, version.id)
                applyTemplate(ready, { variantId, versionId: version.id })
                setNotice("De nieuwsbrief staat klaar voor verzending. Er is niets verzonden.")
              })
            }
          >
            Klaar voor verzending
          </button>
        ) : null}
        {!editable && version ? (
          <button
            type="button"
            className="h-8 rounded border border-wf-400 bg-white px-3 text-[11px] font-medium text-wf-900 disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              run(async () => {
                if (!variant) throw new Error("Dit bericht heeft nog geen taal.")
                const created = await createEngagementVersion(template.id, variant.id, {
                  subject: version.subject,
                  preheader: version.preheader,
                  body: version.body,
                  cta_label: version.cta_label,
                  cta_url: version.cta_url ?? "",
                  personalization_tokens: version.personalization_tokens,
                })
                const createdVariant =
                  created.variants.find((item) => item.id === variant.id) ?? created.variants[0]
                const createdVersion = [...(createdVariant?.versions ?? [])].sort(
                  (a, b) => b.version_number - a.version_number
                )[0]
                applyTemplate(created, {
                  variantId: createdVariant?.id,
                  versionId: createdVersion?.id,
                })
                setNotice("Nieuwe conceptversie gemaakt.")
              })
            }
          >
            Nieuwe versie maken
          </button>
        ) : null}
      </div>
      {error ? (
        <div className="mt-3">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}
      {notice ? <p className="mt-3 text-xs text-wf-700">{notice}</p> : null}
      {!editable && (status === "Actief" || version?.used_at) ? (
        <p className="mt-3 rounded border border-wf-300 bg-wf-50 px-3 py-2 text-xs text-wf-800">
          Deze versie is actief of al gebruikt en kan niet worden gewijzigd.
        </p>
      ) : null}
      {!editable && status !== "Actief" && !version?.used_at ? (
        <p className="mt-3 rounded border border-wf-300 bg-wf-50 px-3 py-2 text-xs text-wf-800">
          Deze versie ligt vast. Maak een nieuwe versie om de tekst te wijzigen.
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-1 gap-4 desktop:grid-cols-2">
        <section className="min-w-0">
          <h2 className="text-sm font-bold text-wf-900">Inhoud</h2>
          <label className="mt-3 block text-[11px] text-wf-600">
            Onderwerp
            <input
              className={fieldClass}
              value={subject}
              disabled={!editable || busy}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>
          <label className="mt-3 block text-[11px] text-wf-600">
            Preheader
            <input
              className={fieldClass}
              value={preheader}
              disabled={!editable || busy}
              onChange={(event) => setPreheader(event.target.value)}
            />
          </label>
          <div className="mt-3">
            <div className="text-[11px] text-wf-600">Bericht</div>
            <div className="mt-1">
              <CmsRichTextEditor
                ref={editorRef}
                value={body}
                onChange={setBody}
                disabled={!editable || busy}
                minHeightClass="min-h-[280px]"
                placeholder="Schrijf hier het bericht…"
                onUploadImage={async (file) => {
                  const uploaded = await uploadCmsMedia(file, "brand_story_photo")
                  return uploaded.asset.url
                }}
              />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[11px] text-wf-600">Personalisatie</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {MESSAGE_TOKENS.map((token) => (
                <button
                  key={token.key}
                  type="button"
                  disabled={!editable || busy}
                  className="h-7 rounded border border-wf-300 bg-white px-2 text-[11px] font-medium text-wf-900 disabled:opacity-40"
                  onClick={() => editorRef.current?.insertText(`[${token.label}]`)}
                >
                  {token.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-2">
            <label className="text-[11px] text-wf-600">
              Knoptekst
              <input
                className={fieldClass}
                value={ctaLabel}
                disabled={!editable || busy}
                onChange={(event) => setCtaLabel(event.target.value)}
              />
            </label>
            <label className="text-[11px] text-wf-600">
              Knoplink
              <input
                className={fieldClass}
                value={ctaUrl}
                disabled={!editable || busy}
                onChange={(event) => setCtaUrl(event.target.value)}
                placeholder="https://"
              />
            </label>
          </div>
        </section>
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-wf-900">Voorbeeld</h2>
            <div className="flex gap-1">
              <button
                type="button"
                className={`h-7 rounded px-2 text-[11px] font-medium ${
                  previewMode === "desktop"
                    ? "bg-wf-900 text-white"
                    : "border border-wf-300 bg-white text-wf-800"
                }`}
                onClick={() => setPreviewMode("desktop")}
              >
                Desktop
              </button>
              <button
                type="button"
                className={`h-7 rounded px-2 text-[11px] font-medium ${
                  previewMode === "mobile"
                    ? "bg-wf-900 text-white"
                    : "border border-wf-300 bg-white text-wf-800"
                }`}
                onClick={() => setPreviewMode("mobile")}
              >
                Mobiel
              </button>
            </div>
          </div>
          <div className="mt-3">
            <MessagePreview
              subject={subject}
              preheader={preheader}
              body={body}
              ctaLabel={ctaLabel}
              ctaUrl={ctaUrl}
              mode={previewMode}
              newsletter={type === "newsletter"}
            />
          </div>
        </section>
      </div>
      <section className="mt-6">
        <h2 className="text-sm font-bold text-wf-900">Versiegeschiedenis</h2>
        {versions.length === 0 ? (
          <p className="mt-2 text-xs text-wf-500">Nog geen versies.</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-lg border border-wf-300 bg-white">
            {versions.map((item) => {
              const selected = item.id === version?.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full items-center justify-between gap-3 border-b border-wf-200 px-3 py-2 text-left last:border-b-0 ${
                    selected ? "bg-wf-50" : "hover:bg-wf-50"
                  }`}
                  onClick={() => selectVersion(item)}
                >
                  <span className="text-sm text-wf-900">
                    <span className="font-semibold">Versie {item.version_number}</span>
                    <span className="text-wf-600"> · {versionHistoryLabel(item)}</span>
                  </span>
                  <span className="text-[11px] text-wf-500">
                    {formatEngagementDate(item.updated_at ?? item.created_at)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>
      {aiOpen ? (
        <AiDraftDialog
          busy={busy}
          defaultKind={type === "newsletter" ? "newsletter" : "email"}
          onClose={() => setAiOpen(false)}
          onCreate={(input) =>
            run(async () => {
              const created = await generateEngagementDraft(template.id, input)
              const createdVariant =
                created.variants.find((item) => item.id === variantId) ??
                created.variants.find((item) => item.locale.toLowerCase() === "nl") ??
                created.variants[0]
              const createdVersion = [...(createdVariant?.versions ?? [])].sort(
                (a, b) => b.version_number - a.version_number
              )[0]
              applyTemplate(created, {
                variantId: createdVariant?.id,
                versionId: createdVersion?.id,
              })
              setAiOpen(false)
              setNotice("Concept gemaakt. Dit is nog niet goedgekeurd en er is niets verzonden.")
            })
          }
        />
      ) : null}
    </div>
  )
}
