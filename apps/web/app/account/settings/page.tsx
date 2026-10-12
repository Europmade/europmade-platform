"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button, Notice } from "@europmade/ui"
import { BuyerGate } from "../_components/buyer-gate"
import { endSession } from "../../(auth)/_lib/medusa-auth"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

type CustomerAddress = {
  id?: string
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  postal_code?: string | null
  country_code?: string | null
  is_default_shipping?: boolean
}

type CustomerMe = {
  email: string
  first_name?: string | null
  last_name?: string | null
  addresses?: CustomerAddress[]
}

type NewsletterPreference = {
  key: string
  label: string
  enabled: boolean
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
  }
}

function addressLine(address: CustomerAddress): string {
  return [address.address_1, address.address_2, address.postal_code, address.city, address.country_code]
    .filter(Boolean)
    .join(", ")
}

/**
 * Accountinstellingen — Medusa customer + sessie-logout.
 */
export default function AccountSettingsPage() {
  const locale = useStorefrontLocale()
  const [customer, setCustomer] = useState<CustomerMe | "loading" | "error">(
    "loading"
  )
  const [newsletters, setNewsletters] = useState<NewsletterPreference[]>([])
  const [newsletterLoaded, setNewsletterLoaded] = useState(false)
  const [newsletterBusy, setNewsletterBusy] = useState(false)
  const [newsletterError, setNewsletterError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(
      `${medusaBackendUrl()}/store/customers/me?fields=id,email,first_name,last_name,*addresses`,
      {
        credentials: "include",
        headers: authHeaders(),
      }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("unauthorized")
        const body = (await res.json()) as { customer: CustomerMe }
        if (!cancelled) setCustomer(body.customer)
      })
      .catch(() => {
        if (!cancelled) setCustomer("error")
      })
    fetch(`${medusaBackendUrl()}/store/engagement/newsletter/preferences`, {
      credentials: "include",
      headers: authHeaders(),
    })
      .then(async (res) => {
        if (!res.ok) return
        const body = (await res.json()) as { newsletters?: NewsletterPreference[] }
        if (!cancelled && body.newsletters) setNewsletters(body.newsletters)
      })
      .catch(() => {
        if (!cancelled) setNewsletters([])
      })
      .finally(() => {
        if (!cancelled) setNewsletterLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function logout() {
    try {
      await endSession()
    } catch {
      // ignore
    }
    window.location.href = "/"
  }

  async function toggleNewsletter(key: string, enabled: boolean) {
    const topics = {
      news: newsletters.find((item) => item.key === "news")?.enabled ?? false,
      brands: newsletters.find((item) => item.key === "brands")?.enabled ?? false,
      offers: newsletters.find((item) => item.key === "offers")?.enabled ?? false,
      [key]: enabled,
    }
    setNewsletterBusy(true)
    setNewsletterError(null)
    try {
      const response = await fetch(
        `${medusaBackendUrl()}/store/engagement/newsletter/preferences`,
        {
          method: "POST",
          credentials: "include",
          headers: authHeaders(),
          body: JSON.stringify({ topics, locale }),
        }
      )
      const body = (await response.json().catch(() => null)) as
        | { newsletters?: NewsletterPreference[]; message?: string }
        | null
      if (!response.ok || !body?.newsletters) {
        throw new Error(body?.message || t("buyerProfileLoadError", locale))
      }
      setNewsletters(body.newsletters)
    } catch (err) {
      setNewsletterError(err instanceof Error ? err.message : t("buyerProfileLoadError", locale))
    } finally {
      setNewsletterBusy(false)
    }
  }

  const addresses = customer !== "loading" && customer !== "error" ? customer.addresses ?? [] : []
  const defaultAddress =
    addresses.find((item) => item.is_default_shipping) ?? addresses[0] ?? null

  return (
    <BuyerGate
      breadcrumb={[
        { label: t("buyerPortalTitle", locale), href: "/account" },
        { label: t("buyerNavSettings", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("buyerNavSettings", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("buyerSettingsIntro", locale)}
      </p>

      {customer === "loading" ? (
        <p className="mt-4 text-xs text-wf-600">{t("loading", locale)}</p>
      ) : customer === "error" ? (
        <Notice variant="warning" className="mt-4">
          {t("buyerProfileLoadError", locale)}{" "}
          <Link href="/login" className="underline">
            {t("buyerLoginAgain", locale)}
          </Link>
        </Notice>
      ) : (
        <div className="mt-5 max-w-xl space-y-4 text-sm">
          <section className="rounded-md border border-wf-300 p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              {t("buyerSettingsPersonal", locale)}
            </h2>
            <p className="mt-2 text-wf-800">
              {[customer.first_name, customer.last_name].filter(Boolean).join(" ") || "—"}
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase text-wf-500">
              {t("commonEmail", locale)}
            </p>
            <p className="text-wf-800">{customer.email}</p>
          </section>
          <section className="rounded-md border border-wf-300 p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              {t("buyerSettingsSecurity", locale)}
            </h2>
            <Link href="/account/two-factor-setup" className="mt-2 inline-block text-wf-900 underline">
              {t("buyerSettingsTwoFactor", locale)}
            </Link>
          </section>
          <section className="rounded-md border border-wf-300 p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              {t("buyerSettingsAddresses", locale)}
            </h2>
            {defaultAddress ? (
              <p className="mt-2 text-wf-800">
                <span className="block text-[11px] text-wf-500">
                  {t("buyerSettingsDefaultAddress", locale)}
                </span>
                {addressLine(defaultAddress)}
              </p>
            ) : (
              <p className="mt-2 text-xs text-wf-600">{t("buyerSettingsNoAddresses", locale)}</p>
            )}
            {addresses.length > 1 ? (
              <ul className="mt-2 space-y-1 text-xs text-wf-700">
                {addresses
                  .filter((item) => item !== defaultAddress)
                  .map((item) => (
                    <li key={item.id ?? addressLine(item)}>{addressLine(item)}</li>
                  ))}
              </ul>
            ) : null}
          </section>
          <section className="rounded-md border border-wf-300 p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              {t("buyerNavOrders", locale)}
            </h2>
            <Link href="/account/orders" className="mt-2 inline-block">
              <Button type="button" variant="secondary">
                {t("buyerNavOrders", locale)}
              </Button>
            </Link>
          </section>
          <section className="rounded-md border border-wf-300 p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              {t("buyerSettingsNewsletter", locale)}
            </h2>
            <p className="mt-1 text-xs text-wf-600">{t("buyerSettingsNewsletterHelp", locale)}</p>
            {newsletters.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {newsletters.map((item) => (
                  <li key={item.key}>
                    <label className="flex items-center gap-2 text-wf-800">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        disabled={newsletterBusy}
                        onChange={(event) => void toggleNewsletter(item.key, event.target.checked)}
                      />
                      {item.key === "news"
                        ? t("newsletterTopicNews", locale)
                        : item.key === "brands"
                          ? t("newsletterTopicBrands", locale)
                          : item.key === "offers"
                            ? t("newsletterTopicOffers", locale)
                            : item.label}
                    </label>
                  </li>
                ))}
              </ul>
            ) : newsletterLoaded ? null : (
              <p className="mt-2 text-xs text-wf-600">{t("loading", locale)}</p>
            )}
            {newsletterError ? (
              <p className="mt-2 text-xs text-wf-800">{newsletterError}</p>
            ) : null}
          </section>
          <Button type="button" variant="secondary" onClick={() => void logout()}>
            {t("buyerLogout", locale)}
          </Button>
        </div>
      )}
    </BuyerGate>
  )
}
