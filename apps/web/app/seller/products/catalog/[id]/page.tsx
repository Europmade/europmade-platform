"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { SellerGate } from "../../../_components/seller-gate"

/**
 * Legacy entry for non-owner catalog view.
 * Central product detail now lives on the shared Product Manager page.
 */
export default function SellerCatalogProductRedirect() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  useEffect(() => {
    if (!id) return
    router.replace(`/seller/products/${id}?step=information`)
  }, [id, router])

  return (
    <SellerGate>
      <p className="px-4 py-8 text-sm text-wf-600">Doorsturen naar productdetail…</p>
    </SellerGate>
  )
}
