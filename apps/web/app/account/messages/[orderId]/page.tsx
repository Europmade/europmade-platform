"use client"

import { useParams } from "next/navigation"
import { BuyerGate } from "../../_components/buyer-gate"
import { OrderMessageThread } from "../../../_components/order-message-thread"

export default function BuyerMessageThreadPage() {
  const params = useParams<{ orderId: string }>()

  return (
    <BuyerGate
      breadcrumb={[
        { label: "Mijn EuropMade", href: "/account" },
        { label: "Berichten", href: "/account/messages" },
        { label: "Conversatie" },
      ]}
    >
      <h1 className="mb-4 text-[19px] font-bold text-wf-900">Conversatie</h1>
      <OrderMessageThread orderId={params.orderId} />
    </BuyerGate>
  )
}
