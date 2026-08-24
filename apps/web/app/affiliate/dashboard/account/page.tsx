"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Badge, Button, Notice } from "@europmade/ui"
import { AffiliateGate } from "../../_components/affiliate-gate"
import {
  getAffiliate,
  type AffiliateRecord,
} from "../../../_lib/affiliate-api"
import { endSession } from "../../../(auth)/_lib/medusa-auth"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

type CustomerMe = {
  email: string
  first_name?: string | null
  last_name?: string | null
}

function Field({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-wf-500">{label}</p>
      <p className="text-wf-800">{value || "—"}</p>
    </div>
  )
}

async function fetchCustomerMe(): Promise<CustomerMe> {
  const res = await fetch(`${BACKEND_URL}/store/customers/me`, {
    credentials: "include",
    headers: {
      ...(PUBLISHABLE_KEY
        ? { "x-publishable-api-key": PUBLISHABLE_KEY }
        : {}),
    },
  })
  if (!res.ok) throw new Error("unauthorized")
  const body = (await res.json()) as { customer: CustomerMe }
  return body.customer
}

export default function AffiliateAccountPage() {
  const locale = useStorefrontLocale()
  const [affiliate, setAffiliate] = useState<AffiliateRecord | null>(null)
  const [customer, setCustomer] = useState<CustomerMe | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    setError(null)
    Promise.all([getAffiliate(), fetchCustomerMe()])
      .then(([affRes, me]) => {
        if (cancelled) return
        setAffiliate(affRes.affiliate)
        setCustomer(me)
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoaded(true)
        setError(t("affAccountLoadFailed", locale))
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  async function logout() {
    try {
      await endSession()
    } catch {
      // ignore
    }
    window.location.href = "/"
  }

  const displayName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : ""

  return (
    <AffiliateGate
      breadcrumb={[
        { label: t("affiliateNavDashboard", locale), href: "/affiliate/dashboard" },
        { label: t("affiliateNavAccount", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("affiliateNavAccount", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">{t("affAccountIntro", locale)}</p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {!error && !loaded ? (
        <p className="mt-6 text-sm text-wf-600">{t("loading", locale)}</p>
      ) : null}

      {!error && loaded && affiliate && customer ? (
        <div className="mt-5 max-w-md space-y-3 rounded-md border border-wf-300 p-4 text-sm">
          <Field label={t("commonName", locale)} value={displayName || "—"} />
          <Field label={t("commonEmail", locale)} value={customer.email} />
          <Field
            label={t("affAccountLegalName", locale)}
            value={affiliate.legal_name?.trim() || "—"}
          />
          <Field
            label={t("affAccountChannel", locale)}
            value={affiliate.channel_url || "—"}
          />
          <div>
            <p className="text-[11px] font-semibold uppercase text-wf-500">
              {t("affCommStatus", locale)}
            </p>
            <p className="text-wf-800">
              <Badge variant="outline">
                {statusLabel(affiliate.onboarding_status, locale)}
              </Badge>
            </p>
          </div>
          {affiliate.approved_at ? (
            <Field
              label={t("affAccountApprovedAt", locale)}
              value={new Date(affiliate.approved_at).toLocaleDateString(
                storefrontIntlLocale(locale),
                { day: "numeric", month: "short", year: "numeric" }
              )}
            />
          ) : null}
          <Field
            label={t("affAccountIban", locale)}
            value={affiliate.iban_masked || "—"}
          />
          <Notice className="mt-2">{t("affAccountChangeNote", locale)}</Notice>
          <div className="pt-2">
            <Button type="button" variant="secondary" onClick={() => void logout()}>
              {t("buyerLogout", locale)}
            </Button>
          </div>
        </div>
      ) : null}
    </AffiliateGate>
  )
}
