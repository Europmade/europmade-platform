"use client"

import Link from "next/link"
import { Badge, Button } from "@europmade/ui"
import { useEffect, useState } from "react"
import {
  ProductApprovalAdminApiError,
  saveAdminMadeInEurope,
  type AdminProductDetail,
  type SectionReviewKey,
} from "../../lib/product-approval-admin-api"
import {
  EuropeanOwnershipAdminApiError,
  updateEuropeanOwnershipBand,
} from "../../lib/european-ownership-admin-api"
import {
  ComplianceAdminApiError,
  reviewComplianceEvidence,
} from "../../lib/compliance-admin-api"
import {
  CentralComplianceForm,
  CentralDescriptionForm,
  CentralInformationForm,
  CentralMediaForm,
  CentralTranslationsForm,
} from "./admin-central-forms"
import {
  displayMediaUrl,
  isLikelyPdf,
  isLikelyRasterImage,
  isVideoMedia,
  videoEmbedUrl,
} from "../../lib/media-url"
import {
  findSectionReview,
  ProductEndReviewBlock,
  sectionReviewStatusLabel,
} from "./product-review-panel"
import { AdminProductManagerCard } from "./admin-product-manager-card"
import { AdminSectionProposalReviews } from "./admin-section-proposal-reviews"
import { SectionReviewAside, SectionSplit, sectionNotes } from "./section-review-aside"
import type { AdminChangeProposal } from "../../lib/change-proposal-admin-api"
import {
  ADMIN_EVIDENCE_STATUS_LABELS,
  ADMIN_LIFECYCLE_LABELS,
  ADMIN_PUBLICATION_LABELS,
  ADMIN_WORKFLOW_LABELS,
  adminLabel,
} from "../../lib/admin-status-labels"

export type WizardStep =
  | "information"
  | "offer"
  | "shipping"
  | "media"
  | "compliance"
  | "translations"
  | "publish"

export const ADMIN_WIZARD_STEPS: Array<{
  key: WizardStep
  short: string
  label: string
}> = [
  { key: "information", short: "Info", label: "Productinformatie" },
  { key: "media", short: "Media", label: "Media" },
  { key: "compliance", short: "Compliance", label: "Compliance" },
  { key: "translations", short: "Vertalingen", label: "Vertalingen" },
  { key: "publish", short: "Publiceren", label: "Publiceren" },
]

function adminControlStrip(product: AdminProductDetail): Array<[string, string]> {
  const status = product.publication_status
  const outcome = product.admin_review_outcome
  let approval = "Nog niet ingediend"
  if (outcome === "rejected") approval = "Afgekeurd"
  else if (outcome === "needs_info") approval = "Aanvulling gevraagd"
  else if (
    outcome === "approved" ||
    status === "Gepubliceerd" ||
    status === "Goedgekeurd"
  ) {
    approval = "Goedgekeurd"
  } else if (status === "In review") {
    approval = "Wacht op productgoedkeuring"
  }

  const offerCount = product.offers?.offer_count ?? product.offer_count ?? 0
  const sales = product.offers?.sales_status
  let offer = "Geen aanbod"
  if (offerCount > 0 && sales === "paused") offer = "Gepauzeerd"
  else if (offerCount > 0 && (sales === "active" || sales === "mixed")) offer = "Actief"
  else if (offerCount > 0) offer = "Aanwezig"

  const completeness = product.completeness as {
    sale_presentation?: string
    findings?: Array<{ category?: string; message?: string }>
  } | null
  const sale = completeness?.sale_presentation
  const saleReason = completeness?.findings?.find((finding) => finding.category === "sale")?.message
  const sellabilityBase =
    sale === "for_sale"
      ? "Te koop"
      : sale === "paused"
        ? "Gepauzeerd"
        : sale === "no_offer"
          ? "Geen aanbod"
          : sale === "not_published"
            ? "Niet in winkel"
            : "Niet verkoopbaar"
  const sellability =
    sale !== "for_sale" && saleReason ? `${sellabilityBase} — ${saleReason}` : sellabilityBase

  return [
    ["Productgoedkeuring", approval],
    ["Publicatiestatus", status || "—"],
    ["Aanbodstatus", offer],
    ["Verkoopbaarheid", sellability],
  ]
}

