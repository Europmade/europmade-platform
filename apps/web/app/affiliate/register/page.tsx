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
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"

/**
 * Affiliate-registratie — affiliate-01 (S3-07-04).
 */
export default function AffiliateRegisterPage() {
  const locale = useStorefrontLocale()
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
          : t("affRegSubmitFailed", locale)
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AffiliateGate
      allowRegistration
      breadcrumb={[
        { label: t("affiliateBrand", locale), href: "/affiliate" },
        { label: t("affRegisterNav", locale) },
      ]}
    >
      {!loaded ? (
        <p className="text-sm text-wf-600">{t("loading", locale)}</p>
      ) : affiliate ? (
        <StatusView affiliate={affiliate} />
      ) : (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">
            {t("affRegTitle", locale)}
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            {t("affRegLead", locale)}
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
            <Input
              label={t("affRegLegalName", locale)}
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder={t("affRegLegalPlaceholder", locale)}
              required
              minLength={2}
            />
            <Input
              label={t("affRegChannel", locale)}
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="https://..."
              required
              minLength={3}
            />
            <Input
              label={t("affRegIban", locale)}
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="NL00 BANK 0000 0000 00"
              required
              minLength={8}
            />

            <Notice className="mt-2">{t("affRegManualReview", locale)}</Notice>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-wf border border-wf-500 bg-white px-[18px] py-[9px] text-sm font-semibold text-wf-800 hover:bg-wf-100"
              >
                {t("cancel", locale)}
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? t("affRegSubmitting", locale)
                  : t("affRegSubmit", locale)}
              </Button>
            </div>
          </form>
        </>
      )}
    </AffiliateGate>
  )
}

function StatusView({ affiliate }: { affiliate: AffiliateRecord }) {
  const locale = useStorefrontLocale()
  const status = affiliate.onboarding_status
  const approved = status === "Goedgekeurd"
  const rejected = status === "Afgekeurd"
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-wf-800 text-2xl text-wf-800"
        aria-hidden
      >
        {approved ? "✓" : rejected ? "!" : "…"}
      </div>
      <Badge variant={approved ? "solid" : "outline"} className="mb-3">
        {statusLabel(status, locale)}
      </Badge>
      <h1 className="text-[19px] font-bold text-wf-900">
        {approved
          ? t("affRegApprovedTitle", locale)
          : rejected
            ? t("affRegRejectedTitle", locale)
            : t("affRegPendingTitle", locale)}
      </h1>
      <p className="mx-auto mt-2.5 max-w-sm text-[12.5px] leading-relaxed text-wf-600">
        {approved
          ? t("affRegApprovedBody", locale)
          : rejected
            ? affiliate.rejection_reason || t("affRegRejectedFallback", locale)
            : t("affRegPendingBody", locale)}
      </p>
      {approved ? (
        <div className="mt-5">
          <Link
            href="/affiliate/dashboard"
            className="inline-flex items-center justify-center rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white hover:bg-wf-800"
          >
            {t("affRegToDashboard", locale)}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
