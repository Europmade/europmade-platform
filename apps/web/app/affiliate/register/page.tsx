"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { AffiliateGate } from "../_components/affiliate-gate"
import {
  AffiliateApiError,
  getAffiliate,
  registerAffiliate,
  type AffiliateRecord,
} from "../../_lib/affiliate-api"

/**
 * Affiliate-registratie — affiliate-01 (S3-07-04).
 */
export default function AffiliateRegisterPage() {
  const [affiliate, setAffiliate] = useState<AffiliateRecord | null>(null)
  const [legalName, setLegalName] = useState("")
  const [channelUrl, setChannelUrl] = useState("")
  const [iban, setIban] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAffiliate()
      .then(({ affiliate: current }) => {
        if (!cancelled) {
          setAffiliate(current)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await registerAffiliate({
        legal_name: legalName.trim(),
        channel_url: channelUrl.trim(),
        iban: iban.trim(),
        country_code: "NL",
      })
      setAffiliate(result.affiliate)
    } catch (err: unknown) {
      setError(
        err instanceof AffiliateApiError
          ? err.message
          : "Aanvraag indienen mislukt."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AffiliateGate
      allowRegistration
      breadcrumb={[
        { label: "Affiliate Dashboard", href: "/affiliate" },
        { label: "Affiliate-registratie" },
      ]}
    >
      {!loaded ? (
        <p className="text-sm text-wf-600">Laden…</p>
      ) : affiliate ? (
        <StatusView affiliate={affiliate} />
      ) : (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">
            Word EuropMade Affiliate
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            Meld je aan voor het Affiliate-programma en ontvang commissie op
            conversies.
          </p>

          {error ? (
            <Notice variant="warning" className="mt-4">
              {error}
            </Notice>
          ) : null}

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-6 max-w-md space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                Naam / bedrijfsnaam
              </label>
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Jouw naam of bedrijf"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                Website of kanaal
              </label>
              <Input
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="https://..."
                required
                minLength={3}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                IBAN (voor uitbetaling)
              </label>
              <Input
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="NL00 BANK 0000 0000 00"
                required
                minLength={8}
              />
            </div>

            <Notice className="mt-2">
              Je aanvraag wordt handmatig beoordeeld door een Beheerder — geen
              automatische goedkeuring.
            </Notice>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-wf border border-wf-500 bg-white px-[18px] py-[9px] text-sm font-semibold text-wf-800 hover:bg-wf-100"
              >
                Annuleren
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Indienen…" : "Aanvraag indienen"}
              </Button>
            </div>
          </form>
        </>
      )}
    </AffiliateGate>
  )
}

function StatusView({ affiliate }: { affiliate: AffiliateRecord }) {
  const status = affiliate.onboarding_status
  const approved = status === "Goedgekeurd"
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-wf-800 text-2xl text-wf-800"
        aria-hidden
      >
        {approved ? "✓" : status === "Afgekeurd" ? "!" : "…"}
      </div>
      <Badge variant={approved ? "solid" : "outline"} className="mb-3">
        {status}
      </Badge>
      <h1 className="text-[19px] font-bold text-wf-900">
        {approved
          ? "Je bent goedgekeurd als Affiliate"
          : status === "Afgekeurd"
            ? "Aanvraag afgewezen"
            : "Aanvraag ingediend"}
      </h1>
      <p className="mx-auto mt-2.5 max-w-sm text-[12.5px] leading-relaxed text-wf-600">
        {approved
          ? "Je kunt nu trackinglinks aanmaken en commissies volgen."
          : status === "Afgekeurd"
            ? affiliate.rejection_reason ||
              "Neem contact op met support voor meer informatie."
            : "Een Beheerder beoordeelt je aanvraag handmatig. Je ontvangt geen automatische goedkeuring."}
      </p>
      {approved ? (
        <div className="mt-5">
          <Link
            href="/affiliate"
            className="inline-flex items-center justify-center rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white hover:bg-wf-800"
          >
            Naar dashboard
          </Link>
        </div>
      ) : null}
    </div>
  )
}
