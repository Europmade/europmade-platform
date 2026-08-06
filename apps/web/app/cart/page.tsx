"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Notice, QuantityStepper, Badge } from "@europmade/ui"
import { StorefrontShell, VatRow, formatEuro } from "../_components/storefront-shell"
import { OrderServiceApiError } from "../_lib/order-service-api"
import { useCart } from "../_components/cart/cart-provider"
import {
  CartLineCard,
  freeShippingMessage,
  resolveLineMeta,
} from "../_components/cart/cart-line-card"
import { ProductRails } from "../_components/cart/product-rails"
import {
  getCartLineMetaMap,
  type CartLineMeta,
} from "../_lib/cart-line-meta"
import { enrichOfferMetaFromCatalog, fetchStorefrontListings } from "../_lib/client-catalog"
import { readRecentlyViewed } from "../_lib/recently-viewed"
import type { ListingProduct } from "../_lib/listing-products"
import { partnerHref } from "../_lib/partner-profiles"

export default function CartPage() {
  const router = useRouter()
  const { cart, loading, refresh, updateLine, removeLine, itemCount } = useCart()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [metaMap, setMetaMap] = useState<Record<string, CartLineMeta>>({})
  const [together, setTogether] = useState<ListingProduct[]>([])
  const [sellerProducts, setSellerProducts] = useState<ListingProduct[]>([])
  const [interesting, setInteresting] = useState<ListingProduct[]>([])
  const [recent, setRecent] = useState<ListingProduct[]>([])

  useEffect(() => {
    if (!loading && !cart) void refresh()
  }, [cart, loading, refresh])

  useEffect(() => {
    if (!cart?.lines.length) return
    const ids = cart.lines.map((l) => l.offer_id)
    const cached = getCartLineMetaMap(ids)
    setMetaMap(cached)

    let cancelled = false
    void (async () => {
      const next = { ...cached }
      for (const line of cart.lines) {
        if (next[line.offer_id]?.title && !next[line.offer_id].title.startsWith("Product ")) {
          continue
        }
        const enriched = await enrichOfferMetaFromCatalog(line.offer_id, line.seller_id)
        if (enriched) next[line.offer_id] = enriched
      }
      if (!cancelled) setMetaMap(next)
    })()
    return () => {
      cancelled = true
    }
  }, [cart])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const listings = await fetchStorefrontListings(16)
      if (cancelled) return
      const inCartSlugs = new Set(
        Object.values(metaMap)
          .map((m) => m.slug)
          .filter(Boolean)
      )
      const available = listings.filter((p) => !inCartSlugs.has(p.slug))
      setTogether(available.slice(0, 4))
      setInteresting(available.slice(2, 8))
      const primarySeller =
        Object.values(metaMap)[0]?.seller_name?.toLowerCase() ?? ""
      const bySeller = available.filter((p) =>
        primarySeller
          ? p.seller.toLowerCase().includes(primarySeller.slice(0, 4)) ||
            p.brand.toLowerCase().includes(primarySeller.slice(0, 4))
          : true
      )
      setSellerProducts((bySeller.length ? bySeller : available).slice(0, 8))
      setRecent(
        readRecentlyViewed().map((r) => ({
          ...r,
          keywords: r.keywords ?? [],
        })) as ListingProduct[]
      )
    })()
    return () => {
      cancelled = true
    }
  }, [metaMap])

  const groups = useMemo(() => {
    if (!cart) return []
    const map = new Map<string, typeof cart.lines>()
    for (const line of cart.lines) {
      const bucket = map.get(line.seller_id) ?? []
      bucket.push(line)
      map.set(line.seller_id, bucket)
    }
    return [...map.entries()]
  }, [cart])

  async function onQty(lineId: string, quantity: number) {
    setBusy(true)
    setError(null)
    try {
      await updateLine(lineId, quantity)
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : "Aantal bijwerken mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  async function onRemove(lineId: string) {
    setBusy(true)
    setError(null)
    try {
      await removeLine(lineId)
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : "Verwijderen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  const count = loading ? undefined : itemCount
  const shippingHint =
    cart && cart.lines.length
      ? freeShippingMessage(cart.totals.subtotal)
      : null

  return (
    <StorefrontShell cartCount={count}>
      <h1 className="text-[26px] font-bold tracking-tight text-wf-900">
        Winkelwagen
        {count != null ? (
          <span className="ml-2 text-base font-normal text-wf-500">
            ({count} {count === 1 ? "product" : "producten"})
          </span>
        ) : null}
      </h1>

      {loading ? (
        <p className="mt-8 text-sm text-wf-600">Laden…</p>
      ) : !cart ? (
        <Notice variant="warning" className="mt-6 max-w-xl">
          {error ?? "Laden mislukt."}
        </Notice>
      ) : cart.lines.length === 0 ? (
        <Notice className="mt-6 max-w-xl">Je winkelwagen is leeg.</Notice>
      ) : (
        <>
          {shippingHint ? (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                shippingHint.startsWith("Gefeliciteerd")
                  ? "border-wf-900 bg-wf-900 text-white"
                  : "border-wf-300 bg-wf-50 text-wf-800"
              }`}
            >
              {shippingHint}
            </div>
          ) : null}

          <div className="mt-8 grid gap-10 desktop:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
            <div className="space-y-6">
              {cart.split_notice || groups.length > 1 ? (
                <div className="rounded-xl border border-wf-300 bg-wf-50 p-4">
                  <p className="text-sm font-bold text-wf-900">
                    Je bestelling wordt opgesplitst
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-wf-700">
                    Je winkelwagen bevat producten van {groups.length} verkopers.
                    Elke verkoper verzendt apart — je ontvangt daarom meerdere
                    pakketten en aparte track &amp; trace-updates. De betaling
                    blijft één totaalbedrag.
                  </p>
                </div>
              ) : null}

              {groups.map(([sellerId, lines]) => {
                const meta0 = resolveLineMeta(lines[0], metaMap)
                return (
                  <section
                    key={sellerId}
                    className="rounded-2xl border border-wf-200 bg-white px-5 py-2 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2 border-b border-wf-100 py-4">
                      <h2 className="text-sm font-bold text-wf-900">
                        Verkoper{" "}
                        <a
                          href={partnerHref(meta0.seller_name)}
                          className="underline-offset-2 hover:underline"
                        >
                          {meta0.seller_name}
                        </a>
                      </h2>
                      {meta0.verified ? (
                        <Badge variant="solid" className="px-1.5 py-0.5 text-[9.5px]">
                          EU Verified™
                        </Badge>
                      ) : null}
                    </div>
                    <ul>
                      {lines.map((line) => {
                        const meta = resolveLineMeta(line, metaMap)
                        return (
                          <li key={line.line_id}>
                            <CartLineCard
                              line={line}
                              meta={meta}
                              actions={
                                <div className="flex flex-wrap items-center gap-3">
                                  <QuantityStepper
                                    value={line.quantity}
                                    min={1}
                                    max={line.quantity_available}
                                    disabled={busy}
                                    onChange={(q) => void onQty(line.line_id, q)}
                                  />
                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-wf-600 underline-offset-2 hover:underline"
                                    disabled={busy}
                                    onClick={() => void onRemove(line.line_id)}
                                  >
                                    Verwijderen
                                  </button>
                                </div>
                              }
                            />
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })}
            </div>

            <aside className="h-fit rounded-2xl border border-wf-200 bg-white p-6 shadow-sm desktop:sticky desktop:top-6">
              <h2 className="mb-5 text-base font-bold text-wf-900">Overzicht</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-wf-700">
                  <span>Subtotaal</span>
                  <span>{formatEuro(cart.totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-wf-700">
                  <span>Verzendkosten</span>
                  <span>
                    {cart.totals.shipping_total <= 0
                      ? "Gratis"
                      : formatEuro(cart.totals.shipping_total)}
                  </span>
                </div>
                <VatRow
                  amount={cart.totals.vat_amount}
                  tooltip={cart.totals.vat_tooltip}
                />
                <div className="flex justify-between border-t border-wf-200 pt-3 text-lg font-bold text-wf-900">
                  <span>Totaal</span>
                  <span>{formatEuro(cart.totals.total)}</span>
                </div>
              </div>
              {error ? (
                <Notice variant="warning" className="mt-4">
                  {error}
                </Notice>
              ) : null}
              <Button
                className="mt-6 w-full bg-black text-white hover:bg-zinc-900"
                type="button"
                disabled={busy}
                onClick={() => router.push("/checkout")}
              >
                Verder naar afrekenen
              </Button>
            </aside>
          </div>

          <ProductRails title="Vaak samen gekocht" products={together} />
          <ProductRails
            title="Andere producten van deze verkoper"
            products={sellerProducts}
          />
          <ProductRails
            title="Laatst bekeken"
            products={recent.slice(0, 20)}
            hideWhenEmpty
          />
          <ProductRails title="Mogelijk interessant" products={interesting} />
        </>
      )}
    </StorefrontShell>
  )
}
