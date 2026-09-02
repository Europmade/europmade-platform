"use client"

import { useRef, useState } from "react"
import { Button, Input } from "@europmade/ui"
import {
  uploadComplianceEvidence,
  deleteMadeInEuropeEvidence,
  uploadProductMediaFile,
  ProductCloudApiError,
  type MadeInEuropeEvidenceItem,
} from "../_lib/product-cloud-api"
import { t } from "../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { evidenceStatusLabelNl } from "@europmade/utils"
import { resolveSellerMediaUrl } from "../_lib/media-url"

export type EvidenceKind = "made_in_europe" | "ce_marking" | "data_usage"

function kindLabel(kind: EvidenceKind, locale: StorefrontLocale): string {
  if (kind === "ce_marking") return t("evCeProof", locale)
  if (kind === "data_usage") return t("evDataUsageInfo", locale)
  return "Made in Europe"
}

function statusLabel(status: string | null | undefined, locale: StorefrontLocale): {
  label: string
  className: string
} {
  const label = evidenceStatusLabelNl(status)
  if (status === "approved")
    return { label, className: "text-emerald-700" }
  if (
    status === "pending" ||
    status === "pending_review" ||
    status === "pending_evidence_review" ||
    status === "precheck_warning"
  )
    return { label, className: "text-blue-700" }
  if (status === "rejected")
    return { label, className: "text-red-700" }
  if (status === "not_required")
    return { label: t("evNotRequired", locale), className: "text-wf-600" }
  return { label, className: "text-amber-800 font-semibold" }
}

function activeEvidence(
  rows: MadeInEuropeEvidenceItem[] | undefined,
  kind: EvidenceKind
) {
  return (rows || []).filter(
    (e) =>
      (e.evidence_kind || "made_in_europe") === kind &&
      e.verification_status !== "superseded"
  )
}

function summarizeKind(
  rows: MadeInEuropeEvidenceItem[] | undefined,
  kind: EvidenceKind,
  required: boolean,
  locale: StorefrontLocale
) {
  const active = activeEvidence(rows, kind)
  if (!required && active.length === 0) return statusLabel("not_required", locale)
  if (active.some((e) => e.verification_status === "approved"))
    return statusLabel("approved", locale)
  if (active.some((e) => e.verification_status === "rejected"))
    return statusLabel("rejected", locale)
  if (
    active.some(
      (e) =>
        e.verification_status === "pending" ||
        e.verification_status === "pending_review"
    )
  )
    return statusLabel("pending_review", locale)
  if (active.length > 0) return statusLabel("pending_review", locale)
  return statusLabel("missing", locale)
}

