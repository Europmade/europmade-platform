"use client"

import Link from "next/link"
import { Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"

/** Stub tot S3-03-06 (product-04) — ADR-0012. */
export default function SellerProductNewStubPage() {
  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Producten", href: "/seller/products" },
        { label: "Nieuw product aanmaken" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        Nieuw product aanmaken
      </h1>
      <p className="mb-5 mt-1.5 text-xs text-wf-600">
        Retailer Created-formulier (wireframe product-04).
      </p>
      <Notice variant="warning" className="max-w-xl">
        Dit scherm volgt in S3-03-06. Je kunt wel opnieuw op EAN zoeken of terug
        naar het productoverzicht.
      </Notice>
      <div className="mt-5 flex flex-wrap gap-2.5">
        <Link
          href="/seller/products/add"
          className="inline-flex items-center justify-center rounded-wf border border-wf-500 bg-white px-[18px] py-[9px] text-sm font-semibold text-wf-800"
        >
          Terug naar EAN-zoeken
        </Link>
        <Link
          href="/seller/products"
          className="inline-flex items-center justify-center rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white"
        >
          Naar productoverzicht
        </Link>
      </div>
    </SellerGate>
  )
}
