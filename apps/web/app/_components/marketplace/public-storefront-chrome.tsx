import type { ReactNode } from "react"
import { PublicHeader } from "./public-header"
import { SiteFooter } from "./site-footer"

/**
 * Gedeelde publieke chrome (CMP-001 header + CMP-002 footer) voor listing-pagina's.
 */
export function PublicStorefrontChrome({
  children,
  searchQuery = "",
}: {
  children: ReactNode
  searchQuery?: string
}) {
  return (
    <div className="min-h-screen bg-wf-100 text-wf-800">
      <div className="mx-auto max-w-[1160px] border border-wf-200 bg-white shadow-sm">
        <PublicHeader searchQuery={searchQuery} alwaysShowSearch />
        {children}
        <SiteFooter />
      </div>
    </div>
  )
}
