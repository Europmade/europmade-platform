"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import { AffiliatePeriodFilter } from "../../../../components/affiliate-period-filter"
import { KpiCard } from "../../../../components/kpi-card"
import {
  affiliateNeedsReview,
  approveAffiliate,
  displayAffiliateStatus,
  getAffiliate,
  getAffiliatePerformance,
  rejectAffiliate,
  type AffiliatePerformancePeriodDays,
  type AffiliatePerformanceRow,
  type AffiliateRow,
} from "../../../../lib/affiliate-admin-api"

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleString("nl-NL")
}

function formatEuro(n: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

function formatPct(n: number) {
  return `${new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 1,
  }).format(n)}%`
}

function formatInt(n: number) {
  return new Intl.NumberFormat("nl-NL").format(n)
}

export default function AdminAffiliateReviewPage() {
  const { id } = useParams<{ id: string }>()
  const [row, setRow] = useState<AffiliateRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [periodDays, setPeriodDays] =
    useState<AffiliatePerformancePeriodDays>(30)
  const [perf, setPerf] = useState<AffiliatePerformanceRow | null>(null)
  const [perfError, setPerfError] = useState<string | null>(null)
  const [perfLoading, setPerfLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await getAffiliate(id)
    setRow(res.affiliate)
  }, [id])

  useEffect(() => {
    let cancelled = false
    load()
      .then(() => {
        if (!cancelled) setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Affiliate laden mislukt."
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [load])

  useEffect(() => {
    let cancelled = false
    setPerfLoading(true)
    getAffiliatePerformance(periodDays)
      .then((d) => {
        if (cancelled) return
        const hit =
          d.affiliates.find((row) => row.affiliate_id === id) ?? null
        setPerf(hit)
        setPerfError(null)
        setPerfLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPerfError(
          err instanceof Error
            ? err.message
            : "Affiliate-performance laden mislukt."
        )
        setPerfLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, periodDays])

  async function handleApprove() {
    if (!row) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await approveAffiliate(row.id)
      setRow(res.affiliate)
      setNotice("Aanvraag goedgekeurd.")
      setRejectOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Goedkeuren is niet gelukt.")
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!row) return
    const note = reason.trim()
    if (note.length < 3) {
      setError("Een afwijsreden is verplicht (minimaal 3 tekens).")
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await rejectAffiliate(row.id, note)
      setRow(res.affiliate)
      setNotice("Aanvraag afgewezen.")
      setRejectOpen(false)
      setReason("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Afwijzen is niet gelukt.")
    } finally {
      setBusy(false)
    }
  }

  if (!row && !error) {
    return <p className="text-sm text-wf-600">Laden…</p>
  }

  if (!row) {
    return <Notice variant="warning">{error ?? "Affiliate niet gevonden."}</Notice>
  }

  const review = affiliateNeedsReview(row.onboarding_status)

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        <Link href="/affiliate" className="underline">
          Affiliate
        </Link>{" "}
        &gt;{" "}
        <b className="font-semibold text-wf-800">
          {review ? "Beoordelen" : "Bekijken"}
        </b>
      </p>
      <h1 className="mb-1.5 text-lg font-bold text-wf-900">
        Affiliate-aanvraag
      </h1>
      <p className="mb-5 text-xs text-wf-600">
        Review Center — goedkeuren of afwijzen via de bestaande admin-API.
      </p>

      {error && (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      )}
      {notice && (
        <Notice variant="info" className="mb-4">
          {notice}
        </Notice>
      )}

      <section className="mb-6">
        <div className="mb-3 flex flex-col gap-3 tablet:flex-row tablet:items-end tablet:justify-between">
          <h2 className="text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Affiliate Performance
          </h2>
          <AffiliatePeriodFilter
            value={periodDays}
            onChange={setPeriodDays}
            id="affiliate-detail-period"
          />
        </div>
        {perfError ? (
          <Notice variant="warning">{perfError}</Notice>
        ) : perfLoading ? (
          <p className="text-xs text-wf-600">Performance laden…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
              <KpiCard
                value={formatInt(perf?.orders ?? 0)}
                label="Orders"
                periodKey={String(periodDays)}
              />
              <KpiCard
                value={formatEuro(perf?.revenue ?? 0)}
                label="Omzet"
                valueFormat="euro"
                periodKey={String(periodDays)}
              />
              <KpiCard
                value={formatEuro(perf?.commission_awarded ?? 0)}
                label="Commissie"
                valueFormat="euro"
                periodKey={String(periodDays)}
              />
              <KpiCard
                value={formatInt(perf?.clicks ?? 0)}
                label="Clicks"
                periodKey={String(periodDays)}
              />
              <KpiCard
                value={formatPct(perf?.conversion_rate ?? 0)}
                label="Conversieratio"
                periodKey={String(periodDays)}
              />
              <KpiCard
                value={formatEuro(perf?.payout_open ?? 0)}
                label="Openstaand payout"
                valueFormat="euro"
                periodKey={String(periodDays)}
              />
            </div>
            {perf && perf.link_stats.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-lg border border-wf-300 bg-white">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {["Link", "Clicks", "Conversies", "Conversie"].map(
                        (h) => (
                          <th
                            key={h}
                            className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {perf.link_stats.map((link) => (
                      <tr
                        key={link.link_id}
                        className="border-b border-wf-200 last:border-b-0"
                      >
                        <td className="max-w-[280px] truncate px-4 py-2.5 text-wf-800">
                          {link.display_url}
                        </td>
                        <td className="px-4 py-2.5 text-wf-700">
                          {formatInt(link.clicks)}
                        </td>
                        <td className="px-4 py-2.5 text-wf-700">
                          {formatInt(link.conversions)}
                        </td>
                        <td className="px-4 py-2.5 text-wf-700">
                          {formatPct(link.conversion_rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </section>

      <div className="rounded-lg border border-wf-200 bg-white p-5">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
          Aanvraag
        </h3>
        <DetailRow label="Affiliate ID" value={row.id} mono />
        <DetailRow label="Klant ID" value={row.customer_id} mono />
        <DetailRow
          label="Status"
          value={
            <Badge variant="outline">
              {displayAffiliateStatus(row.onboarding_status)}
            </Badge>
          }
        />
        <DetailRow label="Aangemaakt" value={formatDateTime(row.created_at)} />
        <DetailRow
          label="Bedrijfsnaam"
          value={row.legal_name || "—"}
        />
        <DetailRow
          label="Website / kanaal"
          value={
            row.channel_url ? (
              <a
                href={row.channel_url}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                {row.channel_url}
              </a>
            ) : (
              "—"
            )
          }
        />
        <DetailRow label="IBAN" value={row.iban_masked || "—"} />
        {row.rejection_reason ? (
          <DetailRow label="Afwijsreden" value={row.rejection_reason} />
        ) : null}
      </div>

      {review && (
        <div className="mt-5 rounded-lg border border-wf-200 bg-white p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
            Beslissing
          </h3>
          {rejectOpen ? (
            <>
              <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                Reden voor afwijzing (verplicht)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Bijv. onvoldoende of niet-verifieerbaar kanaal"
                className="mb-4 min-h-[90px] w-full resize-none rounded-[5px] border border-wf-400 px-3 py-2.5 text-[12.5px] text-wf-800"
              />
              <div className="flex flex-wrap justify-end gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setRejectOpen(false)}
                  disabled={busy}
                >
                  Annuleren
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                  disabled={busy}
                >
                  {busy ? "Bezig…" : "Afwijzen"}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setRejectOpen(true)}
                disabled={busy}
              >
                Afwijzen
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApprove}
                disabled={busy}
              >
                {busy ? "Bezig…" : "Goedkeuren"}
              </Button>
            </div>
          )}
        </div>
      )}

      <p className="mt-5">
        <Link href="/affiliate" className="text-xs text-wf-800 underline">
          Terug naar de lijst
        </Link>
      </p>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-wf-100 py-2 text-[12.5px] last:border-0">
      <span className="shrink-0 text-wf-500">{label}</span>
      <span className={mono ? "break-all font-mono text-[11px] text-wf-800" : "text-right text-wf-800"}>
        {value}
      </span>
    </div>
  )
}
