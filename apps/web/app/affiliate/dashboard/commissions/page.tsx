"use client"

import { useEffect, useState } from "react"
import { Badge, Notice } from "@europmade/ui"
import { AffiliateGate } from "../../_components/affiliate-gate"
import {
  AffiliateApiError,
  getAffiliateCommissions,
  type CommissionRow,
} from "../../../_lib/affiliate-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t, type StorefrontMessageKey } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

const ATTRIBUTION_TYPE_KEYS: Record<string, StorefrontMessageKey> = {
  Link: "affAttrTypeLink",
  Coupon: "affAttrTypeCoupon",
  Onbekend: "affAttrTypeUnknown",
}

function attributionTypeLabel(
  type: string,
  locale: Parameters<typeof t>[1]
): string {
  const key = ATTRIBUTION_TYPE_KEYS[type]
  return key ? t(key, locale) : type
}

export default function AffiliateCommissionsPage() {
  const locale = useStorefrontLocale()
  const [rows, setRows] = useState<CommissionRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAffiliateCommissions()
      .then((res) => {
        if (!cancelled) setRows(res.commissions)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof AffiliateApiError
            ? err.message
            : t("affCommLoadFailed", locale)
        )
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  return (
    <AffiliateGate
      breadcrumb={[
        { label: t("affiliateNavDashboard", locale), href: "/affiliate/dashboard" },
        { label: t("affiliateNavCommissions", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("affiliateNavCommissions", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">{t("affCommIntro", locale)}</p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-md border border-wf-300">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead className="bg-wf-100 text-wf-700">
            <tr>
              <th className="px-3 py-2 font-semibold">
                {t("affCommDate", locale)}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t("affCommOrder", locale)}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t("affCommType", locale)}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t("affCommAmount", locale)}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t("affCommStatus", locale)}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-wf-600">
                  {t("affCommEmpty", locale)}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-wf-200">
                  <td className="px-3 py-2.5">
                    {new Date(row.created_at).toLocaleDateString(
                      storefrontIntlLocale(locale),
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </td>
                  <td className="px-3 py-2.5">#{row.order_number}</td>
                  <td className="px-3 py-2.5">
                    {attributionTypeLabel(row.attribution_type, locale)}
                  </td>
                  <td className="px-3 py-2.5">{row.amount_formatted}</td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant={
                        row.status === "Toegekend" ? "solid" : "outline"
                      }
                    >
                      {statusLabel(row.ui_status, locale)}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Notice className="mt-4">{t("affCommPayoutNote", locale)}</Notice>
    </AffiliateGate>
  )
}
