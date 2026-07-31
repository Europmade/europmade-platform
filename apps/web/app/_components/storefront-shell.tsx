import Link from "next/link"
import type { ReactNode } from "react"

/** Minimale storefront-chrome voor Winkelwagen/Checkout/Bevestiging (S3-05-03). */
export function StorefrontShell({
  children,
  cartCount,
}: {
  children: ReactNode
  cartCount?: number
}) {
  return (
    <div className="min-h-screen bg-white text-wf-900">
      <header className="flex items-center justify-between gap-4 border-b border-wf-200 px-4 py-3 tablet:px-8">
        <Link href="/" className="block">
          <div
            className="h-7 w-[140px] rounded bg-wf-300"
            role="img"
            aria-label="EuropMade"
          />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold text-wf-800">
          <Link href="/cart" className="hover:underline">
            Winkelwagen{cartCount != null ? ` (${cartCount})` : ""}
          </Link>
          <Link href="/login" className="hover:underline">
            Account
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 tablet:px-8">{children}</main>
      <footer className="border-t border-wf-200 px-4 py-6 text-center text-[11px] text-wf-500">
        EuropMade — producten geproduceerd in Europa
      </footer>
    </div>
  )
}

export function formatEuro(n: number): string {
  return `€ ${n.toFixed(2).replace(".", ",")}`
}

export function VatRow({
  amount,
  tooltip,
}: {
  amount: number
  tooltip: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-wf-700">
      <span className="inline-flex items-center gap-1.5">
        BTW
        <span
          className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-wf-400 text-[9px] font-bold text-wf-600"
          title={tooltip}
          aria-label={tooltip}
        >
          i
        </span>
      </span>
      <span>{formatEuro(amount)}</span>
    </div>
  )
}
