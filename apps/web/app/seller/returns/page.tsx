"use client"

import Link from "next/link"
import { Badge } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import { formatEuro } from "../../_components/storefront-shell"
import { useDemoReturns } from "../_lib/demo-store"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"

export default function SellerReturnsPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const [returns] = useDemoReturns()

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavReturns", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerNavReturns", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerReturnsIntro", locale)}
      </p>

      {returns.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t("sellerReturnsEmptyTitle", locale)}
            description={t("sellerReturnsEmptyDesc", locale)}
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {returns.map((ret) => (
            <li
              key={ret.id}
              className="rounded-lg border border-wf-300 bg-white p-4 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-wf-900">
                    {ret.return_number} · {t("commonOrder", locale)} #
                    {ret.order_number}
                  </div>
                  <div className="mt-1 text-wf-700">{ret.reason}</div>
                  <div className="mt-1 text-wf-500">
                    {ret.customer_name} ·{" "}
                    {new Date(ret.created_at).toLocaleDateString(intl)} ·{" "}
                    {formatEuro(ret.amount)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {statusLabel(ret.status, locale)}
                  </Badge>
                  <Link
                    href={`/seller/returns/${ret.id}`}
                    className="font-semibold underline"
                  >
                    {t("commonOpen", locale)}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SellerGate>
  )
}