export function ComplianceEvidenceSection(props: {
  productId: string
  kind: EvidenceKind
  title: string
  hint: string
  evidence: MadeInEuropeEvidenceItem[] | undefined
  visible: boolean
  acceptPdfOnly?: boolean
  compact?: boolean
  required?: boolean
  locale?: StorefrontLocale
  onChanged: () => void
  onError: (msg: string) => void
  onNotice: (msg: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const required = props.required !== false
  const locale = props.locale || "nl"

  if (!props.visible) return null

  const active = activeEvidence(props.evidence, props.kind)
  const st = summarizeKind(props.evidence, props.kind, required, locale)
  const highlightId =
    active.find((e) => e.verification_status === "approved")?.id ??
    active[0]?.id ??
    null
  const showUpload = required

  async function uploadFromUrl() {
    const ref = url.trim()
    if (!ref) {
      props.onError(t("evUrlOrFile", locale))
      return
    }
    setBusy(true)
    try {
      const lower = ref.toLowerCase()
      const document_type = lower.includes(".pdf")
        ? ("pdf" as const)
        : ("photo" as const)
      await uploadComplianceEvidence(props.productId, {
        storage_reference: ref,
        evidence_kind: props.kind,
        document_type,
        mime_type:
          document_type === "pdf" ? "application/pdf" : "image/png",
      })
      setUrl("")
      props.onNotice(`${kindLabel(props.kind, locale)} ${t("evAddedPending", locale)}`)
      props.onChanged()
    } catch (err) {
      props.onError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("evUploadFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function uploadFile(file: File | null) {
    if (!file) return
    if (props.acceptPdfOnly && file.type !== "application/pdf") {
      props.onError(t("evPdfOnly", locale))
      return
    }
    setBusy(true)
    try {
      const uploaded = await uploadProductMediaFile(props.productId, file, {
        media_type: "Overige afbeelding",
      })
      const document_type =
        file.type === "application/pdf" ? ("pdf" as const) : ("photo" as const)
      await uploadComplianceEvidence(props.productId, {
        storage_reference: uploaded.media.storage_reference,
        evidence_kind: props.kind,
        document_type,
        file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
      })
      props.onNotice(`${kindLabel(props.kind, locale)} ${t("evRegisteredPending", locale)}`)
      props.onChanged()
    } catch (err) {
      props.onError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("evFileUploadFailed", locale)
      )
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function remove(evidenceId: string) {
    if (!window.confirm(t("evDeleteConfirm", locale))) return
    setBusy(true)
    try {
      await deleteMadeInEuropeEvidence(props.productId, evidenceId)
      props.onNotice(t("evDeleted", locale))
      props.onChanged()
    } catch (err) {
      props.onError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("evDeleteFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded border border-wf-300 bg-white p-2">
      <h3 className="text-xs font-bold text-wf-900">{props.title}</h3>
      <p className="mt-1 text-[11px] text-wf-600">{props.hint}</p>
      <p className="mt-2 text-[11px]">
        Status:{" "}
        <strong className={st.className}>{st.label}</strong>
        {props.kind === "made_in_europe" && required && active.length === 0
          ? ` · ${t("evMinOne", locale)}`
          : ""}
      </p>
      <ul
        className={
          props.compact
            ? "mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 tablet:grid-cols-4 desktop:grid-cols-6"
            : "mt-2 space-y-2"
        }
      >
        {active.map((e) => {
          const isImage =
            e.document_type === "photo" ||
            String(e.mime_type || "").startsWith("image/")
          const stItem = statusLabel(e.verification_status, locale)
          const highlighted = e.id === highlightId
          return (
            <li
              key={e.id}
              className={`max-w-[9.5rem] rounded border p-1.5 text-[10px] ${
                highlighted
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-wf-200"
              }`}
            >
              {isImage ? (
                <div className="mx-auto mb-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded border border-wf-200 bg-wf-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveSellerMediaUrl(e.storage_reference)}
                    alt=""
                    className="h-16 w-16 object-contain"
                  />
                </div>
              ) : (
                <div className="mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded border border-wf-200 bg-wf-50 text-[10px] text-wf-500">
                  PDF
                </div>
              )}
              <p
                className="truncate font-semibold"
                title={e.file_name || e.document_type}
              >
                {e.file_name || e.document_type}
              </p>
              <p className={stItem.className}>
                {stItem.label}
                {highlighted && e.verification_status === "approved"
                  ? ` · ${t("evFirstApproved", locale)}`
                  : ""}
              </p>
              {e.verification_notes && !props.compact ? (
                <p className="text-wf-500">{e.verification_notes}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <a
                  href={resolveSellerMediaUrl(e.storage_reference)}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("evOpenDoc", locale)}
                </a>
                <button
                  type="button"
                  disabled={busy}
                  className="text-red-700 underline disabled:opacity-50"
                  onClick={() => void remove(e.id)}
                >
                  {t("vpDelete", locale)}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {showUpload ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={
              props.acceptPdfOnly
                ? ".pdf,application/pdf"
                : ".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
            }
            className="hidden"
            disabled={busy}
            onChange={(e) => void uploadFile(e.target.files?.[0] ?? null)}
          />
          <Button
            size="sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {t("evAddFile", locale)}
          </Button>
          <div className="min-w-[140px] max-w-[220px] flex-1">
            <Input
              label={t("evOrUrl", locale)}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void uploadFromUrl()}
          >
            {t("evAddUrl", locale)}
          </Button>
        </div>
      ) : null}
      {showUpload ? (
        <p className="mt-1 text-[10px] text-wf-500">
          {t("evAutoReviewHint", locale)}
        </p>
      ) : null}
    </section>
  )
}

function uniqueEvidenceByFile(rows: MadeInEuropeEvidenceItem[] | undefined) {
  const seen = new Set<string>()
  const out: MadeInEuropeEvidenceItem[] = []
  for (const row of (rows || []).filter(
    (e) => e.verification_status !== "superseded"
  )) {
    const key = row.storage_reference || row.id
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

export function UnifiedComplianceEvidenceSection(props: {
  productId: string
  evidence: MadeInEuropeEvidenceItem[] | undefined
  ceRequired: boolean
  dataRequired: boolean
  locale?: StorefrontLocale
  onChanged: () => void
  onError: (msg: string) => void
  onNotice: (msg: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const locale = props.locale || "nl"
  const items = uniqueEvidenceByFile(props.evidence)
  const required = true
  const st = summarizeKind(props.evidence, "made_in_europe", required, locale)
  const dataSt = summarizeKind(
    props.evidence,
    "data_usage",
    props.dataRequired,
    locale
  )

  async function kindsForFile(isPdf: boolean): Promise<EvidenceKind[]> {
    const kinds: EvidenceKind[] = ["made_in_europe"]
    if (isPdf && props.dataRequired) kinds.push("data_usage")
    return kinds
  }

  async function uploadFromUrl() {
    const ref = url.trim()
    if (!ref) {
      props.onError(t("evUrlOrFile", locale))
      return
    }
    setBusy(true)
    try {
      const lower = ref.toLowerCase()
      const isPdf = lower.includes(".pdf")
      const document_type = isPdf ? ("pdf" as const) : ("photo" as const)
      await uploadComplianceEvidence(props.productId, {
        storage_reference: ref,
        evidence_kind: "made_in_europe",
        evidence_kinds: await kindsForFile(isPdf),
        document_type,
        mime_type: isPdf ? "application/pdf" : "image/png",
      })
      setUrl("")
      props.onNotice(`${t("evHeading", locale)} ${t("evAddedPending", locale)}`)
      props.onChanged()
    } catch (err) {
      props.onError(
        err instanceof ProductCloudApiError ? err.message : t("evUploadFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function uploadFile(file: File | null) {
    if (!file) return
    setBusy(true)
    try {
      const uploaded = await uploadProductMediaFile(props.productId, file, {
        media_type: "Overige afbeelding",
      })
      const isPdf = file.type === "application/pdf"
      const document_type = isPdf ? ("pdf" as const) : ("photo" as const)
      await uploadComplianceEvidence(props.productId, {
        storage_reference: uploaded.media.storage_reference,
        evidence_kind: "made_in_europe",
        evidence_kinds: await kindsForFile(isPdf),
        document_type,
        file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
      })
      props.onNotice(`${t("evHeading", locale)} ${t("evRegisteredPending", locale)}`)
      props.onChanged()
    } catch (err) {
      props.onError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("evFileUploadFailed", locale)
      )
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function remove(evidence: MadeInEuropeEvidenceItem) {
    if (!window.confirm(t("evDeleteConfirm", locale))) return
    setBusy(true)
    try {
      const siblings = (props.evidence || []).filter(
        (row) =>
          row.verification_status !== "superseded" &&
          row.storage_reference === evidence.storage_reference
      )
      const ids = siblings.length ? siblings.map((row) => row.id) : [evidence.id]
      for (const id of ids) {
        await deleteMadeInEuropeEvidence(props.productId, id)
      }
      props.onNotice(t("evDeleted", locale))
      props.onChanged()
    } catch (err) {
      props.onError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("evDeleteFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded border border-wf-300 bg-white p-2">
      <h3 className="text-xs font-bold text-wf-900">{t("evHeading", locale)}</h3>
      <p className="mt-1 text-[11px] text-wf-600">
        {t("evExplain", locale)}
      </p>
      <p className="mt-2 text-[11px]">
        Status:{" "}
        <strong className={st.className}>{st.label}</strong>
        {required && items.length === 0 ? ` · ${t("evMinOneShort", locale)}` : ""}
        {props.ceRequired ? ` · ${t("evCeVisible", locale)}` : ` · ${t("evCeNotRequired", locale)}`}
      </p>
      {props.dataRequired ? (
        <p className="mt-[2px] text-[11px]">
          {t("evDataUsageDocLabel", locale)}
          <strong className={dataSt.className}>{dataSt.label}</strong>
          {dataSt.label === t("evMissing", locale)
            ? ` · ${t("evDataUsagePdf", locale)}`
            : ""}
        </p>
      ) : (
        <p className="mt-[2px] text-[11px] text-wf-600">
          {t("evNoDataUsageNeeded", locale)}
        </p>
      )}
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 tablet:grid-cols-4 desktop:grid-cols-6">
        {items.map((e) => {
          const isImage =
            e.document_type === "photo" ||
            String(e.mime_type || "").startsWith("image/")
          const stItem = statusLabel(e.verification_status, locale)
          return (
            <li
              key={e.storage_reference || e.id}
              className="max-w-[9.5rem] rounded border border-wf-200 p-1.5 text-[10px]"
            >
              {isImage ? (
                <div className="mx-auto mb-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded border border-wf-200 bg-wf-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveSellerMediaUrl(e.storage_reference)}
                    alt=""
                    className="h-16 w-16 object-contain"
                  />
                </div>
              ) : (
                <div className="mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded border border-wf-200 bg-wf-50 text-[10px] text-wf-500">
                  PDF
                </div>
              )}
              <p
                className="truncate font-semibold"
                title={e.file_name || e.document_type}
              >
                {e.file_name || e.document_type}
              </p>
              <p className={stItem.className}>{stItem.label}</p>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <a
                  href={resolveSellerMediaUrl(e.storage_reference)}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("evOpenDoc", locale)}
                </a>
                <button
                  type="button"
                  disabled={busy}
                  className="text-red-700 underline disabled:opacity-50"
                  onClick={() => void remove(e)}
                >
                  {t("vpDelete", locale)}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
          className="hidden"
          disabled={busy}
          onChange={(e) => void uploadFile(e.target.files?.[0] ?? null)}
        />
        <Button
          size="sm"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {t("evAddFile", locale)}
        </Button>
        <div className="min-w-[140px] max-w-[220px] flex-1">
          <Input
            label={t("evOrUrl", locale)}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void uploadFromUrl()}
        >
          {t("evAddUrl", locale)}
        </Button>
      </div>
      <p className="mt-1 text-[10px] text-wf-500">
        {t("evAutoReviewHint", locale)}
      </p>
    </section>
  )
}