export function AdminWizardShell(props: {
  id: string
  data: AdminProductDetail
  error: string | null
  step: WizardStep
  setStep: (s: WizardStep) => void
  load: () => Promise<void>
  highlightProposalId?: string | null
  lightbox: {
    url: string
    kind: "image" | "pdf" | "other"
    title: string
  } | null
  setLightbox: (
    v: {
      url: string
      kind: "image" | "pdf" | "other"
      title: string
    } | null
  ) => void
  broken: Record<string, boolean>
  setBroken: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}) {
  const {
    id,
    data,
    error,
    step,
    setStep,
    load,
    highlightProposalId,
    lightbox,
    setLightbox,
    broken,
    setBroken,
  } = props
  const product = data.product
  const changeProposals = (data.change_proposals ||
    []) as unknown as AdminChangeProposal[]
  const completeness = (product.completeness || {}) as NonNullable<
    typeof product.completeness
  >
  const blocked = completeness.publication_blocked_reasons || []
  const title = String(product.title || id)
  const mie = (data.made_in_europe || {}) as Record<string, unknown>
  const origin = (mie.origin || mie.product_origin || null) as Record<
    string,
    unknown
  > | null
  const media = (product.media || []) as Array<{
    id?: string
    media_type?: string
    storage_reference?: string
    mime_type?: string | null
    metadata?: Record<string, unknown> | null
    sort_order?: number
  }>
  const sortedMedia = [...media].sort(
    (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
  )
  const documents = (product.documents || []) as Array<{
    id?: string
    document_type?: string
    storage_reference?: string
  }>
  const evidence = data.evidence || []
  const mieEvidence = evidence.filter((row) => {
    const e = row as { evidence_kind?: string }
    return (
      !e.evidence_kind ||
      e.evidence_kind === "made_in_europe" ||
      e.evidence_kind === "data_usage"
    )
  }) as Array<Record<string, unknown>>
  const ceEvidence = evidence.filter(
    (row) => (row as { evidence_kind?: string }).evidence_kind === "ce_marking"
  ) as Array<Record<string, unknown>>
  const fieldChanges = (product.field_changes || []) as Array<{
    id?: string
    field_label?: string
    field_code?: string
    new_value?: string
    status?: string
    reason?: string | null
  }>
  const sectionReviews = data.section_reviews || []
  const activeStep: WizardStep =
    step === "offer" || step === "shipping" ? "information" : step
  const stepIdx = ADMIN_WIZARD_STEPS.findIndex((s) => s.key === activeStep)
  const reviewFor = (key: SectionReviewKey) =>
    findSectionReview(sectionReviews, key)
  const reviewBadge = (key: SectionReviewKey) => (
    <span className="rounded-full border border-wf-300 px-2 py-0.5 text-[10px] font-semibold text-wf-700">
      {sectionReviewStatusLabel(reviewFor(key)?.status ?? "unreviewed")}
    </span>
  )
  const openAsset = (
    url: string | null,
    kind: "image" | "pdf" | "other",
    t: string
  ) => {
    if (url) setLightbox({ url, kind, title: t })
  }
  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Producten &gt;{" "}
        <Link href="/product-cloud/products" className="underline">
          Product Management
        </Link>{" "}
        &gt; <b>{title}</b>
      </p>

      <div className="mb-4 flex flex-wrap gap-4 border-b border-wf-300 pb-4">
        {displayMediaUrl(product.primary_image_url ? String(product.primary_image_url) : null) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayMediaUrl(product.primary_image_url ? String(product.primary_image_url) : null) as string}
            alt=""
            className="h-20 w-20 rounded bg-wf-50 object-contain"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded bg-wf-100 text-xs text-wf-500">
            Geen media
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[19px] font-bold text-wf-900">{title}</h1>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-wf-600">
            <span>EAN: {product.identifier_value || "—"}</span>
            <span>Merk: {product.brand_name || "—"}</span>
            <span>
              Categorie: {(product.category_names || []).join(", ") || "—"}
            </span>
            <span className="font-mono">{id}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">
              {adminLabel(
                ADMIN_LIFECYCLE_LABELS,
                String(product.lifecycle_status || "")
              )}
            </Badge>
            <Badge
              variant={
                product.publication_status === "In review" ? "solid" : "outline"
              }
            >
              Publicatie:{" "}
              {adminLabel(
                ADMIN_PUBLICATION_LABELS,
                String(product.publication_status || "")
              )}
            </Badge>
            <Badge variant="outline">
              {adminLabel(
                ADMIN_WORKFLOW_LABELS,
                String(product.workflow_status || "")
              )}
            </Badge>
            {adminControlStrip(product).map(([label, value]) => (
              <Badge key={label} variant="outline">
                {label}: {value}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-wf-600">
            {product.publication_status === "Gepubliceerd"
              ? "Gepubliceerd"
              : (completeness.findings || []).some(
                    (finding) =>
                      finding.severity === "blocker" &&
                      finding.category !== "sale" &&
                      finding.category !== "warning"
                  )
                ? "Productinformatie onvolledig"
                : (completeness.findings || []).some((finding) => finding.category === "sale")
                  ? "Alleen het aanbod blokkeert de verkoop"
                  : completeness.publishable
                    ? "Publiceerbaar"
                    : "Niet publiceerbaar"}{" "}
            · Info: {completeness.percent ?? 0}% · Compliance:{" "}
            {adminLabel(
              ADMIN_EVIDENCE_STATUS_LABELS,
              String(completeness.compliance_review_status || "")
            )}
          </p>
          {(completeness.findings || []).length > 0 ? (
            <ul className="mt-2 space-y-1 rounded border border-wf-300 bg-white p-2 text-[11px] text-wf-800">
              {(completeness.findings || []).map((finding) => (
                <li key={finding.code}>
                  <span className="font-semibold">
                    {finding.severity === "warning" ? "Waarschuwing" : "Blokkade"}
                    {" · "}
                    {finding.category === "submission"
                      ? "Indiening"
                      : finding.category === "approval"
                        ? "Goedkeuring"
                        : finding.category === "publication"
                          ? "Publicatie"
                          : finding.category === "sale"
                            ? "Verkoop"
                            : "Waarschuwing"}
                    {" · "}
                    {finding.field}
                  </span>
                  {": "}
                  {finding.message} {finding.action}
                </li>
              ))}
            </ul>
          ) : blocked.length > 0 ? (
            <ul className="mt-1 space-y-1 text-[11px] text-red-800">
              {blocked.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          {fieldChanges.some((change) =>
            String(change.field_code || "").startsWith("import.issue.")
          ) ? (
            <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-950">
              <p className="font-semibold">
                Importgeschiedenis. Dit is de oorspronkelijke melding, geen
                actuele blokkade.
              </p>
              <ul className="mt-1 list-disc pl-4">
                {fieldChanges
                  .filter((change) =>
                    String(change.field_code || "").startsWith("import.issue.")
                  )
                  .map((change) => (
                    <li key={String(change.id || change.field_code)}>
                      {change.field_label || change.field_code}:{" "}
                      {change.new_value || "leeg"} — {change.reason}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-xs text-amber-800">{error}</p>
      ) : null}

      <div className="mb-5">
        <div className="mb-2 flex justify-between text-[11px]">
          <span className="font-semibold uppercase tracking-wide text-wf-500">
                Productflow
          </span>
          <span className="text-wf-600">
            Stap {stepIdx + 1} van {ADMIN_WIZARD_STEPS.length}
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {ADMIN_WIZARD_STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(s.key)}
              className={`flex min-w-[88px] flex-1 flex-col items-start gap-1 rounded-md border px-2 py-2 text-left ${
                s.key === activeStep
                  ? "border-wf-900 bg-wf-900 text-white"
                  : "border-wf-300 bg-wf-50 text-wf-700"
              }`}
            >
              <span className="text-[10px] font-semibold opacity-80">
                {i + 1}. {s.short}
              </span>
              <span className="text-[11px] font-semibold leading-tight">
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* MARK_STEPS */}
      <div className="grid grid-cols-1 gap-5 tablet:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          {activeStep === "information" ? (
            <>
              <Card>
                <CardTitle>
                  Basisinformatie {reviewBadge("product_info")}
                </CardTitle>
                <SectionSplit
                  aside={
                    <SectionReviewAside
                      productId={id}
                      sectionKey="product_info"
                      review={reviewFor("product_info")}
                      onSaved={load}
                      {...sectionNotes({
                        section: "information",
                        blocked,
                        documents: completeness.documents || [],
                        manufacturerId: String(product.manufacturer_id || ""),
                      })}
                    />
                  }
                >
                <CentralInformationForm
                  key={`${id}:${String(product.manufacturer_id || "")}`}
                  productId={id}
                  product={product as Record<string, unknown>}
                  catalog={(data as { catalog_choices?: {
                    brands?: Array<{ id: string; name: string }>
                    manufacturers?: Array<{ id: string; name: string }>
                    categories?: Array<{ id: string; name: string; parent_id?: string | null }>
                    variant_types?: string[]
                  } }).catalog_choices || {}}
                  onSaved={load}
                />
                <AdminSectionProposalReviews
                  proposals={changeProposals}
                  fields={["title", "brand_id", "manufacturer_id", "attribute"]}
                  highlightId={highlightProposalId}
                  onDecided={load}
                />
                </SectionSplit>
              </Card>
              <Card>
                <CardTitle>Beschrijving {reviewBadge("content")}</CardTitle>
                <SectionSplit
                  aside={
                    <SectionReviewAside
                      productId={id}
                      sectionKey="content"
                      review={reviewFor("content")}
                      onSaved={load}
                      missing={[]}
                      failed={[]}
                    />
                  }
                >
                <CentralDescriptionForm
                  key={`${id}:${String(product.description ?? "")}`}
                  productId={id}
                  product={product as Record<string, unknown>}
                  onSaved={load}
                />
                <AdminSectionProposalReviews
                  proposals={changeProposals}
                  fields={["description"]}
                  highlightId={highlightProposalId}
                  onDecided={load}
                />
                </SectionSplit>
              </Card>
              <AdminProductManagerCard
                productId={id}
                data={data}
                onSaved={load}
              />
              <AdminSectionProposalReviews
                proposals={changeProposals}
                fields={["product_manager"]}
                highlightId={highlightProposalId}
                onDecided={load}
              />
              <StepNav
                onPrev={null}
                onNext={() => setStep("media")}
                nextLabel="Volgende: media"
              />
            </>
          ) : null}
          {/* MARK_MEDIA */}
          {activeStep === "media" ? (
            <>
              <Card>
                <CardTitle>Media {reviewBadge("media")}</CardTitle>
                <SectionSplit
                  aside={
                    <SectionReviewAside
                      productId={id}
                      sectionKey="media"
                      review={reviewFor("media")}
                      onSaved={load}
                      {...sectionNotes({
                        section: "media",
                        blocked,
                        documents: completeness.documents || [],
                      })}
                    />
                  }
                >
                <CentralMediaForm
                  productId={id}
                  product={product as Record<string, unknown>}
                  onSaved={load}
                />
                <AdminSectionProposalReviews
                  proposals={changeProposals}
                  fields={["media_note"]}
                  highlightId={highlightProposalId}
                  onDecided={load}
                />
                {sortedMedia.length === 0 ? (
                  <p className="text-xs text-wf-600">Geen media aanwezig.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3">
                    {sortedMedia.map((m) => {
                      const key = String(m.id || m.storage_reference)
                      const meta = m.metadata || null
                      const video = isVideoMedia(
                        m.media_type,
                        m.storage_reference,
                        m.mime_type,
                        meta
                      )
                      const embed = video ? videoEmbedUrl(meta) : null
                      const url = displayMediaUrl(m.storage_reference, meta)
                      const pdf = isLikelyPdf({
                        mime: m.mime_type,
                        ref: m.storage_reference,
                      })
                      const raster = isLikelyRasterImage({
                        mime: m.mime_type,
                        ref: m.storage_reference,
                        mediaType: m.media_type,
                      })
                      const isPrimary = m.media_type === "Hoofdafbeelding"
                      const label =
                        m.media_type === "Hoofdafbeelding"
                          ? "Hoofdafbeelding"
                          : m.media_type === "Video"
                            ? "Video"
                            : "Overige afbeelding"
                      const openKind = pdf
                        ? "pdf"
                        : video || !raster
                          ? "other"
                          : "image"
                      return (
                        <div
                          key={key}
                          className={`rounded border p-2 ${
                            isPrimary
                              ? "border-em-green ring-1 ring-em-green/30"
                              : "border-wf-200"
                          }`}
                        >
                          {video && embed ? (
                            <iframe
                              src={embed}
                              title={label}
                              className="mb-2 aspect-video w-full rounded bg-wf-50"
                              allowFullScreen
                            />
                          ) : video && url ? (
                            <video
                              src={url}
                              className="mb-2 aspect-video w-full object-contain"
                              controls
                              muted
                            />
                          ) : pdf ? (
                            <button
                              type="button"
                              disabled={!url}
                              className="mb-2 flex aspect-video w-full flex-col items-center justify-center rounded border border-dashed bg-wf-50"
                              onClick={() => openAsset(url, "pdf", label)}
                            >
                              <span className="font-bold">PDF</span>
                              <span className="text-[10px]">Openen</span>
                            </button>
                          ) : raster && url && !broken[key] ? (
                            <button
                              type="button"
                              className="mb-2 block w-full rounded bg-wf-50"
                              onClick={() => openAsset(url, "image", label)}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={label}
                                className="aspect-video w-full object-contain"
                                onError={() =>
                                  setBroken((p) => ({ ...p, [key]: true }))
                                }
                              />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!url}
                              className="mb-2 flex aspect-video w-full flex-col items-center justify-center rounded bg-wf-100 text-[10px] text-wf-600"
                              onClick={() => openAsset(url, "other", label)}
                            >
                              {url ? "Open link / bestand" : "Geen URL"}
                            </button>
                          )}
                          <p className="text-[10px] font-semibold">
                            {label}
                            {isPrimary ? " · primair" : ""}
                          </p>
                          <p className="truncate font-mono text-[9px] text-wf-500">
                            {m.storage_reference}
                          </p>
                          {url ? (
                            <div className="mt-1 flex gap-2 text-[10px]">
                              <button
                                type="button"
                                className="underline"
                                onClick={() =>
                                  openAsset(url, openKind, label)
                                }
                              >
                                Bekijken
                              </button>
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
                                Nieuw tabblad
                              </a>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
                {documents.length > 0 ? (
                  <div className="mt-4 rounded border border-wf-200 bg-wf-50 p-3">
                    <p className="mb-2 text-xs font-bold">
                      Compliance documenten (geen storefront-media)
                    </p>
                    <div className="grid gap-2 tablet:grid-cols-2">
                      {documents.map((d) => {
                        const url = displayMediaUrl(d.storage_reference)
                        return (
                          <div
                            key={d.id || d.storage_reference}
                            className="rounded border bg-white p-2 text-xs"
                          >
                            <p className="font-semibold">
                              {d.document_type || "Document"}
                            </p>
                            {url ? (
                              <button
                                type="button"
                                className="mt-1 text-[11px] underline"
                                onClick={() =>
                                  openAsset(
                                    url,
                                    isLikelyPdf({ ref: d.storage_reference })
                                      ? "pdf"
                                      : "other",
                                    d.document_type || "Document"
                                  )
                                }
                              >
                                Document openen
                              </button>
                            ) : (
                              <p className="text-[11px] text-amber-800">
                                Geen URL
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
                </SectionSplit>
              </Card>
              <StepNav
                onPrev={() => setStep("information")}
                onNext={() => setStep("compliance")}
                nextLabel="Volgende: compliance"
              />
            </>
          ) : null}
          {/* MARK_COMPLIANCE */}
          {activeStep === "compliance" ? (
            <>
              <Card>
                <CardTitle>
                  Made in Europe {reviewBadge("made_in_europe")}
                </CardTitle>
                <SectionSplit
                  aside={
                    <SectionReviewAside
                      productId={id}
                      sectionKey="made_in_europe"
                      review={reviewFor("made_in_europe")}
                      onSaved={load}
                      {...sectionNotes({
                        section: "mie",
                        blocked,
                        documents: completeness.documents || [],
                      })}
                    />
                  }
                >
                <CentralComplianceForm
                  key={`${id}:origin:${String(origin?.production_country || "")}`}
                  productId={id}
                  product={product as Record<string, unknown>}
                  group="origin"
                  origin={
                    origin
                      ? {
                          production_country: origin.production_country
                            ? String(origin.production_country)
                            : null,
                          production_location: origin.production_location
                            ? String(origin.production_location)
                            : null,
                        }
                      : null
                  }
                  onSaved={load}
                />
                {(() => {
                  const miePending = mieEvidence.some((row) => {
                    const s = String(
                      (row as { verification_status?: string })
                        .verification_status || ""
                    )
                    return s === "pending" || s === "pending_review"
                  })
                  const sr = reviewFor("made_in_europe")
                  if (miePending && sr?.status === "unreviewed") {
                    return (
                      <p className="mb-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-950">
                        Nieuwe evidence aangeleverd — beoordeling vereist
                        {sr.comment ? (
                          <span className="mt-1 block text-blue-900">
                            Vorige opmerking: {sr.comment}
                          </span>
                        ) : null}
                      </p>
                    )
                  }
                  return null
                })()}
                <ReadField
                  label="Documentstatus"
                  value={adminLabel(
                    ADMIN_EVIDENCE_STATUS_LABELS,
                    completeness.documents?.find(
                      (d) => d.code === "doc.made_in_europe"
                    )?.status ||
                      String(product.made_in_europe_status || "")
                  )}
                />
                <ReadField
                  label="Origin status"
                  value={
                    origin
                      ? String(
                          origin.status || origin.verification_status || "—"
                        )
                      : "Niet aanwezig"
                  }
                />
                <ReadField
                  label="Productieland"
                  value={
                    origin
                      ? String(
                          origin.country_of_production ||
                            origin.production_country ||
                            origin.country_code ||
                            "—"
                        )
                      : "—"
                  }
                />
                <MadeInEuropeBandsEditor
                  key={`${id}:mie:${String(
                    (mie.score as { score?: number | null } | null)?.score ??
                      (mie.origin as { assembly_eu_band?: string } | null)
                        ?.assembly_eu_band ??
                      "empty"
                  )}`}
                  productId={id}
                  madeInEurope={mie}
                  onSaved={load}
                />
                <EuropeanOwnershipReadout
                  claim={data.european_ownership}
                  onSaved={load}
                />
                <p className="mt-3 text-[11px] font-semibold uppercase text-wf-500">
                  Evidence ({mieEvidence.length})
                </p>
                <EvidenceCards
                  productId={id}
                  items={mieEvidence}
                  empty="Geen Made in Europe-evidence."
                  onOpen={openAsset}
                  onSaved={load}
                />
                </SectionSplit>
              </Card>
              <Card>
                <CardTitle>
                  CE / Compliance {reviewBadge("ce_compliance")}
                </CardTitle>
                <SectionSplit
                  aside={
                    <SectionReviewAside
                      productId={id}
                      sectionKey="ce_compliance"
                      review={reviewFor("ce_compliance")}
                      onSaved={load}
                      {...sectionNotes({
                        section: "ce",
                        blocked,
                        documents: completeness.documents || [],
                      })}
                    />
                  }
                >
                <CentralComplianceForm
                  productId={id}
                  product={product as Record<string, unknown>}
                  group="ce"
                  onSaved={load}
                />
                {(() => {
                  const cePending = ceEvidence.some((row) => {
                    const s = String(
                      (row as { verification_status?: string })
                        .verification_status || ""
                    )
                    return s === "pending" || s === "pending_review"
                  })
                  const sr = reviewFor("ce_compliance")
                  if (cePending && sr?.status === "unreviewed") {
                    return (
                      <p className="mb-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-950">
                        Nieuwe evidence aangeleverd — beoordeling vereist
                        {sr.comment ? (
                          <span className="mt-1 block text-blue-900">
                            Vorige opmerking: {sr.comment}
                          </span>
                        ) : null}
                      </p>
                    )
                  }
                  return null
                })()}
                <ReadField
                  label="Review status"
                  value={adminLabel(
                    ADMIN_EVIDENCE_STATUS_LABELS,
                    String(completeness.compliance_review_status || "")
                  )}
                />
                <ReadField
                  label="Compliance gate"
                  value={String(completeness.compliance_status || "—")}
                />
                <ReadField
                  label="Completeness"
                  value={`${completeness.percent ?? 0}%`}
                />
                <ReadField
                  label="Publiceerbaar"
                  value={completeness.publishable ? "JA" : "NEE"}
                />
                {blocked.length ? (
                  <ul className="mt-2 list-disc pl-4 text-xs text-red-800">
                    {blocked.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-emerald-800">
                    Geen publicatieblokkades.
                  </p>
                )}
                <ul className="mt-3 space-y-1 text-xs">
                  {(completeness.documents || []).map((d) => (
                    <li key={d.code || d.name}>
                      {d.name || d.code}:{" "}
                      <Badge variant="outline">
                        {adminLabel(
                          ADMIN_EVIDENCE_STATUS_LABELS,
                          d.status || ""
                        )}
                      </Badge>
                      {d.required ? " (verplicht)" : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] font-semibold uppercase text-wf-500">
                  CE-evidence ({ceEvidence.length})
                </p>
                <EvidenceCards
                  productId={id}
                  items={ceEvidence}
                  empty="Geen CE-evidence."
                  onOpen={openAsset}
                  onSaved={load}
                />
                </SectionSplit>
              </Card>
              <StepNav
                onPrev={() => setStep("media")}
                onNext={() => setStep("translations")}
                nextLabel="Volgende: vertalingen"
              />
            </>
          ) : null}
          {/* MARK_PUBLISH */}
          {activeStep === "translations" ? (
            <>
              <Card>
                <CardTitle>Vertalingen</CardTitle>
                <SectionSplit
                  aside={
                    <SectionReviewAside
                      productId={id}
                      sectionKey="content"
                      review={reviewFor("content")}
                      onSaved={load}
                      hideControls
                      {...sectionNotes({
                        section: "translations",
                        blocked,
                        documents: completeness.documents || [],
                      })}
                    />
                  }
                >
                <CentralTranslationsForm
                  productId={id}
                  product={product as Record<string, unknown>}
                  languages={
                    (data as { catalog_choices?: { languages?: string[] } }).catalog_choices
                      ?.languages || []
                  }
                  onSaved={load}
                />
                <p className="mb-3 text-xs text-wf-600">
                  Lege cellen worden niet weggeschreven, zodat een andere taal behouden blijft.
                </p>
                {(() => {
                  const docs = (completeness.documents || []).filter((d) =>
                    String(d.code || "").startsWith("translation.")
                  )
                  if (!docs.length) {
                    return (
                      <p className="text-xs text-wf-600">
                        Geen vertaalstatus beschikbaar.
                      </p>
                    )
                  }
                  return (
                    <ul className="space-y-2 text-xs">
                      {docs.map((d) => (
                        <li
                          key={d.code}
                          className="flex items-center justify-between gap-2 border-b border-wf-100 py-2"
                        >
                          <span>{d.name}</span>
                          <Badge variant="outline">
                            {adminLabel(
                              ADMIN_EVIDENCE_STATUS_LABELS,
                              d.status || ""
                            )}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )
                })()}
                <Link
                  href="/product-cloud/translations"
                  className="mt-3 inline-block text-xs underline"
                >
                  Open vertalingenbeheer
                </Link>
                </SectionSplit>
              </Card>
              <StepNav
                onPrev={() => setStep("compliance")}
                onNext={() => setStep("publish")}
                nextLabel="Volgende: publiceren"
              />
            </>
          ) : null}
          {activeStep === "publish" ? (
            <>
              <Card>
                <CardTitle>
                  Overige / publicatievereisten {reviewBadge("other")}
                </CardTitle>
                <SectionSplit
                  aside={
                    <SectionReviewAside
                      productId={id}
                      sectionKey="other"
                      review={reviewFor("other")}
                      onSaved={load}
                      missing={[]}
                      failed={blocked}
                    />
                  }
                >
                {blocked.length ? (
                  <ul className="list-disc pl-4 text-xs text-red-800">
                    {blocked.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-emerald-800">
                    Geen extra blokkades buiten de secties.
                  </p>
                )}
                </SectionSplit>
              </Card>
              <Card>
                <CardTitle>Audit / geschiedenis</CardTitle>
                {fieldChanges.length === 0 ? (
                  <p className="text-xs text-wf-600">Geen wijzigingsregels.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {fieldChanges.slice(0, 40).map((c) => (
                      <li key={c.id} className="border-b border-wf-100 py-1.5">
                        {c.field_label || c.field_code}: {c.new_value}
                        {c.reason ? ` — ${c.reason}` : ""} ({c.status})
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-wf-500">
                  Versies: {data.versions?.length ?? 0}
                </p>
              </Card>
              <ProductEndReviewBlock
                productId={id}
                sectionReviews={sectionReviews}
                approvalActions={data.approval_actions}
                publishable={!!data.publishable}
                publicationStatusLabel={adminLabel(
                  ADMIN_PUBLICATION_LABELS,
                  String(product.publication_status || "")
                )}
                adminReviewOutcome={
                  (product as { admin_review_outcome?: string })
                    .admin_review_outcome
                }
                sellerFeedback={
                  (product as { approval_rejection_reason?: string })
                    .approval_rejection_reason
                }
                blockedReasons={blocked}
                onChanged={load}
              />
              <StepNav
                onPrev={() => setStep("translations")}
                onNext={null}
                nextLabel=""
              />
            </>
          ) : null}
        </div>
        <aside className="space-y-4">
          <div className="rounded-md border border-dashed border-wf-500 p-4 text-[11.5px] text-wf-700">
            <p className="mb-2 font-semibold">Admin review</p>
            <p>
              Pas een sectie aan en kies Opslaan. Goed, Aanvulling en Afwijzen
              blijven een aparte beoordeling en keuren het product niet goed.
            </p>
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              window.location.href = "/product-cloud/products"
            }}
          >
            Terug naar overzicht
          </Button>
          <Link
            href="/product-cloud/products/approvals"
            className="block text-center text-xs underline"
          >
            Productgoedkeuringen
          </Link>
        </aside>
      </div>
      {lightbox ? (
        <Lightbox {...lightbox} onClose={() => setLightbox(null)} />
      ) : null}
    </div>
  )
}

function MadeInEuropeBandsEditor({
  productId,
  madeInEurope,
  onSaved,
}: {
  productId: string
  madeInEurope: Record<string, unknown>
  onSaved: () => Promise<void>
}) {
  const score = (madeInEurope.score || null) as {
    is_made_in_europe?: boolean
    score?: number | null
    assembly_points?: number
    parts_points?: number
    materials_points?: number
    max_assembly?: number
    max_parts?: number
    max_materials?: number
    assembly_eu_band?: string
    parts_eu_level?: string
    materials_eu_level?: string
    primary_assembly_country?: string | null
  } | null
  const origin = (madeInEurope.origin || null) as {
    assembly_eu_band?: string | null
    parts_eu_level?: string | null
    materials_eu_level?: string | null
    status?: string | null
    primary_assembly_country?: string | null
  } | null
  const [assembly, setAssembly] = useState(
    () => score?.assembly_eu_band || origin?.assembly_eu_band || ""
  )
  const [parts, setParts] = useState(
    () => score?.parts_eu_level || origin?.parts_eu_level || ""
  )
  const [materials, setMaterials] = useState(
    () => score?.materials_eu_level || origin?.materials_eu_level || ""
  )
  const [country, setCountry] = useState(
    () =>
      score?.primary_assembly_country || origin?.primary_assembly_country || ""
  )
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const calculated = Boolean(score?.is_made_in_europe && score.score != null)
  const bandsKnown = Boolean(score?.assembly_eu_band || origin?.assembly_eu_band)
  const complete = Boolean(assembly && parts && materials)

  return (
    <div className="mt-3 space-y-2 rounded border border-wf-200 bg-wf-50 p-2">
      <p className="text-[11px] font-semibold uppercase text-wf-500">Made in Europe-score</p>
      <p className="text-xs text-wf-900">
        {calculated
          ? `${score?.score} / 100`
          : bandsKnown && score
            ? "Berekend, niet gekwalificeerd"
            : "Niet berekend"}
      </p>
      {score ? (
        <ul className="space-y-0.5 text-[11px] text-wf-700">
          <li>
            Assemblage: {score.assembly_points ?? 0} / {score.max_assembly ?? 75}
          </li>
          <li>
            Onderdelen: {score.parts_points ?? 0} / {score.max_parts ?? 15}
          </li>
          <li>
            Materialen: {score.materials_points ?? 0} / {score.max_materials ?? 10}
          </li>
        </ul>
      ) : (
        <p className="text-[11px] text-wf-600">
          Vul assemblage, onderdelen en materialen in. De score wordt berekend; dit is geen vrij percentage en keurt niets goed.
        </p>
      )}
      <div className="grid gap-2 tablet:grid-cols-3">
        <label className="block text-[11px] font-semibold text-wf-700">
          Assemblage
          <select
            className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs font-normal"
            value={assembly}
            onChange={(e) => setAssembly(e.target.value)}
          >
            <option value="">Kies…</option>
            <option value="eu_100">100% assemblage in EU</option>
            <option value="eu_75_99">75–99% assemblage in EU</option>
            <option value="eu_50_74">50–74% assemblage in EU</option>
            <option value="eu_below_50">Minder dan 50% assemblage in EU</option>
          </select>
        </label>
        <label className="block text-[11px] font-semibold text-wf-700">
          Onderdelen
          <select
            className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs font-normal"
            value={parts}
            onChange={(e) => setParts(e.target.value)}
          >
            <option value="">Kies…</option>
            <option value="eu_majority">Overwegend EU</option>
            <option value="eu_partial">Gedeeltelijk EU</option>
            <option value="eu_none">Niet of nauwelijks EU</option>
          </select>
        </label>
        <label className="block text-[11px] font-semibold text-wf-700">
          Materialen
          <select
            className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs font-normal"
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
          >
            <option value="">Kies…</option>
            <option value="eu_majority">Overwegend EU</option>
            <option value="eu_partial">Gedeeltelijk EU</option>
            <option value="eu_none">Niet of nauwelijks EU</option>
          </select>
        </label>
      </div>
      <label className="block text-[11px] font-semibold text-wf-700">
        Assemblageland (EU-code, optioneel)
        <input
          className="mt-1 h-9 w-full max-w-[8rem] rounded border border-wf-400 bg-white px-2 text-xs font-normal uppercase"
          value={country}
          maxLength={2}
          placeholder="bijv. DE"
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
        />
      </label>
      {!complete ? (
        <p className="text-[11px] text-wf-700">
          Ontbreekt:{" "}
          {[
            !assembly ? "assemblage" : "",
            !parts ? "onderdelen" : "",
            !materials ? "materialen" : "",
          ]
            .filter(Boolean)
            .join(", ")}
          . Zonder die drie gegevens blijft de score Niet berekend.
        </p>
      ) : null}
      {notice ? <p className="text-[11px] text-emerald-800">{notice}</p> : null}
      {error ? <p className="text-[11px] text-amber-800">{error}</p> : null}
      <Button
        size="sm"
        type="button"
        disabled={busy || !complete}
        onClick={() => {
          setBusy(true)
          setNotice(null)
          setError(null)
          void saveAdminMadeInEurope(productId, {
            assembly_eu_band: assembly,
            parts_eu_level: parts,
            materials_eu_level: materials,
            primary_assembly_country: country.trim() || null,
          })
            .then(async () => {
              setNotice(
                "Productiegegevens opgeslagen. Score berekend; bewijs en publicatie zijn niet gewijzigd."
              )
              await onSaved()
            })
            .catch((err: unknown) => {
              setError(
                err instanceof ProductApprovalAdminApiError
                  ? err.message
                  : "Opslaan mislukt."
              )
            })
            .finally(() => setBusy(false))
        }}
      >
        {busy ? "Bezig…" : "Gegevens voor de score opslaan"}
      </Button>
    </div>
  )
}

function EuropeanOwnershipReadout({
  claim,
  onSaved,
}: {
  claim: {
    id?: string
    ownership_band?: string
    ownership_band_label?: string
    source?: string
    status?: string
    source_label?: string
  } | null
  onSaved?: () => Promise<void>
}) {
  const [band, setBand] = useState(claim?.ownership_band || "unknown")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBand(claim?.ownership_band || "unknown")
  }, [claim?.ownership_band, claim?.id])

  return (
    <div className="mt-3 rounded border border-wf-200 bg-white p-2">
      <p className="text-[11px] font-semibold uppercase text-wf-500">
        Europees eigendom van het merk
      </p>
      <p className="mt-1 text-[11px] text-wf-600">
        Dit gaat over het eigendom van de onderneming, niet over het land waar
        het product is gemaakt. Los van Made in Europe-score en bewijs.
      </p>
      {claim?.id ? (
        <>
          <label className="mt-2 block text-[11px] font-semibold text-wf-700">
            Europees eigendom van het merk
            <select
              className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs font-normal"
              value={band}
              onChange={(e) => setBand(e.target.value)}
            >
              <option value="eu_0">0%</option>
              <option value="eu_1_25">1–25%</option>
              <option value="eu_26_50">26–50%</option>
              <option value="eu_51_75">51–75%</option>
              <option value="eu_76_99">76–99%</option>
              <option value="eu_100">100%</option>
              <option value="unknown">Niet bekend</option>
            </select>
          </label>
          <p className="mt-1 text-[11px] text-wf-600">
            Status: {claim.status || "—"}
            {claim.source_label ? ` · Bron: ${claim.source_label}` : ""}
          </p>
          {notice ? (
            <p className="mt-1 text-[11px] text-emerald-800">{notice}</p>
          ) : null}
          {error ? (
            <p className="mt-1 text-[11px] text-amber-800">{error}</p>
          ) : null}
          <Button
            size="sm"
            type="button"
            className="mt-2"
            disabled={busy || band === claim.ownership_band}
            onClick={() => {
              setBusy(true)
              setNotice(null)
              setError(null)
              void updateEuropeanOwnershipBand(claim.id!, {
                ownership_band: band,
              })
                .then(async () => {
                  setNotice("Eigendomsband opgeslagen.")
                  await onSaved?.()
                })
                .catch((err: unknown) => {
                  setError(
                    err instanceof EuropeanOwnershipAdminApiError
                      ? err.message
                      : "Opslaan mislukt."
                  )
                })
                .finally(() => setBusy(false))
            }}
          >
            {busy ? "Bezig…" : "Eigendom opslaan"}
          </Button>
        </>
      ) : (
        <p className="mt-1 text-xs text-wf-900">
          {claim?.ownership_band_label || "Niet vastgelegd"}
          {claim?.status ? ` — ${claim.status}` : ""}
        </p>
      )}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-wf-300 bg-white p-3">{children}</div>
  )
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-wf-900">
      {children}
    </h2>
  )
}
function ReadField({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="mb-2">
      <label className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
        {label}
      </label>
      <div className="rounded-[5px] border border-wf-200 bg-wf-50 px-3 py-2 text-xs text-wf-800">
        {value}
      </div>
    </div>
  )
}
function StepNav({
  onPrev,
  onNext,
  nextLabel,
}: {
  onPrev: (() => void) | null
  onNext: (() => void) | null
  nextLabel: string
}) {
  return (
    <div className="flex flex-wrap gap-2 border-t border-wf-200 pt-3">
      {onPrev ? (
        <Button size="sm" variant="secondary" onClick={onPrev}>
          Vorige
        </Button>
      ) : null}
      {onNext ? (
        <Button size="sm" variant="secondary" onClick={onNext}>
          {nextLabel}
        </Button>
      ) : null}
    </div>
  )
}
function Lightbox(props: {
  url: string
  kind: "image" | "pdf" | "other"
  title: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal
      onClick={props.onClose}
    >
      <div
        className="max-h-[90vh] max-w-[95vw] rounded-lg bg-white p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex justify-between gap-3 text-[11px]">
          <p className="truncate font-semibold">{props.title}</p>
          <div className="flex gap-2">
            <a
              href={props.url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Nieuw tabblad
            </a>
            <button type="button" className="underline" onClick={props.onClose}>
              Sluiten
            </button>
          </div>
        </div>
        {props.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.url}
            alt={props.title}
            className="max-h-[80vh] max-w-[90vw] object-contain"
          />
        ) : props.kind === "pdf" ? (
          <iframe
            src={props.url}
            title={props.title}
            className="h-[80vh] w-[min(90vw,900px)] border"
          />
        ) : (
          <a
            href={props.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline"
          >
            Open of download
          </a>
        )}
      </div>
    </div>
  )
}

function EvidenceCards({
  productId,
  items,
  empty,
  onOpen,
  onSaved,
}: {
  productId: string
  items: Array<Record<string, unknown>>
  empty: string
  onOpen: (
    url: string | null,
    kind: "image" | "pdf" | "other",
    title: string
  ) => void
  onSaved: () => Promise<void>
}) {
  if (!items.length) return <p className="text-xs text-wf-600">{empty}</p>
  return (
    <ul className="mt-2 space-y-3">
      {items.map((row) => {
        const e = row as {
          id?: string
          evidence_kind?: string
          document_type?: string
          verification_status?: string
          file_name?: string
          mime_type?: string
          storage_reference?: string
          verification_notes?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        const url = displayMediaUrl(e.storage_reference)
        const pdf = isLikelyPdf({
          mime: e.mime_type,
          ref: e.storage_reference,
          fileName: e.file_name,
          documentType: e.document_type,
        })
        const isImage =
          !pdf &&
          (e.document_type === "photo" ||
            String(e.mime_type || "").startsWith("image/"))
        const title = e.file_name || e.document_type || "Evidence"
        return (
          <EvidenceReviewCard
            key={e.id || e.storage_reference || title}
            productId={productId}
            row={e}
            title={title}
            url={url}
            pdf={pdf}
            isImage={isImage}
            onOpen={onOpen}
            onSaved={onSaved}
          />
        )
      })}
    </ul>
  )
}

function EvidenceReviewCard({
  productId,
  row,
  title,
  url,
  pdf,
  isImage,
  onOpen,
  onSaved,
}: {
  productId: string
  row: {
    id?: string
    evidence_kind?: string
    document_type?: string
    verification_status?: string
    file_name?: string
    storage_reference?: string
    verification_notes?: string
    verified_at?: string | null
    verified_by?: string | null
  }
  title: string
  url: string | null
  pdf: boolean
  isImage: boolean
  onOpen: (url: string | null, kind: "image" | "pdf" | "other", title: string) => void
  onSaved: () => Promise<void>
}) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const e = row

  async function decide(status: "approved" | "rejected" | "needs_info") {
    if (!e.id) return
    if (status === "rejected" && !note.trim()) {
      setError("Bij afwijzen is een reden verplicht.")
      return
    }
    if (status === "needs_info" && !note.trim()) {
      setError("Bij aanvullend bewijs is een toelichting verplicht.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await reviewComplianceEvidence(productId, e.id, {
        status,
        reason: status === "approved" ? undefined : note.trim(),
      })
      setNote("")
      await onSaved()
    } catch (err) {
      setError(
        err instanceof ComplianceAdminApiError ? err.message : "Beoordelen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded border border-wf-200 bg-wf-50 p-3 text-xs">
            <div className="flex flex-wrap gap-3">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded border bg-white text-[10px] font-bold">
                {isImage && url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full cursor-pointer object-contain"
                    onClick={() => onOpen(url, "image", title)}
                  />
                ) : (
                  <span>{pdf ? "PDF" : "DOC"}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <ReadField
                  label="Type"
                  value={e.document_type || e.evidence_kind || "—"}
                />
                <ReadField
                  label="Status"
                  value={adminLabel(
                    ADMIN_EVIDENCE_STATUS_LABELS,
                    e.verification_status || ""
                  )}
                />
                <ReadField label="Bestand" value={e.file_name || e.id || "—"} />
                <ReadField label="Beoordeeld" value={e.verified_at ? new Date(e.verified_at).toLocaleString("nl-NL") : "—"} />
                <ReadField label="Beoordelaar" value={e.verified_by || "—"} />
                {e.verification_notes ? (
                  <p className="text-[11px] text-wf-600">{e.verification_notes}</p>
                ) : null}
                {url ? (
                  <div className="flex gap-3 pt-1 font-semibold">
                    <button
                      type="button"
                      className="underline"
                      onClick={() =>
                        onOpen(
                          url,
                          pdf ? "pdf" : isImage ? "image" : "other",
                          title
                        )
                      }
                    >
                      {pdf ? "Open document" : "Bekijken"}
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Nieuw tabblad
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-800">
                    Geen storage_reference — niet te openen.
                  </p>
                )}
                <label className="mt-2 block text-[11px] font-semibold text-wf-700">
                  Reden of toelichting
                  <input
                    className="mt-1 h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
                {error ? <p className="text-[11px] text-red-800">{error}</p> : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" disabled={busy || !e.id} onClick={() => void decide("approved")}>
                    Goedkeuren
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy || !e.id} onClick={() => void decide("rejected")}>
                    Afkeuren
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy || !e.id} onClick={() => void decide("needs_info")}>
                    Aanvullend bewijs
                  </Button>
                </div>
              </div>
            </div>
    </li>
  )
}
