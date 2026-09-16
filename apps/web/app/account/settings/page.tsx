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

type CustomerMe = {
  email: string
  first_name?: string | null
  last_name?: string | null
}

/**
 * Accountinstellingen — Medusa customer + sessie-logout.
 */
export default function AccountSettingsPage() {
  const locale = useStorefrontLocale()
  const [customer, setCustomer] = useState<CustomerMe | "loading" | "error">(
    "loading"
  )

  useEffect(() => {
    let cancelled = false
    fetch(`${medusaBackendUrl()}/store/customers/me`, {
      credentials: "include",
      headers: {
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("unauthorized")
        const body = (await res.json()) as { customer: CustomerMe }
        if (!cancelled) setCustomer(body.customer)
      })
      .catch(() => {
        if (!cancelled) setCustomer("error")
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
        <div className="mt-5 max-w-md space-y-3 rounded-md border border-wf-300 p-4 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase text-wf-500">
              {t("commonName", locale)}
            </p>
            <p className="text-wf-800">
              {[customer.first_name, customer.last_name]
                .filter(Boolean)
                .join(" ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-wf-500">
              {t("commonEmail", locale)}
            </p>
            <p className="text-wf-800">{customer.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/account/orders">
              <Button type="button" variant="secondary">
                {t("buyerNavOrders", locale)}
              </Button>
            </Link>
            <Button type="button" variant="secondary" onClick={() => void logout()}>
              {t("buyerLogout", locale)}
            </Button>
          </div>
        </div>
      )}
    </BuyerGate>
  )
}
