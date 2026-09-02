"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import {
  ProductApprovalAdminApiError,
  decideProductApproval,
  getAdminProduct,
  type AdminProductDetail,
} from "../../../../../lib/product-approval-admin-api"
import { displayMediaUrl } from "../../../../../lib/media-url"

type ConfirmMode = null | "approve" | "reject"

/**
 * Admin Product Review Center (P2.20).
 * Approval: only approved/rejected via existing backend workflow.
 * Request-info for products DOES NOT EXIST — shown explicitly.
 */
export default function AdminProductDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [data, setData] = useState<AdminProductDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmMode>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await getAdminProduct(id)
      setData(res)
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Product laden mislukt."
      )
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function executeDecision(decision: "approved" | "rejected") {
    if (decision === "rejected" && !reason.trim()) {
      setError("Reden is verplicht bij afwijzen.")
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await decideProductApproval(id, {
        decision,
        reason: reason.trim() || undefined,
      })
      setConfirm(null)
      setReason("")
      setSuccess(
        decision === "approved"
          ? "Product goedgekeurd en gepubliceerd."
          : "Product afgewezen (terug naar Concept)."
      )
      await load()
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Beslissing mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-wf-600">Laden…</p>
  }

  if (!data) {
    return (
      <Notice variant="warning">{error ?? "Product niet gevonden."}</Notice>
    )
  }

  const product = data.product
  const completeness = (product.completeness || {}) as NonNullable<
    typeof product.completeness
  >
  const blocked = completeness.publication_blocked_reasons || []
  const actions = data.approval_actions
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
  }>
  const claims = data.claims || []
  const evidence = data.evidence || []
  const fieldChanges = (product.field_changes || []) as Array<{
    id?: string
    field_label?: string
    field_code?: string
    new_value?: string
    status?: string
  }>
  const price =
    product.regular_customer_price != null
      ? new Intl.NumberFormat("nl-NL", {
          style: "currency",
          currency: "EUR",
        }).format(Number(product.regular_customer_price))
      : "—"

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Producten &gt;{" "}
        <Link href="/product-cloud/products" className="text-wf-700 underline">
          Product Management
        </Link>{" "}
        &gt; <b className="font-semibold text-wf-800">{title}</b>
      </p>

      <div className="mb-5 rounded-lg border border-wf-300 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-wf-900">{title}</h1>
            <p className="mt-1 font-mono text-[11px] text-wf-500">{id}</p>
            <p className="mt-1 text-xs text-wf-600">
              {product.brand_name || "—"} ·{" "}
              {(product.category_names || []).join(", ") || "geen categorie"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatusPill
              label="Publicatie"
              value={String(product.publication_status || "—")}
              solid={product.publication_status === "In review"}
            />
            <StatusPill
              label="Lifecycle"
              value={String(product.lifecycle_status || "—")}
            />
            <StatusPill
              label="Workflow"
              value={String(product.workflow_status || "—")}
            />
          </div>
        </div>
      </div>

      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}
      {success ? (
        <Notice variant="info" className="mb-4">
          {success}
        </Notice>
      ) : null}

      {confirm === "approve" ? (
        <Notice variant="warning" className="mb-4">
          <p className="mb-2 font-semibold">Product goedkeuren?</p>
          <p className="mb-1 text-xs">
            <strong>{title}</strong>
          </p>
          <p className="mb-1 text-xs">
            Seller: {data.seller_name || data.seller_id || "—"}
          </p>
          <p className="mb-3 text-xs">
            Huidige status: {String(product.publication_status)} · Publiceerbaar:{" "}
            {data.publishable ? "ja" : "nee"}
          </p>
          {!data.publishable ? (
            <p className="mb-3 text-xs text-red-800">
              Backend blokkeert goedkeuring tot completeness/compliance klaar is.
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy || !data.publishable}
              onClick={() => void executeDecision("approved")}
            >
              {busy ? "Bezig…" : "Bevestig goedkeuring"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setConfirm(null)}
            >
              Annuleren
            </Button>
          </div>
        </Notice>
      ) : null}

      {confirm === "reject" ? (
        <Notice variant="warning" className="mb-4">
          <p className="mb-2 font-semibold">Product afwijzen?</p>
          <p className="mb-3 text-xs">
            <strong>{title}</strong> — status wordt Concept. Reden verplicht.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reden voor afwijzing…"
            className="mb-3 min-h-[80px] w-full rounded border border-wf-400 px-3 py-2 text-xs"
            required
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || !reason.trim()}
              onClick={() => void executeDecision("rejected")}
            >
              {busy ? "Bezig…" : "Bevestig afwijzing"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setConfirm(null)}
            >
              Annuleren
            </Button>
          </div>
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 gap-5 tablet:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          <Section title="A. Product">
            <Row label="Productnaam" value={title} />
            <Row label="SKU" value={product.sku_hint || "—"} />
            <Row label="EAN/GTIN" value={product.identifier_value || "—"} />
            <Row
              label="Categorie"
              value={(product.category_names || []).join(", ") || "—"}
            />
            <Row label="Merk" value={product.brand_name || "—"} />
            <Row label="Prijs (indicatief)" value={price} />
            <Row
              label="Lifecycle"
              value={String(product.lifecycle_status || "—")}
            />
            <Row
              label="Publicatie"
              value={String(product.publication_status || "—")}
            />
            <div className="mt-3 border-t border-wf-100 pt-3">
              <p className="mb-1 text-[11px] font-semibold text-wf-500">
                Omschrijving
              </p>
              <p className="whitespace-pre-wrap text-xs text-wf-800">
                {product.description || "—"}
              </p>
            </div>
          </Section>

          <Section title="B. Seller">
            <Row label="Bedrijfsnaam" value={data.seller_name || "—"} />
            <Row
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
            <Row
              label="Onboarding status"
              value={data.seller_onboarding_status || "—"}
            />
            <Row
              label="Bedrijfsverificatie"
              value={data.seller_verification_status || "—"}
            />
            <Row
              label="Seller MiE (Laag 1)"
              value={data.seller_made_in_europe_status || "—"}
            />
            {data.seller_id ? (
              <p className="mt-3 text-xs">
                <Link
                  href={`/partners/${data.seller_id}`}
                  className="underline"
                >
                  Open Seller Review Center
                </Link>
              </p>
            ) : null}
          </Section>

          <Section title="C. Media">
            {media.length === 0 ? (
              <p className="text-xs text-wf-600">Geen media aanwezig.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3">
                {media.map((m) => (
                  <div
                    key={m.id || m.storage_reference}
                    className="rounded border border-wf-200 p-2"
                  >
                    {displayMediaUrl(m.storage_reference) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displayMediaUrl(m.storage_reference) ?? ""}
                        alt={m.media_type || "media"}
                        className="mb-2 h-24 w-full rounded object-cover"
                      />
                    ) : (
                      <div className="mb-2 flex h-24 items-center justify-center rounded bg-wf-100 text-[10px] text-wf-500">
                        Preview n.v.t.
                      </div>
                    )}
                    <p className="text-[10px] text-wf-600">
                      {m.media_type || "media"}
                    </p>
                    <p className="truncate font-mono text-[9px] text-wf-500">
                      {m.storage_reference || m.id}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {product.primary_image_url ? (
              <div className="mt-3">
                <p className="mb-1 text-[11px] text-wf-500">Primaire afbeelding</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayMediaUrl(product.primary_image_url) ?? ""}
                  alt=""
                  className="h-32 rounded object-cover"
                />
              </div>
            ) : null}
          </Section>

          <Section title="D. Made in Europe">
            <Row
              label="Documentstatus"
              value={
                completeness.documents?.find(
                  (d) => d.code === "doc.made_in_europe"
                )?.status ||
                data.product.made_in_europe_status ||
                "—"
              }
            />
            <Row
              label="Origin status"
              value={
                origin
                  ? String(origin.status || origin.verification_status || "—")
                  : "Niet aanwezig"
              }
            />
            <Row
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
              Evidence ({evidence.length})
            </p>
            {evidence.length === 0 ? (
              <p className="text-xs text-wf-600">Geen evidence-rijen.</p>
            ) : (
              evidence.slice(0, 12).map((row) => {
                const e = row as {
                  id?: string
                  evidence_kind?: string
                  document_type?: string
                  verification_status?: string
                  file_name?: string
                  verification_notes?: string
                }
                return (
                  <div
                    key={e.id}
                    className="mt-2 border-b border-wf-100 pb-2 text-xs last:border-0"
                  >
                    <Row
                      label="Type"
                      value={e.document_type || e.evidence_kind || "—"}
                    />
                    <Row
                      label="Status"
                      value={e.verification_status || "—"}
                    />
                    <Row label="Bestand" value={e.file_name || e.id || "—"} />
                    {e.verification_notes ? (
                      <Row label="Opmerking" value={e.verification_notes} />
                    ) : null}
                  </div>
                )
              })
            )}
            <p className="mt-3 text-xs">
              <Link href="/product-cloud/compliance" className="underline">
                Naar compliance evidence review
              </Link>
            </p>
          </Section>

          <Section title="E. Product compliance">
            <Row
              label="Review status"
              value={String(completeness.compliance_review_status || "—")}
            />
            <Row
              label="Compliance gate"
              value={String(completeness.compliance_status || "—")}
            />
            <Row
              label="Completeness"
              value={`${completeness.percent ?? 0}%`}
            />
            <Row
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
                  {d.name || d.code}: <Badge variant="outline">{d.status || "—"}</Badge>
                  {d.required ? " (verplicht)" : ""}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="F. Claims">
            {claims.length === 0 ? (
              <p className="text-xs text-wf-600">Geen claims voor dit product.</p>
            ) : (
              claims.map((c) => (
                <div
                  key={String(c.id)}
                  className="mb-2 border-b border-wf-100 pb-2 text-xs last:border-0"
                >
                  <Row label="Status" value={String(c.status || "—")} />
                  <Row label="ID" value={String(c.id || "—")} />
                  {c.decision_reason ? (
                    <Row
                      label="Reden"
                      value={String(c.decision_reason)}
                    />
                  ) : null}
                </div>
              ))
            )}
          </Section>

          <Section title="G. Vertalingen">
            <p className="text-xs text-wf-600">
              Vertalingen worden beheerd via Product Cloud Vertalingen.
            </p>
            <Link
              href="/product-cloud/translations"
              className="mt-2 inline-block text-xs underline"
            >
              Open vertalingen
            </Link>
          </Section>

          <Section title="H. Approval">
            <Row
              label="Publicatiestatus"
              value={String(product.publication_status || "—")}
            />
            <Row
              label="Approval status"
              value={String(
                (product as { approval_status?: string }).approval_status || "—"
              )}
            />
            {(product as { approval_rejection_reason?: string })
              .approval_rejection_reason ? (
              <Row
                label="Afwijzingsreden"
                value={String(
                  (product as { approval_rejection_reason?: string })
                    .approval_rejection_reason
                )}
              />
            ) : null}
            <Notice variant="warning" className="mt-3">
              <p className="text-xs">
                <strong>Aanvullende informatie opvragen</strong> bestaat niet
                voor productgoedkeuring. De backend ondersteunt alleen{" "}
                <code>approved</code> / <code>rejected</code>.{" "}
                {actions.request_info_reason}
              </p>
            </Notice>
          </Section>

          <Section title="I. Audit / geschiedenis">
            <p className="mb-2 text-[11px] text-wf-500">
              Product field changes (geen platform audit_log voor
              product-approval).
            </p>
            {fieldChanges.length === 0 ? (
              <p className="text-xs text-wf-600">Geen wijzigingsregels.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {fieldChanges.slice(0, 25).map((c) => (
                  <li key={c.id} className="border-b border-wf-100 py-1.5">
                    {c.field_label || c.field_code}: {c.new_value} ({c.status})
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-wf-500">
              Versies: {data.versions?.length ?? 0}
            </p>
          </Section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border border-dashed border-wf-500 p-4 text-[11.5px] leading-relaxed text-wf-700">
            <p className="mb-2 font-semibold">Wat moet ik doen?</p>
            {actions.approve ? (
              <p>
                Dit product staat <strong>In review</strong>. Controleer
                productinfo, media, MiE en compliance. Daarna goedkeuren of
                afwijzen.
              </p>
            ) : (
              <p>
                Geen approval-actie beschikbaar (publicatiestatus:{" "}
                {String(product.publication_status || "—")}). Goedkeuren/
                afwijzen alleen bij status &quot;In review&quot;.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-wf-200 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              Acties
            </p>
            {actions.approve ? (
              <div className="flex flex-col gap-2">
                <Button
                  disabled={busy || confirm !== null}
                  onClick={() => setConfirm("approve")}
                >
                  Goedkeuren
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy || confirm !== null}
                  onClick={() => setConfirm("reject")}
                >
                  Afwijzen
                </Button>
                <Button variant="secondary" disabled title={actions.request_info_reason}>
                  Informatie opvragen (niet beschikbaar)
                </Button>
              </div>
            ) : (
              <p className="text-xs text-wf-600">
                Geen muterende approval-acties voor deze status.
              </p>
            )}
            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={() => {
                window.location.href = "/product-cloud/products"
              }}
            >
              Terug naar overzicht
            </Button>
            <Link
              href="/product-cloud/products/approvals"
              className="mt-2 block text-center text-xs underline"
            >
              Naar approval queue
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-wf-200 bg-white p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-wf-100 py-2 text-[12.5px] last:border-0">
      <span className="text-wf-600">{label}</span>
      <span className="max-w-[60%] text-right text-wf-800">{value}</span>
    </div>
  )
}

function StatusPill({
  label,
  value,
  solid,
}: {
  label: string
  value: string
  solid?: boolean
}) {
  return (
    <div className="text-center">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-wf-500">
        {label}
      </div>
      <Badge variant={solid ? "solid" : "outline"}>{value}</Badge>
    </div>
  )
}
