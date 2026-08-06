import Link from "next/link"
import { PublicStorefrontChrome } from "./public-storefront-chrome"

type ContentPageProps = {
  title: string
  children: React.ReactNode
}

/**
 * Eenvoudige contentlayout — hergebruikt PublicStorefrontChrome.
 */
export function ContentPage({ title, children }: ContentPageProps) {
  return (
    <PublicStorefrontChrome>
      <main className="px-4 py-10 tablet:px-8 tablet:py-12">
        <h1 className="text-[22px] font-bold text-wf-900 tablet:text-[28px]">
          {title}
        </h1>
        <div className="prose-em mt-5 max-w-[720px] space-y-4 text-[13.5px] leading-relaxed text-wf-700">
          {children}
        </div>
      </main>
    </PublicStorefrontChrome>
  )
}

export function ContentNav({
  items,
}: {
  items: Array<{ href: string; label: string }>
}) {
  return (
    <nav aria-label="Op deze pagina" className="mb-6">
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-[13px] font-semibold text-wf-800 underline hover:text-wf-900"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
