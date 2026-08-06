import Link from "next/link"
import { HOMEPAGE_FOOTER_COLUMNS } from "../../_lib/homepage-content"

/**
 * CMP-002 Footer — kolommenstructuur Homepage V2 / gedeelde storefront-chrome.
 */
export function SiteFooter() {
  return (
    <footer role="contentinfo" className="border-t border-wf-200 bg-white">
      <div className="grid gap-5 px-4 py-6 tablet:grid-cols-2 tablet:gap-6 tablet:px-8 desktop:grid-cols-4">
        {HOMEPAGE_FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="mb-2 text-[12.5px] font-bold tracking-tight text-wf-900">
              {col.title}
            </h2>
            <ul className="space-y-1.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[12px] text-wf-600 transition hover:text-wf-900 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-wf-200 px-4 py-3 text-[11px] text-wf-500 tablet:px-8">
        <p>© EuropMade</p>
        <p aria-label="Taal en valuta">NL · €</p>
      </div>
    </footer>
  )
}
