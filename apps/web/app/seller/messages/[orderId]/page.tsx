"use client"

import { useParams } from "next/navigation"
import { SellerGate } from "../../_components/seller-gate"
import { OrderMessageThread } from "../../../_components/order-message-thread"

export default function SellerMessageThreadPage() {
  const params = useParams<{ orderId: string }>()

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Berichten", href: "/seller/messages" },
        { label: "Conversatie" },
      ]}
    >
      <h1 className="mb-4 text-[19px] font-bold text-wf-900">Conversatie</h1>
      <OrderMessageThread orderId={params.orderId} />
    </SellerGate>
  )
}
