"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@europmade/ui"
import { useCart } from "./cart-provider"
import { ProductThumbBlock, ProductRails } from "./product-rails"
import { formatEuro } from "../storefront-shell"
import {
  fetchProductsBySellerHint,
  fetchStorefrontListings,
} from "../../_lib/client-catalog"
import type { ListingProduct } from "../../_lib/listing-products"

export function CartDrawer() {
  const { drawerOpen, closeDrawer, lastAdded, cart } = useCart()
  const [together, setTogether] = useState<ListingProduct[]>([])
  const [sellerProducts, setSellerProducts] = useState<ListingProduct[]>([])

  useEffect(() => {
    if (!drawerOpen || !lastAdded) return
    let cancelled = false
    void (async () => {
      const [all, bySeller] = await Promise.all([
        fetchStorefrontListings(8),
        fetchProductsBySellerHint(
          lastAdded.meta.seller_name,
          lastAdded.meta.slug || undefined,
          6
        ),
      ])
      if (cancelled) return
      setTogether(
        all.filter((p) => p.slug !== lastAdded.meta.slug).slice(0, 6)
      )
      setSellerProducts(bySeller.slice(0, 6))
    })()
    return () => {
      cancelled = true
    }
  }, [drawerOpen, lastAdded])

  useEffect(() => {
    if (!drawerOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [drawerOpen, closeDrawer])

  if (!drawerOpen) return null

  const subtotal = cart?.totals.subtotal ?? lastAdded?.unit_price ?? 0

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
        aria-label="Sluit winkelwagenpaneel"
        onClick={closeDrawer}
      />
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col rounded-l-2xl border-l border-wf-200 bg-white shadow-[0_0_40px_rgba(0,0,0,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-label="Product toegevoegd"
      >
        <div className="flex items-center justify-between border-b border-wf-200 px-5 py-3.5">
          <p className="text-sm font-bold text-wf-900">✔ Product toegevoegd</p>
          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-wf-600 transition hover:bg-wf-100"
            aria-label="Sluiten"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {lastAdded ? (
            <div className="flex gap-3.5 rounded-2xl border border-wf-200 bg-wf-50/40 p-3.5">
              <ProductThumbBlock
                seed={lastAdded.offer_id}
                title={lastAdded.meta.title}
                className="h-[88px] w-[88px]"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-wf-900">
                  {lastAdded.meta.title}
                </p>
                <p className="mt-1.5 text-xs text-wf-600">
                  Aantal: {lastAdded.quantity}
                </p>
                <p className="mt-2 text-base font-bold text-wf-900">
                  {formatEuro(lastAdded.unit_price)}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between border-y border-wf-100 py-3.5 text-sm">
            <span className="text-wf-600">Subtotaal</span>
            <span className="font-bold text-wf-900">{formatEuro(subtotal)}</span>
          </div>

          <div className="mt-5 grid gap-2.5">
            <Button type="button" variant="secondary" onClick={closeDrawer}>
              Verder winkelen
            </Button>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-wf-900 px-4 text-sm font-semibold text-white transition hover:bg-black"
            >
              Naar winkelwagen
            </Link>
          </div>

          {together.length ? (
            <div className="mt-6 border-t border-wf-100 pt-5">
              <ProductRails
                title="Vaak samen gekocht"
                products={together}
                variant="drawer"
                onNavigate={closeDrawer}
              />
            </div>
          ) : null}
          {sellerProducts.length ? (
            <div className="mt-2 border-t border-wf-100 pt-5">
              <ProductRails
                title="Andere producten van deze verkoper"
                products={sellerProducts}
                variant="drawer"
                onNavigate={closeDrawer}
              />
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
