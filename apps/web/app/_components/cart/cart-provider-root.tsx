"use client"

import { CartProvider } from "./cart-provider"
import { CartDrawer } from "./cart-drawer"

export function CartProviderRoot({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  )
}
