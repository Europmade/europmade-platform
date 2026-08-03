import type { Metadata } from "next"
import Link from "next/link"
import { AdSlot } from "../_components/homepage/ad-slot"
import { PublicStorefrontChrome } from "../_components/marketplace/public-storefront-chrome"
import {
  MARKETPLACE_CATEGORIES,
  POPULAR_MARKETPLACE_CATEGORIES,
} from "../_lib/marketplace-categories"

export const metadata: Metadata = {
  title: "Categorieën — EuropMade",
  description:
    "Ontdek alle productcategorieën op EuropMade — uitsluitend producten geproduceerd in Europa.",
  alternates: { canonical: "/categorie" },
  openGraph: {
    title: "Categorieën — EuropMade",
    description:
      "Blader door categorieën op de Europese marketplace EuropMade.",
    locale: "nl_NL",
    type: "website",
  },
}

/**
 * Categorie-overzicht — ingangspunt voor schermen #3/#4.
 * Secties: header/nav (CMP-001), breadcrumb, page-head, populaire tegels,
 * volledige categoriegrid (CMP-032), advertentieslot (CMP-033), SEO-blok, footer.
 */
export default function CategoriesIndexPage() {
  return (
    <PublicStorefrontChrome>
      <div className="page-head px-4 pt-[18px] tablet:px-8">
        <nav className="mb-2 text-[11.5px] text-wf-600" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-wf-800" aria-current="page">
              Categorieën
            </li>
          </ol>
        </nav>
        <h1 className="m-0 text-[16px] font-bold text-wf-900 tablet:text-[22px]">
          Categorieën
        </h1>
        <p className="mt-1 text-[10.5px] text-wf-600 tablet:text-[12.5px]">
          {MARKETPLACE_CATEGORIES.length} hoofdcategorieën — kies een categorie
          om verder te browsen
        </p>
      </div>

      <section className="px-4 py-6 tablet:px-8 tablet:py-8">
        <h2 className="mb-4 text-base font-bold text-wf-900 tablet:text-lg">
          Populaire categorieën
        </h2>
        <ul className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-6 desktop:gap-4">
          {POPULAR_MARKETPLACE_CATEGORIES.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={`/categorie/${cat.slug}`}
                className="block rounded-lg border border-wf-300 px-2.5 py-4 text-center hover:border-wf-500"
              >
                <span
                  className="mx-auto mb-2.5 block h-11 w-11 rounded-full bg-wf-200"
                  aria-hidden
                />
                <span className="text-xs font-semibold text-wf-800">
                  {cat.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="py-2">
        <AdSlot position={1} compact />
      </div>

      <section className="px-4 py-6 tablet:px-8 tablet:py-8">
        <h2 className="mb-1 text-base font-bold text-wf-900 tablet:text-lg">
          Alle categorieën
        </h2>
        <p className="mb-4 text-[12.5px] text-wf-600">
          Productresultaten per categorie volgen zodra de catalogus live is.
        </p>
        <ul className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-5 desktop:gap-4">
          {MARKETPLACE_CATEGORIES.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={`/categorie/${cat.slug}`}
                className="flex items-center gap-3 rounded-lg border border-wf-300 px-3 py-3 hover:border-wf-500"
              >
                <span
                  className="inline-block h-9 w-9 shrink-0 rounded-full bg-wf-200"
                  aria-hidden
                />
                <span className="text-xs font-semibold text-wf-800">
                  {cat.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-wf-200 px-4 py-8 tablet:px-8 tablet:py-10">
        <h2 className="text-base font-bold text-wf-900 tablet:text-lg">
          Shop Europese makers per categorie
        </h2>
        <p className="mt-2 max-w-[640px] text-[13px] leading-relaxed text-wf-600">
          Op EuropMade vind je uitsluitend producten die in Europa zijn
          geproduceerd. Elke categoriepagina toont straks geverifieerde
          productinformatie, aanbiedersvergelijking en de Buy Box — zonder
          gesponsorde rangschikking.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-[12.5px] font-semibold text-wf-800 underline"
        >
          Terug naar de homepage
        </Link>
      </section>
    </PublicStorefrontChrome>
  )
}
