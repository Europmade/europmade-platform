"use client"

import { useParams } from "next/navigation"
import { BuyerGate } from "../../_components/buyer-gate"
import { ConversationMessageThread } from "../../../_components/conversation-message-thread"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"

export default function BuyerConversationThreadPage() {
  const locale = useStorefrontLocale()
  const params = useParams<{ conversationId: string }>()

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
      <ConversationMessageThread conversationId={params.conversationId} />
    </BuyerGate>
  )
}
