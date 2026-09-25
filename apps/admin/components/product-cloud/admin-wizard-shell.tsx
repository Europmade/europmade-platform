"use client"

import Link from "next/link"
import { Badge, Button } from "@europmade/ui"
import type {
  AdminProductDetail,
  SectionReviewKey,
} from "../../lib/product-approval-admin-api"
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
  SectionReviewControls,
  sectionReviewStatusLabel,
} from "./product-review-panel"
import { AdminProductManagerCard } from "./admin-product-manager-card"
import { AdminSectionProposalReviews } from "./admin-section-proposal-reviews"
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
  { key: "offer", short: "Verkoop", label: "Verkoopinformatie" },
  { key: "shipping", short: "Voorraad", label: "Voorraad & verzending" },
  { key: "media", short: "Media", label: "Media" },
  { key: "compliance", short: "Compliance", label: "Compliance" },
  { key: "translations", short: "Vertalingen", label: "Vertalingen" },
  { key: "publish", short: "Publiceren", label: "Publiceren" },
]

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
  const schema = (product.schema || []) as Array<{
    id: string
    code?: string | null
    name: string
    requirement_tier?: string
    value?: string | null
  }>
  const offer = (product.offer || null) as Record<string, unknown> | null
  const offers = (product.offers || null) as Record<string, unknown> | null
  const shipping = (product.shipping_profile || null) as Record<
    string,
    unknown
  > | null
  const documents = (product.documents || []) as Array<{
    id?: string
    document_type?: string
    storage_reference?: string
  }>
  const claims = data.claims || []
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
  const stepIdx = ADMIN_WIZARD_STEPS.findIndex((s) => s.key === step)
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
  const money = (v: unknown) => {
    if (v == null || v === "") return "—"
    const n = Number(v)
    if (Number.isNaN(n)) return String(v)
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(n)
  }
  const schemaByTier: Record<string, typeof schema> = {}
  for (const f of schema) {
    const tier = f.requirement_tier || "optional"
    if (!schemaByTier[tier]) schemaByTier[tier] = []
    schemaByTier[tier].push(f)
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
        {product.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayMediaUrl(String(product.primary_image_url)) ?? ""}
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
          </div>
          <p className="mt-2 text-[11px] text-wf-600">
            {completeness.publishable ? "Publiceerbaar" : "Niet publiceerbaar"}{" "}
            · Info: {completeness.percent ?? 0}% · Compliance:{" "}
            {adminLabel(
              ADMIN_EVIDENCE_STATUS_LABELS,
              String(completeness.compliance_review_status || "")
            )}
          </p>
          {blocked[0] ? (
            <p className="mt-1 text-[11px] text-red-800">{blocked[0]}</p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-xs text-amber-800">{error}</p>
      ) : null}

      <div className="mb-5">
        <div className="mb-2 flex justify-between text-[11px]">
          <span className="font-semibold uppercase tracking-wide text-wf-500">
            Productflow (read-only review)
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
                s.key === step
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
          {step === "information" ? (
            <>
              <Card>
                <CardTitle>
                  Basisinformatie {reviewBadge("product_info")}
                </CardTitle>
                <ReadField label="Productnaam" value={title} />
                <AdminSectionProposalReviews
                  proposals={changeProposals}
                  fields={["title"]}
                  highlightId={highlightProposalId}
                  onDecided={load}
                />
                <ReadField
                  label="EAN / GTIN"
                  value={product.identifier_value || "—"}
                />
                <ReadField label="Merk" value={product.brand_name || "—"} />
                <AdminSectionProposalReviews
                  proposals={changeProposals}
                  fields={["brand_id"]}
                  highlightId={highlightProposalId}
                  onDecided={load}
                />
                <ReadField
                  label="Fabrikant"
                  value={
                    (product.manufacturer_id as string | undefined) || "—"
                  }
                />
                <AdminSectionProposalReviews
                  proposals={changeProposals}
                  fields={["manufacturer_id"]}
                  highlightId={highlightProposalId}
                  onDecided={load}
                />
                <ReadField
                  label="Categorie"
                  value={(product.category_names || []).join(", ") || "—"}
                />
                <SectionReviewControls
                  productId={id}
                  sectionKey="product_info"
                  review={reviewFor("product_info")}
                  onSaved={load}
                />
              </Card>
              <Card>
                <CardTitle>Beschrijving {reviewBadge("content")}</CardTitle>
                <p className="whitespace-pre-wrap text-xs text-wf-800">
                  {product.description || "—"}
                </p>
                <AdminSectionProposalReviews
                  proposals={changeProposals}
                  fields={["description"]}
                  highlightId={highlightProposalId}
                  onDecided={load}
                />
                <SectionReviewControls
                  productId={id}
                  sectionKey="content"
                  review={reviewFor("content")}
                  onSaved={load}
                />
              </Card>
              {(
                [
                  ["category_required", "Verplichte informatie"],
                  ["recommended", "Aanbevolen informatie"],
                  ["optional", "Optionele informatie"],
                ] as const
              ).map(([tier, label]) => {
                const fields = (schemaByTier[tier] || []).filter(
                  (f) => f.code !== "collects_data" && f.code !== "ce_marking"
                )
                if (!fields.length) return null
                return (
                  <Card key={tier}>
                    <CardTitle>{label}</CardTitle>
                    <div className="grid gap-2 tablet:grid-cols-2">
                      {fields.map((f) => (
                        <ReadField
                          key={f.id}
                          label={f.name}
                          value={f.value?.trim() || "—"}
                        />
                      ))}
                    </div>
                  </Card>
                )
              })}
              <AdminSectionProposalReviews
                proposals={changeProposals}
                fields={["attribute"]}
                highlightId={highlightProposalId}
                onDecided={load}
              />
              <Card>
                <CardTitle>Seller (commercieel) {reviewBadge("seller")}</CardTitle>
                <ReadField label="Bedrijfsnaam" value={data.seller_name || "—"} />
                <ReadField
                  label="Seller ID"
                  value={
                    data.seller_id ? (
                      <Link
                        href={`/partners/${data.seller_id}`}
                        className="font-mono text-[11px] underline"
                      >
                        {data.seller_id}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <ReadField
                  label="Onboarding"
                  value={data.seller_onboarding_status || "—"}
                />
                <ReadField
                  label="Verificatie"
                  value={data.seller_verification_status || "—"}
                />
                <ReadField
                  label="Seller MiE (Laag 1)"
                  value={data.seller_made_in_europe_status || "—"}
                />
                <SectionReviewControls
                  productId={id}
                  sectionKey="seller"
                  review={reviewFor("seller")}
                  onSaved={load}
                />
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
                onNext={() => setStep("offer")}
                nextLabel="Volgende: verkoopinformatie"
              />
            </>
          ) : null}
          {/* MARK_MORE_STEPS */}
          {step === "offer" ? (
            <>
              <Card>
                <CardTitle>Verkoopinformatie</CardTitle>
                <ReadField
                  label="Aanbod aanwezig"
                  value={offer?.has_offer ? "Ja" : "Nee"}
                />
                <ReadField
                  label="Prijs"
                  value={money(offer?.price ?? offers?.price)}
                />
                <ReadField label="Promo" value={money(offer?.promo_price)} />
                <ReadField
                  label="Effectieve prijs"
                  value={money(offer?.effective_unit_price)}
                />
                <ReadField
                  label="Verzendkosten"
                  value={money(offer?.shipping_cost)}
                />
                <ReadField
                  label="Regio"
                  value={String(offer?.region_code || "—")}
                />
                <ReadField
                  label="Seller SKU"
                  value={String(offer?.seller_sku || product.sku_hint || "—")}
                />
                <ReadField
                  label="Verkoopstatus"
                  value={String(
                    offer?.sales_status || offers?.sales_status || "—"
                  )}
                />
                <ReadField
                  label="Aantal offers"
                  value={String(offers?.offer_count ?? "—")}
                />
              </Card>
              <StepNav
                onPrev={() => setStep("information")}
                onNext={() => setStep("shipping")}
                nextLabel="Volgende: voorraad & verzending"
              />
            </>
          ) : null}
          {step === "shipping" ? (
            <>
              <Card>
                <CardTitle>Voorraad & verzending</CardTitle>
                <ReadField
                  label="Voorraad"
                  value={String(
                    offer?.stock ??
                      offer?.quantity_available ??
                      offers?.stock_total ??
                      "—"
                  )}
                />
                <ReadField
                  label="Max. levertijd (dagen)"
                  value={String(
                    offer?.delivery_days_max ??
                      offers?.delivery_days_max ??
                      "—"
                  )}
                />
                <ReadField
                  label="Verzendprofiel"
                  value={
                    shipping
                      ? `${String(shipping.name || shipping.id)} (${String(shipping.status || "")})`
                      : product.shipping_profile_id
                        ? String(product.shipping_profile_id)
                        : "Niet gekoppeld"
                  }
                />
                <ReadField
                  label="Actieve landen"
                  value={String(shipping?.active_country_count ?? "—")}
                />
                <ReadField
                  label="Min. verzendkosten"
                  value={money(shipping?.min_shipping_cost)}
                />
              </Card>
              <StepNav
                onPrev={() => setStep("offer")}
                onNext={() => setStep("media")}
                nextLabel="Volgende: media"
              />
            </>
          ) : null}
          {/* MARK_MEDIA */}
          {step === "media" ? (
            <>
              <Card>
                <CardTitle>Media {reviewBadge("media")}</CardTitle>
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
                <SectionReviewControls
                  productId={id}
                  sectionKey="media"
                  review={reviewFor("media")}
                  onSaved={load}
                />
              </Card>
              <StepNav
                onPrev={() => setStep("shipping")}
                onNext={() => setStep("compliance")}
                nextLabel="Volgende: compliance"
              />
            </>
          ) : null}
          {/* MARK_COMPLIANCE */}
          {step === "compliance" ? (
            <>
              <Card>
                <CardTitle>
                  Made in Europe {reviewBadge("made_in_europe")}
                </CardTitle>
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
                <p className="mt-3 text-[11px] font-semibold uppercase text-wf-500">
                  Evidence ({mieEvidence.length})
                </p>
                <EvidenceCards
                  items={mieEvidence}
                  empty="Geen Made in Europe-evidence."
                  onOpen={openAsset}
                />
                <SectionReviewControls
                  productId={id}
                  sectionKey="made_in_europe"
                  review={reviewFor("made_in_europe")}
                  onSaved={load}
                />
              </Card>
              <Card>
                <CardTitle>
                  CE / Compliance {reviewBadge("ce_compliance")}
                </CardTitle>
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
                  items={ceEvidence}
                  empty="Geen CE-evidence."
                  onOpen={openAsset}
                />
                <SectionReviewControls
                  productId={id}
                  sectionKey="ce_compliance"
                  review={reviewFor("ce_compliance")}
                  onSaved={load}
                />
              </Card>
              <Card>
                <CardTitle>Claims {reviewBadge("claims")}</CardTitle>
                {claims.length === 0 ? (
                  <p className="text-xs text-wf-600">Geen claims.</p>
                ) : (
                  claims.map((c) => (
                    <div
                      key={String(c.id)}
                      className="mb-2 border-b border-wf-100 pb-2 text-xs"
                    >
                      <ReadField
                        label="Status"
                        value={String(c.status || "—")}
                      />
                      <ReadField label="ID" value={String(c.id || "—")} />
                    </div>
                  ))
                )}
                <SectionReviewControls
                  productId={id}
                  sectionKey="claims"
                  review={reviewFor("claims")}
                  onSaved={load}
                />
              </Card>
              <StepNav
                onPrev={() => setStep("media")}
                onNext={() => setStep("translations")}
                nextLabel="Volgende: vertalingen"
              />
            </>
          ) : null}
          {/* MARK_PUBLISH */}
          {step === "translations" ? (
            <>
              <Card>
                <CardTitle>Vertalingen</CardTitle>
                <p className="mb-3 text-xs text-wf-600">
                  Read-only overzicht van verplichte doeltaal-vertalingen
                  (titel + omschrijving). Sellers beheren dit in de
                  productflow; admin kan details openen via Vertalingen.
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
              </Card>
              <StepNav
                onPrev={() => setStep("compliance")}
                onNext={() => setStep("publish")}
                nextLabel="Volgende: publiceren"
              />
            </>
          ) : null}
          {step === "publish" ? (
            <>
              <Card>
                <CardTitle>
                  Overige / publicatievereisten {reviewBadge("other")}
                </CardTitle>
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
                <SectionReviewControls
                  productId={id}
                  sectionKey="other"
                  review={reviewFor("other")}
                  onSaved={load}
                />
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
              Zelfde productflow als de seller. Data is read-only; beoordeel
              onder elke sectie. Media/evidence openen via Bekijken.
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
  items,
  empty,
  onOpen,
}: {
  items: Array<Record<string, unknown>>
  empty: string
  onOpen: (
    url: string | null,
    kind: "image" | "pdf" | "other",
    title: string
  ) => void
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
          <li
            key={e.id || e.storage_reference || title}
            className="rounded border border-wf-200 bg-wf-50 p-3 text-xs"
          >
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
                {e.verification_notes ? (
                  <p className="text-[11px] text-wf-600">
                    {e.verification_notes}
                  </p>
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
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
