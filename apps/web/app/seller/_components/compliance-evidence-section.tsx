"use client"

import { useRef, useState, type ReactNode } from "react"
import { Button } from "@europmade/ui"
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
  return t("evMadeInEurope", locale)
}

function statusLabel(
  status: string | null | undefined,
  locale: StorefrontLocale
): { label: string; className: string } {
  const label = evidenceStatusLabelNl(status)
  if (status === "approved") return { label, className: "text-emerald-700" }
  if (status === "needs_info" || status === "request_info")
    return { label, className: "text-amber-800 font-semibold" }
  if (
    status === "pending" ||
    status === "pending_review" ||
    status === "pending_evidence_review" ||
    status === "precheck_warning"
  )
    return { label, className: "text-blue-700" }
  if (status === "rejected") return { label, className: "text-red-700" }
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
  if (active.some((e) => e.verification_status === "needs_info"))
    return statusLabel("needs_info", locale)
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
  required?: boolean
  locale?: StorefrontLocale
  alsoRegisterKinds?: EvidenceKind[]
  onChanged: () => void
  onError: (msg: string) => void
  onNotice: (msg: string) => void
  headerExtra?: ReactNode
  /** Render without outer card (for embedding in a parent column). */
  bare?: boolean
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

  function kindsToRegister(): EvidenceKind[] {
    const extra = props.alsoRegisterKinds || []
    return Array.from(new Set([props.kind, ...extra]))
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
        evidence_kind: props.kind,
        evidence_kinds: kindsToRegister(),
        document_type,
        mime_type: isPdf ? "application/pdf" : "image/png",
      })
      setUrl("")
      props.onNotice(
        `${kindLabel(props.kind, locale)} toegevoegd — aanvulling ingediend, wacht op beoordeling.`
      )
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
    setBusy(true)
    try {
      const uploaded = await uploadProductMediaFile(props.productId, file, {
        media_type: "Overige afbeelding",
      })
      const isPdf = file.type === "application/pdf"
      const document_type = isPdf ? ("pdf" as const) : ("photo" as const)
      await uploadComplianceEvidence(props.productId, {
        storage_reference: uploaded.media.storage_reference,
        evidence_kind: props.kind,
        evidence_kinds: kindsToRegister(),
        document_type,
        file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
      })
      props.onNotice(
        `${kindLabel(props.kind, locale)} geregistreerd — aanvulling ingediend, wacht op beoordeling.`
      )
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

  const body = (
    <>
      {!props.bare ? (
        <>
          <h3 className="text-xs font-bold text-wf-900">{props.title}</h3>
          <p className="mt-1 text-[11px] text-wf-600">{props.hint}</p>
        </>
      ) : null}
      {props.headerExtra}
      <p className="mt-2 text-[11px]">
        {t("evStatusLabel", locale)}{" "}
        <strong className={st.className}>{st.label}</strong>
        {required && active.length === 0 ? ` · ${t("evMinOneShort", locale)}` : ""}
      </p>
      <ul className="mt-2 space-y-2">
        {active.map((e) => {
          const isImage =
            e.document_type === "photo" ||
            String(e.mime_type || "").startsWith("image/")
          const stItem = statusLabel(e.verification_status, locale)
          const highlighted = e.id === highlightId
          return (
            <li
              key={e.id}
              className={`rounded border p-1.5 text-[10px] ${
                highlighted
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-wf-200"
              }`}
            >
              {isImage ? (
                <div className="mb-1 flex h-14 w-14 items-center justify-center overflow-hidden rounded border border-wf-200 bg-wf-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveSellerMediaUrl(e.storage_reference)}
                    alt=""
                    className="h-14 w-14 object-contain"
                  />
                </div>
              ) : (
                <div className="mb-1 flex h-14 w-14 items-center justify-center rounded border border-wf-200 bg-wf-50 text-[10px] text-wf-500">
                  PDF
                </div>
              )}
              <p
                className="truncate font-semibold"
                title={e.file_name || e.document_type}
              >
                {e.file_name || e.document_type}
              </p>
              <p className="text-wf-500">{e.document_type}</p>
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
        <div className="mt-auto space-y-2 pt-2">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept={
                props.acceptPdfOnly
                  ? ".pdf,application/pdf"
                  : ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
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
              {t("evChooseFile", locale)}
            </Button>
            <p className="mt-1 text-[10px] text-wf-500">
              {props.acceptPdfOnly
                ? "PDF"
                : "JPG, PNG, WebP of PDF"}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 tablet:grid-cols-[minmax(0,1fr)_auto] tablet:items-end">
            <div className="min-w-0">
              <label className="mb-1 block text-[11px] font-semibold text-wf-700">
                {t("evOrUrl", locale)}
              </label>
              <input
                className="h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                disabled={busy}
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-9 shrink-0"
              disabled={busy}
              onClick={() => void uploadFromUrl()}
            >
              {t("evAdd", locale)}
            </Button>
          </div>
          <p className="text-[10px] text-wf-500">
            {t("evAutoReviewHint", locale)}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-wf-600">{t("evNotRequired", locale)}</p>
      )}
    </>
  )

  if (props.bare) return <div className="flex h-full flex-col">{body}</div>

  return (
    <section className="flex h-full flex-col rounded border border-wf-300 bg-white p-2">
      {body}
    </section>
  )
}

/**
 * Three clear evidence columns: CE · Made in Europe · Data processing.
 */
export function UnifiedComplianceEvidenceSection(props: {
  productId: string
  evidence: MadeInEuropeEvidenceItem[] | undefined
  ceRequired: boolean
  dataRequired: boolean
  mieRequired?: boolean
  locale?: StorefrontLocale
  onChanged: () => void
  onError: (msg: string) => void
  onNotice: (msg: string) => void
  dataProcessingControl?: ReactNode
}) {
  const locale = props.locale || "nl"
  const [ceAlsoLocation, setCeAlsoLocation] = useState(true)
  const mieRequired = props.mieRequired !== false

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-wf-900">{t("evHeading", locale)}</h3>
      <p className="text-[11px] text-wf-600">{t("evExplain", locale)}</p>
      <div className="grid gap-2 tablet:grid-cols-3">
        <ComplianceEvidenceSection
          productId={props.productId}
          kind="ce_marking"
          title={t("evCeProof", locale)}
          hint={t("complianceCeHint", locale)}
          evidence={props.evidence}
          visible
          required={props.ceRequired}
          locale={locale}
          alsoRegisterKinds={
            props.ceRequired && ceAlsoLocation ? ["made_in_europe"] : undefined
          }
          onChanged={props.onChanged}
          onError={props.onError}
          onNotice={props.onNotice}
          headerExtra={
            props.ceRequired ? (
              <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] text-wf-800">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={ceAlsoLocation}
                  onChange={(e) => setCeAlsoLocation(e.target.checked)}
                />
                <span>{t("complianceCeAlsoLocation", locale)}</span>
              </label>
            ) : null
          }
        />
        <ComplianceEvidenceSection
          productId={props.productId}
          kind="made_in_europe"
          title={t("evMadeInEurope", locale)}
          hint={t("complianceMieHint", locale)}
          evidence={props.evidence}
          visible
          required={mieRequired}
          locale={locale}
          onChanged={props.onChanged}
          onError={props.onError}
          onNotice={props.onNotice}
          headerExtra={
            props.ceRequired && ceAlsoLocation ? (
              <p className="mt-2 text-[10px] text-wf-600">
                {t("complianceCeAlsoLocationHint", locale)}
              </p>
            ) : null
          }
        />
        <section className="flex h-full flex-col rounded border border-wf-300 bg-white p-2">
          <h3 className="text-xs font-bold text-wf-900">
            {t("evDataUsageInfo", locale)}
          </h3>
          <p className="mt-1 text-[11px] text-wf-600">
            {t("complianceDataQuestion", locale)}
          </p>
          {props.dataProcessingControl}
          {props.dataRequired ? (
            <ComplianceEvidenceSection
              productId={props.productId}
              kind="data_usage"
              title={t("evDataUsageDocTitle", locale)}
              hint={t("evDataUsagePdf", locale)}
              evidence={props.evidence}
              visible
              required
              acceptPdfOnly
              bare
              locale={locale}
              onChanged={props.onChanged}
              onError={props.onError}
              onNotice={props.onNotice}
            />
          ) : (
            <p className="mt-2 text-[11px] text-wf-600">
              {t("evNoDataUsageNeeded", locale)}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
