import type { ReactNode } from "react"
import Link from "next/link"
import { HOMEPAGE_FOOTER_LINKS } from "../../_lib/homepage-content"
import { PublicHeader } from "./public-header"

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
      <div className="mx-auto max-w-[1160px] border border-wf-400 bg-white">
        <PublicHeader searchQuery={searchQuery} alwaysShowSearch />
        {children}
        <footer
          role="contentinfo"
          className="flex flex-wrap gap-4 border-t border-wf-300 px-4 py-6 text-[11px] text-wf-500 tablet:gap-8 tablet:px-8"
        >
          {HOMEPAGE_FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-wf-700 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </footer>
      </div>
    </div>
  )
}
