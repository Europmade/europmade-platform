"use client"

import Link from "next/link"
import { useCart } from "../cart/cart-provider"

/**
 * Winkelwagenicoon + teller — Order-service cart (ADR-0022).
 */
export function CartLink() {
  const { itemCount, loading } = useCart()
  const count = loading ? null : itemCount

  return (
    <Link
      href="/cart"
      className="relative inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-wf-400 text-wf-700 hover:border-wf-700"
      aria-label={
        count != null && count > 0
          ? `Winkelwagen (${count} artikelen)`
          : "Winkelwagen"
      }
      title="Winkelwagen"
    >
      <CartIcon />
      {count != null && count > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-wf-900 px-1 text-[9px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  )
}

function CartIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 7h15l-1.5 9h-12z" />
      <path d="M6 7 5 3H2" />
      <circle cx="9" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
