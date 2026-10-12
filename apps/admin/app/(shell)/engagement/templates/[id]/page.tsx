"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Notice } from "@europmade/ui"
import { CmsRichTextEditor, type CmsRichTextEditorHandle } from "../../../../../components/cms/cms-rich-text-editor"
import { uploadCmsMedia } from "../../../../../lib/cms-admin-api"
import {
  COMMUNICATION_TYPES,
  EngagementAdminApiError,
  activateEngagementVersion,
  deleteEngagementTemplate,
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
  isMessageAudience,
  MESSAGE_AUDIENCES,
  editorToStored,
  headlineVersion,
  isEditableDraft,
  localeLabel,
  messageTypeLabel,
  audienceLabel,
  tokensToEditor,
  translateMessageError,
  versionHistoryLabel,
} from "../../../../../lib/engagement-message"
import { AiDraftDialog } from "../_components/ai-draft-dialog"
import { MessagePreview } from "../_components/message-preview"
import { NewsletterComposer } from "../_components/newsletter-composer"
import { parseMessageBlocks } from "../../../../../lib/newsletter-document"
import { isRichMessage } from "../../../../../lib/newsletter-document"

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
  const router = useRouter()
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
  const [previewProblems, setPreviewProblems] = useState<string[]>([])
  useEffect(() => {
    if (!body.includes("<!--em-layout:newsletter-->")) setPreviewProblems([])
  }, [body])
  const [aiOpen, setAiOpen] = useState(false)
  const [audience, setAudience] = useState<string>("consumers")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("19:00")
  const [scheduleTimezone, setScheduleTimezone] = useState("Europe/Amsterdam")
  const [rich, setRich] = useState(false)

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
    setAudience(
      next.audience && isMessageAudience(next.audience) ? next.audience : ""
    )
    const moment = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(next.scheduled_at ?? "")
    setScheduleDate(moment?.[1] ?? "")
    setScheduleTime(moment?.[2] ?? "19:00")
    setScheduleTimezone(next.schedule_timezone || "Europe/Amsterdam")
    setRich(next.layout === "newsletter" || (next.layout !== "message" && isRichMessage(version?.body ?? "")))
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
        setAudience(
          row.audience && isMessageAudience(row.audience) ? row.audience : ""
        )
        const moment = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(row.scheduled_at ?? "")
        setScheduleDate(moment?.[1] ?? "")
        setScheduleTime(moment?.[2] ?? "19:00")
        setScheduleTimezone(row.schedule_timezone || "Europe/Amsterdam")
        setRich(row.layout === "newsletter" || (row.layout !== "message" && isRichMessage(version?.body ?? "")))
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
  const allVersions = template?.variants.flatMap((item) => item.versions) ?? []
  const deleteBlocked = allVersions.some(
    (item) =>
      Boolean(item.used_at) ||
      item.activation_status === "active" ||
      item.approval_status === "approved"
  )
  const conceptDeletable =
    !deleteBlocked &&
    allVersions.every(
      (item) => !item.used_at && item.approval_status === "draft" && item.activation_status !== "active"
    )

  function selectVariant(nextId: string) {
    if (!template) return
    const next = template.variants.find((item) => item.id === nextId)
    if (!next) return
    const nextVersion = headlineVersion({ ...template, variants: [next] })
    setVariantId(next.id)
    setLocale(next.locale.toLowerCase() || "nl")
    setVersionId(nextVersion?.id ?? null)
    setSubject(tokensToEditor(nextVersion?.subject ?? ""))
    setPreheader(tokensToEditor(nextVersion?.preheader ?? ""))
    setBody(tokensToEditor(nextVersion?.body ?? ""))
    setCtaLabel(nextVersion?.cta_label ?? "")
    setCtaUrl(nextVersion?.cta_url ?? "")
    setNotice(null)
    setError(null)
  }

  function selectVersion(next: EngagementVersion) {
    setVersionId(next.id)
    setSubject(tokensToEditor(next.subject))
    setPreheader(tokensToEditor(next.preheader))
    setBody(tokensToEditor(next.body))
    setCtaLabel(next.cta_label)
    setCtaUrl(next.cta_url ?? "")
    setAudience(
      template?.audience && isMessageAudience(template.audience)
        ? template.audience
        : ""
    )
    setRich(template?.layout === "newsletter" || (template?.layout !== "message" && isRichMessage(next.body)))
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
    if (rich) {
      const blocks = parseMessageBlocks(input.body)
      const hasText = blocks.some((block) => {
        if (block.kind === "divider") return false
        if (block.kind === "product" || block.kind === "product_group") return true
        if ("text" in block && block.text.trim()) return true
        if ("headline" in block && block.headline.trim()) return true
        if ("label" in block && block.label.trim()) return true
        return false
      })
      if (!hasText) return "Voeg inhoud toe aan de uitgebreide boodschap."
    } else if (!input.body || input.body === "<p></p>") {
      return "Schrijf de berichttekst."
    }
    if ((type === "campaign" || type === "newsletter") && !isMessageAudience(audience)) {
      return "Kies een doelgroep voor deze campagne."
    }
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
    const nextAudience =
      nextType === "newsletter" || nextType === "campaign"
        ? isMessageAudience(audience)
          ? audience
          : null
        : null
    const nextLayout = rich ? "newsletter" : "message"
    if (
      nextName !== template.name ||
      nextType !== template.communication_type ||
      ((nextType === "newsletter" || nextType === "campaign") && template.audience !== nextAudience) ||
      template.layout !== nextLayout
    ) {
      current = await updateEngagementTemplate(template.id, {
        name: nextName,
        communication_type: nextType,
        audience: nextAudience,
        layout: nextLayout,
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
      <p className="mt-2 text-xs text-wf-700">
        Type: {messageTypeLabel(type)} · Doelgroep: {audienceLabel(type, type === "newsletter" || type === "campaign" ? audience : null)} · Taal: volgt de ontvanger · Status: {status}
      </p>
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
        {type === "newsletter" || type === "campaign" ? (
          <label className="text-[11px] text-wf-600">
            Doelgroep
            <select
              className={fieldClass}
              value={isMessageAudience(audience) ? audience : ""}
              disabled={busy}
              onChange={(event) => setAudience(event.target.value)}
            >
              <option value="">Kies een doelgroep</option>
              {MESSAGE_AUDIENCES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded border border-wf-300 bg-wf-50 px-3 py-2 text-[11px] text-wf-800">
            <div className="font-semibold text-wf-900">Doelgroep</div>
            <p className="mt-1">{audienceLabel(type, null)}</p>
          </div>
        )}
        <div className="rounded border border-wf-300 bg-wf-50 px-3 py-2 text-[11px] text-wf-800">
          <div className="font-semibold text-wf-900">Taal</div>
          {(template?.variants.length ?? 0) > 1 ? (
            <label className="mt-2 block text-[11px] text-wf-600">
              Taalvariant
              <select
                className={fieldClass}
                value={variantId ?? ""}
                onChange={(event) => selectVariant(event.target.value)}
              >
                {template?.variants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {localeLabel(item.locale)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <p className="mt-1">
            Volgt de ontvanger. Consumenten gebruiken de taal van hun inschrijving, verkopers de taal van hun account en affiliate partners de taal van hun affiliate-account. Nederlands is hier de redactietaal. Een latere vertaling kiest de taal van de ontvanger. Er wordt niets verzonden.
          </p>
        </div>
      </div>
      {type === "newsletter" || type === "campaign" ? (
        <div className="mt-3 rounded border border-wf-300 bg-wf-50 px-3 py-3">
          <div className="text-[11px] font-semibold text-wf-900">Gepland startmoment</div>
          <p className="mt-1 text-[11px] text-wf-700">
            Zonder lifecycle-event. Het moment wordt opgeslagen en er wordt niets verzonden.
          </p>
          {status === "Goedgekeurd" || status === "Actief" || status === "Klaar voor verzending" || status === "Gepland" ? (
            <div className="mt-2 grid grid-cols-1 gap-2 tablet:grid-cols-3">
              <label className="text-[11px] text-wf-600">
                Startdatum
                <input className={fieldClass} type="date" value={scheduleDate} disabled={busy} onChange={(event) => setScheduleDate(event.target.value)} />
              </label>
              <label className="text-[11px] text-wf-600">
                Starttijd
                <input className={fieldClass} type="time" value={scheduleTime} disabled={busy} onChange={(event) => setScheduleTime(event.target.value)} />
              </label>
              <label className="text-[11px] text-wf-600">
                Tijdzone
                <select className={fieldClass} value={scheduleTimezone} disabled={busy} onChange={(event) => setScheduleTimezone(event.target.value)}>
                  <option value="Europe/Amsterdam">Amsterdam</option>
                  <option value="Europe/Brussels">Brussel</option>
                  <option value="Europe/Berlin">Berlijn</option>
                  <option value="Europe/Paris">Parijs</option>
                  <option value="Europe/London">Londen</option>
                  <option value="UTC">UTC</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-2 tablet:col-span-3">
                <button
                  type="button"
                  className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (!template) return
                      if (!isMessageAudience(audience)) {
                        throw new Error("Kies een doelgroep.")
                      }
                      if (!scheduleDate || !scheduleTime) throw new Error("Kies een startdatum en starttijd.")
                      const saved = await updateEngagementTemplate(template.id, {
                        name: name.trim(),
                        communication_type: type,
                        audience,
                        schedule: {
                          scheduled_at: `${scheduleDate}T${scheduleTime}`,
                          schedule_timezone: scheduleTimezone,
                          audience,
                        },
                      })
                      applyTemplate(saved, { variantId, versionId: version?.id })
                      setNotice("Het startmoment is opgeslagen. Er is niets verzonden.")
                    })
                  }
                >
                  Plannen
                </button>
                {template?.schedule_status === "scheduled" ? (
                  <button
                    type="button"
                    className="h-8 rounded border border-wf-400 bg-white px-3 text-[11px] font-medium text-wf-900 disabled:opacity-50"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        if (!template) return
                        const saved = await updateEngagementTemplate(template.id, {
                          name: name.trim(),
                          communication_type: type,
                          audience: audience || null,
                          schedule: null,
                        })
                        applyTemplate(saved, { variantId, versionId: version?.id })
                        setNotice("De planning is verwijderd. Er is niets verzonden.")
                      })
                    }
                  >
                    Planning verwijderen
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-wf-700">
              Keur het bericht eerst goed. Daarna kun je het plannen. Verzonden is nog niet beschikbaar.
            </p>
          )}
        </div>
      ) : null}
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
        {conceptDeletable ? (
          <button
            type="button"
            className="h-8 rounded border border-wf-400 bg-white px-3 text-[11px] font-medium text-wf-900 disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Weet je zeker dat je dit concept wilt verwijderen?")) return
              run(async () => {
                await deleteEngagementTemplate(template.id)
                router.push("/engagement/templates")
              })
            }}
          >
            Verwijderen
          </button>
        ) : deleteBlocked ? (
          <button
            type="button"
            className="h-8 rounded border border-wf-300 bg-wf-50 px-3 text-[11px] font-medium text-wf-500"
            disabled
            title="Dit bericht kan niet worden verwijderd omdat het al wordt gebruikt."
          >
            Verwijderen
          </button>
        ) : null}
        {version?.approval_status === "pending_review" && !version.used_at ? (
          <button
            type="button"
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
            disabled={busy || previewProblems.length > 0}
            title={previewProblems[0] || undefined}
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
        {version?.approval_status === "approved" &&
        version.activation_status !== "active" &&
        !version.used_at ? (
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
      {!editable && (status === "Actief" || version?.used_at || deleteBlocked) ? (
        <p className="mt-3 rounded border border-wf-300 bg-wf-50 px-3 py-2 text-xs text-wf-800">
          Deze versie is actief of al gebruikt en kan niet worden gewijzigd. Dit bericht kan niet worden verwijderd omdat het al wordt gebruikt.
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
            <div className="text-[11px] text-wf-600">Opmaak</div>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                className={`h-8 rounded px-3 text-[11px] font-medium ${rich ? "border border-wf-300 bg-white" : "bg-wf-900 text-white"}`}
                disabled={!editable || busy}
                onClick={() => {
                  if (!rich) return
                  const text = parseMessageBlocks(body)
                    .flatMap((block) => {
                      if (block.kind === "hero") return [block.headline, block.text]
                      if ("text" in block) return [block.text]
                      if (block.kind === "product") return [block.name, block.text]
                      if (block.kind === "heading") return [block.text]
                      return []
                    })
                    .filter(Boolean)
                    .map((paragraph) => `<p>${paragraph}</p>`)
                    .join("")
                  setBody(text || "<p></p>")
                  setRich(false)
                }}
              >
                Bericht
              </button>
              <button
                type="button"
                className={`h-8 rounded px-3 text-[11px] font-medium ${rich ? "bg-wf-900 text-white" : "border border-wf-300 bg-white"}`}
                disabled={!editable || busy}
                onClick={() => {
                  if (rich) return
                  if (!isRichMessage(body)) {
                    const plain = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
                    setBody(
                      plain
                        ? `<!--em-layout:rich--><!--em-block:text--><p>${plain}</p>`
                        : `<!--em-layout:rich--><!--em-block:hero--><h2></h2>`
                    )
                  }
                  setRich(true)
                }}
              >
                Nieuwsbrief
              </button>
            </div>
            <div className="mt-1">
              {rich ? (
                <NewsletterComposer
                  value={body}
                  disabled={!editable || busy}
                  onChange={setBody}
                  onUploadImage={async (file) => {
                    const uploaded = await uploadCmsMedia(file, "brand_story_photo")
                    return uploaded.asset.url
                  }}
                />
              ) : (
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
              )}
            </div>
          </div>
          {rich ? null : (
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
          )}
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
              newsletter={type === "newsletter" || body.includes("<!--em-layout:newsletter-->")}
              locale={locale}
              audience={
                audience === "affiliates" || audience === "sellers" || audience === "consumers"
                  ? audience
                  : type === "acquisition"
                    ? "prospects"
                    : "consumers"
              }
              onReview={({ problems }) => setPreviewProblems(problems)}
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
