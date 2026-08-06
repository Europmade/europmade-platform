"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  upsertCartLine,
  deleteCartLine,
  getCart,
  patchCartLine,
  type CartView,
} from "../../_lib/order-service-api"
import {
  rememberCartLineMeta,
  type CartLineMeta,
} from "../../_lib/cart-line-meta"

export type AddedCartItem = {
  offer_id: string
  quantity: number
  unit_price: number
  meta: CartLineMeta
}

type CartContextValue = {
  cart: CartView | null
  loading: boolean
  refresh: () => Promise<CartView | null>
  setCart: (next: CartView) => void
  itemCount: number
  updateLine: (lineId: string, quantity: number) => Promise<CartView>
  removeLine: (lineId: string) => Promise<void>
  addLine: (
    offerId: string,
    quantity: number,
    meta?: CartLineMeta
  ) => Promise<CartView>
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  lastAdded: AddedCartItem | null
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCartState] = useState<CartView | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lastAdded, setLastAdded] = useState<AddedCartItem | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const next = await getCart()
      setCartState(next)
      return next
    } catch {
      setCartState(null)
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const value = useMemo<CartContextValue>(() => {
    const itemCount = cart
      ? cart.lines.reduce((sum, line) => sum + Number(line.quantity), 0)
      : 0
    return {
      cart,
      loading,
      refresh,
      setCart: setCartState,
      itemCount,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      lastAdded,
      updateLine: async (lineId: string, quantity: number) => {
        const next = await patchCartLine(lineId, quantity)
        setCartState(next)
        return next
      },
      removeLine: async (lineId: string) => {
        await deleteCartLine(lineId)
        await refresh()
      },
      addLine: async (offerId: string, quantity: number, meta?: CartLineMeta) => {
        if (meta) rememberCartLineMeta(meta)
        const next = await upsertCartLine(offerId, quantity)
        setCartState(next)
        setLoading(false)
        const line =
          next.lines.find((l) => l.offer_id === offerId) ??
          next.lines[next.lines.length - 1]
        if (line) {
          setLastAdded({
            offer_id: line.offer_id,
            quantity: line.quantity,
            unit_price: line.total_unit_price,
            meta:
              meta ??
              ({
                offer_id: line.offer_id,
                product_id: "",
                slug: "",
                title: `Product ${line.offer_id.slice(-8)}`,
                seller_id: line.seller_id,
                seller_name: `Verkoper ${line.seller_id.slice(-6)}`,
                verified: true,
                delivery: "2–4 werkdagen",
                stock: "Op voorraad",
                returns: "30 dagen retour",
              } satisfies CartLineMeta),
          })
          setDrawerOpen(true)
        }
        return next
      },
    }
  }, [cart, loading, drawerOpen, lastAdded])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider")
  }
  return ctx
}
