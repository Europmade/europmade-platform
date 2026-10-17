"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { AdCampaignLandingPreview, Badge, Button, Notice } from "@europmade/ui"
import { resolveMediaUrl } from "@europmade/utils"
import {
  AdvertisingAdminApiError,
  getAdCampaign,
  patchAdCampaign,
  type AdCampaignDto,
} from "../../../../../lib/advertising-admin-api"
import { adminMarketLabel } from "../../../../../lib/market-labels"
import { medusaBackendUrl } from "../../../../../lib/medusa-backend-url"
import {
  AD_STATUS_COLORS,
  AD_STATUS_LABELS,
  ctaLabel,
  designLabel,
  displayOrNa,
  formatAdDate,
  formatAdDateTime,
  placementLabel,
} from "../../../../../lib/advertising-labels"

const STOREFRONT =
  process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000"

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border bg-white p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
        {title}
      </h2>
      {children}
    </section>
  )
}

function browserMedia(raw: string | null | undefined): string | null {
  return resolveMediaUrl(raw, medusaBackendUrl())
}

function destinationHref(path: string | null | undefined): string | null {
  if (!path || !path.trim()) return null
  if (/^https?:\/\//i.test(path)) return path
  const base = STOREFRONT.replace(/\/$/, "")
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export default function AdminAdvertisingCampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : ""

  const [campaign, setCampaign] = useState<AdCampaignDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [noteDraft, setNoteDraft] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await getAdCampaign(id)
      setCampaign(res.campaign)
      setNoteDraft(res.campaign.admin_note ?? "")
      setRejectReason(res.campaign.admin_note ?? "")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Campagne laden mislukt")
      setCampaign(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function runPatch(
    patch: { status?: string; admin_note?: string },
    okMsg: string
  ) {
    if (!id) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await patchAdCampaign(id, patch)
      setCampaign(res.campaign)
      setNoteDraft(res.campaign.admin_note ?? "")
      setRejectReason(res.campaign.admin_note ?? "")
      setSuccess(okMsg)
      setShowRejectForm(false)
    } catch (e) {
      setError(
        e instanceof AdvertisingAdminApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Actie mislukt"
      )
    } finally {
      setBusy(false)
    }
  }

  async function onApprove() {
    await runPatch({ status: "approved" }, "Campagne goedgekeurd.")
  }

  async function onReject() {
    const reason = rejectReason.trim()
    if (!reason) {
      setError("Een afwijzingsreden is verplicht.")
      return
    }
    await runPatch(
      { status: "rejected", admin_note: reason },
      "Campagne afgewezen."
    )
  }

  async function onCancel() {
    await runPatch({ status: "cancelled" }, "Campagne geannuleerd.")
  }

  async function onSaveNote() {
    await runPatch(
      { admin_note: noteDraft },
      "Admin-notitie opgeslagen."
    )
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Campagne laden…</p>
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        {error && <Notice variant="destructive">{error}</Notice>}
        <Link href="/advertising/campaigns" className="text-sm text-blue-700">
          ← Terug naar campagnes
        </Link>
      </div>
    )
  }

  const canApprove = campaign.status === "pending_review"
  const canReject = campaign.status === "pending_review"
  const canCancel = ["approved", "scheduled", "active"].includes(
    campaign.status
  )
  const openUrl = destinationHref(campaign.destination_url)
  const products = (campaign.products || []).map((product) => ({
    ...product,
    image_url: browserMedia(product.image_url),
    href: destinationHref(product.href),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/advertising/campaigns"
            className="text-xs text-blue-700 hover:underline"
          >
            ← Advertising — Campagnes
          </Link>
          <h1 className="mt-1 text-xl font-bold">Campaign Review Center</h1>
          <p className="mt-1 text-sm text-gray-600">{campaign.name}</p>
        </div>
        <Badge
          variant={(AD_STATUS_COLORS[campaign.status] ?? "outline") as "outline"}
        >
          {AD_STATUS_LABELS[campaign.status] ?? campaign.status}
        </Badge>
      </div>

      {error && <Notice variant="destructive">{error}</Notice>}
      {success && <Notice variant="info">{success}</Notice>}

      <Section title="Campagne">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Seller">
            {campaign.seller_name || campaign.seller_id}
          </Field>
          <Field label="Campagne">{campaign.name}</Field>
          <Field label="Status">
            {AD_STATUS_LABELS[campaign.status] ?? campaign.status}
          </Field>
          <Field label="Landen">
            {(campaign.markets || [])
              .map((m) => `${m} (${adminMarketLabel(m)})`)
              .join(", ") || "Niet beschikbaar"}
          </Field>
          <Field label="Periode">
            {campaign.weeks.length > 0
              ? `${formatAdDate(campaign.weeks[0].week_start)} – ${formatAdDate(campaign.weeks[campaign.weeks.length - 1].week_end)}`
              : "Niet beschikbaar"}
          </Field>
          <Field label="Prijs">
            €{Number(campaign.total_price).toFixed(2)}
          </Field>
          <Field label="Seller ID">
            <span className="font-mono text-xs">{campaign.seller_id}</span>
          </Field>
          <Field label="Aangemaakt">{formatAdDateTime(campaign.created_at)}</Field>
          <Field label="Gewijzigd">{formatAdDateTime(campaign.updated_at)}</Field>
        </dl>
      </Section>

      <Section title="Advertentie">
        <dl className="mb-5 grid gap-4 sm:grid-cols-2">
          <Field label="Headline">{displayOrNa(campaign.headline)}</Field>
          <Field label="Subline">{displayOrNa(campaign.subline)}</Field>
          <Field label="CTA">{ctaLabel(campaign.cta_key)}</Field>
          <Field label="Design">{designLabel(campaign.design_key)}</Field>
        </dl>
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Preview (zelfde weergave als landingspagina)
          </h3>
          <AdCampaignLandingPreview
            banner={{
              designKey: campaign.design_key,
              headline: campaign.headline,
              subline: campaign.subline,
              ctaLabel: ctaLabel(campaign.cta_key),
              imageUrl: browserMedia(campaign.image_url),
              logoUrl: browserMedia(campaign.logo_url),
              presentation: campaign.banner_presentation,
              previewLabel: "Preview — niet publiek",
              minHeight: 140,
            }}
            sellerName={campaign.seller_name || campaign.seller_id}
            products={products}
            moreProductsHref={
              campaign.seller_public_slug
                ? destinationHref(`/seller/${campaign.seller_public_slug}`)
                : null
            }
            linkProducts
          />
        </div>
      </Section>

      <Section title="Zichtbaarheid">
        <p className="mb-3 text-xs text-amber-800">
          Preview hierboven wijzigt de boeking, de periode en de betaling niet.
          Publieke zichtbaarheid volgt alleen een goedgekeurde campagne binnen de geboekte weken.
        </p>
        {campaign.visibility ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Goedgekeurd">
              {campaign.visibility.approved ? "Ja" : "Nee"}
            </Field>
            <Field label="Publiek nu">
              {campaign.visibility.publicNow ? "Ja" : "Nee"}
            </Field>
            <Field label="Plaatsing">{campaign.visibility.placement}</Field>
            <Field label="Landen">
              {campaign.visibility.markets.join(", ") || "—"}
            </Field>
            <Field label="Actief vanaf">
              {formatAdDateTime(campaign.visibility.activeFrom)}
            </Field>
            <Field label="Actief tot">
              {formatAdDateTime(campaign.visibility.activeUntil)}
            </Field>
            <Field label="Reden">
              {campaign.visibility.publicNow
                ? "Voldoet aan goedkeuring, plaatsing, land en periode."
                : campaign.visibility.reasons.join(", ") || "—"}
            </Field>
          </dl>
        ) : (
          <p className="text-sm text-gray-500">Geen zichtbaarheidsgegevens.</p>
        )}
        {campaign.visibility?.approved ? (
          <a
            className="mt-4 inline-block text-sm font-semibold text-blue-700 underline"
            href={`${STOREFRONT}/?adPreview=${encodeURIComponent(campaign.id)}&market=NL`}
            target="_blank"
            rel="noreferrer"
          >
            Storefront-preview (wijzigt niets)
          </a>
        ) : null}
      </Section>

      <Section title="Bestemming">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Campagnebestemmingspagina">
            {openUrl ? (
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-blue-700 hover:underline"
              >
                {campaign.destination_url}
              </a>
            ) : (
              "Niet beschikbaar"
            )}
          </Field>
          <Field label="Openen">
            {openUrl ? (
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-700 hover:underline"
              >
                Open bestemmingspagina ↗
              </a>
            ) : (
              "Niet beschikbaar"
            )}
          </Field>
        </dl>
        <div className="mt-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Geselecteerde producten ({products.length})
          </h3>
          {products.length === 0 ? (
            <p className="text-sm text-gray-500">Geen producten gekoppeld.</p>
          ) : (
            <ul className="space-y-2">
              {products.map((p) => (
                <li key={p.id}>
                  <a
                    href={p.href || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded border px-3 py-2 text-sm hover:border-gray-400"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-50">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image_url}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900">
                        {p.title || p.id}
                      </div>
                      <div className="truncate font-mono text-[10px] text-gray-400">
                        {p.id}
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title="Plaatsing">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Field label="Placement">{placementLabel(campaign.placement)}</Field>
          <Field label="Target type">
            {displayOrNa(campaign.target_type)}
          </Field>
          <Field label="Target value">
            {displayOrNa(campaign.target_value)}
          </Field>
        </dl>
      </Section>

      <Section title="Planning">
        <div className="overflow-hidden rounded border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Land</th>
                <th className="px-3 py-2">Week start</th>
                <th className="px-3 py-2">Week end</th>
                <th className="px-3 py-2">Prijs / week</th>
              </tr>
            </thead>
            <tbody>
              {campaign.weeks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-gray-500">
                    Geen weekboekingen (bijv. na afwijzing/annulering vrijgegeven).
                  </td>
                </tr>
              )}
              {campaign.weeks.map((w) => (
                <tr key={w.id} className="border-t">
                  <td className="px-3 py-2">
                    {w.market_code} ({adminMarketLabel(w.market_code)})
                  </td>
                  <td className="px-3 py-2">{formatAdDate(w.week_start)}</td>
                  <td className="px-3 py-2">{formatAdDate(w.week_end)}</td>
                  <td className="px-3 py-2">
                    €{Number(w.week_price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Admin-notitie">
        {campaign.status === "rejected" && campaign.admin_note && (
          <Notice variant="destructive">
            Afwijzingsreden: {campaign.admin_note}
          </Notice>
        )}
        <label className="mt-3 block text-xs font-semibold uppercase text-gray-500">
          Admin-notitie
        </label>
        <textarea
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          rows={3}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Optionele admin-notitie…"
        />
        <div className="mt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void onSaveNote()}
          >
            Notitie opslaan
          </Button>
        </div>
      </Section>

      <Section title="Acties">
        <div className="flex flex-wrap gap-2">
          {canApprove && (
            <Button disabled={busy} onClick={() => void onApprove()}>
              Goedkeuren
            </Button>
          )}
          {canReject && (
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => setShowRejectForm((v) => !v)}
            >
              Afwijzen
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void onCancel()}
            >
              Annuleren
            </Button>
          )}
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => router.push("/advertising/campaigns")}
          >
            Terug naar lijst
          </Button>
        </div>

        {showRejectForm && canReject && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-4">
            <label className="block text-xs font-semibold uppercase text-red-800">
              Afwijzingsreden (verplicht)
            </label>
            <textarea
              className="mt-1 w-full rounded border border-red-300 px-3 py-2 text-sm"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Waarom wordt deze campagne afgewezen?"
            />
            <div className="mt-2 flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => void onReject()}
              >
                Bevestig afwijzing
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setShowRejectForm(false)}
              >
                Annuleren
              </Button>
            </div>
          </div>
        )}

        {!canApprove && !canReject && !canCancel && (
          <p className="mt-3 text-sm text-gray-500">
            Geen statusacties beschikbaar voor status “
            {AD_STATUS_LABELS[campaign.status] ?? campaign.status}”.
          </p>
        )}
      </Section>
    </div>
  )
}
