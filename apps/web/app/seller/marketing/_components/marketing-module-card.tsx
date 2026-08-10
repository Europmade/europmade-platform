"use client"

import Link from "next/link"
import { Badge } from "@europmade/ui"
import type { MarketingModuleDefinition } from "../../_lib/marketing/module-registry"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"

export function MarketingModuleCard({
  module,
}: {
  module: MarketingModuleDefinition
}) {
  const locale = useStorefrontLocale()
  const unavailable = module.status !== "available" || !module.href
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-wf-900">
          {t(module.titleKey, locale)}
        </h3>
        {unavailable ? (
          <Badge variant="outline">{t("commonUnavailable", locale)}</Badge>
        ) : (
          <Badge variant="solid">{t("commonAvailable", locale)}</Badge>
        )}
      </div>
      <p className="mt-2 text-[11.5px] text-wf-600">
        {t(module.descriptionKey, locale)}
      </p>
      {!unavailable ? (
        <span className="mt-3 inline-block text-[11px] font-semibold text-wf-800 underline">
          {t("commonOpenArrow", locale)}
        </span>
      ) : null}
    </>
  )

  if (unavailable || !module.href) {
    return (
      <div className="rounded-lg border border-wf-300 bg-white px-5 py-4">
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={module.href}
      className="block rounded-lg border border-wf-300 bg-white px-5 py-4 transition-colors hover:border-wf-500"
    >
      {inner}
    </Link>
  )
}
