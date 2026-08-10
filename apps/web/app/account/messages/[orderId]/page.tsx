"use client"

import { useParams } from "next/navigation"
import { BuyerGate } from "../../_components/buyer-gate"
import { OrderMessageThread } from "../../../_components/order-message-thread"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"

export default function BuyerMessageThreadPage() {
  const locale = useStorefrontLocale()
  const params = useParams<{ orderId: string }>()

  return (
    <BuyerGate
      breadcrumb={[
        { label: t("buyerPortalTitle", locale), href: "/account" },
        { label: t("buyerNavMessages", locale), href: "/account/messages" },
        { label: t("buyerConversation", locale) },
      ]}
    >
      <h1 className="mb-4 text-[19px] font-bold text-wf-900">
        {t("buyerConversation", locale)}
      </h1>
      <OrderMessageThread orderId={params.orderId} />
    </BuyerGate>
  )
}
