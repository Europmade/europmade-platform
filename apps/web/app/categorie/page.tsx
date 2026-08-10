import type { Metadata } from "next"
import Link from "next/link"
import { AdSlot } from "../_components/homepage/ad-slot"
import { PublicStorefrontChrome } from "../_components/marketplace/public-storefront-chrome"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import {
  categoryNavLabel,
  t,
  tFormat,
} from "../_lib/i18n/messages"
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
export default async function CategoriesIndexPage() {
  const locale = await getStorefrontLocaleFromCookies()
  return (
    <PublicStorefrontChrome locale={locale}>
      <div className="page-head px-4 pt-[18px] tablet:px-8">
        <nav className="mb-2 text-[11.5px] text-wf-600" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:underline">
                {t("breadcrumbHome", locale)}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-wf-800" aria-current="page">
              {t("breadcrumbCategories", locale)}
            </li>
          </ol>
        </nav>
        <h1 className="m-0 text-[16px] font-bold text-wf-900 tablet:text-[22px]">
          {t("breadcrumbCategories", locale)}
        </h1>
        <p className="mt-1 text-[10.5px] text-wf-600 tablet:text-[12.5px]">
          {tFormat("categoriesIndexMeta", locale, {
            count: MARKETPLACE_CATEGORIES.length,
          })}
        </p>
      </div>

      <section className="px-4 py-6 tablet:px-8 tablet:py-8">
        <h2 className="mb-4 text-base font-bold text-wf-900 tablet:text-lg">
          {t("popularCategories", locale)}
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
                  {categoryNavLabel(cat.slug, cat.label, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="py-2">
        <AdSlot position={1} compact location="category" />
      </div>

      <section className="px-4 py-6 tablet:px-8 tablet:py-8">
        <h2 className="mb-1 text-base font-bold text-wf-900 tablet:text-lg">
          {t("allCategories", locale)}
        </h2>
        <p className="mb-4 text-[12.5px] text-wf-600">
          {t("categoriesCatalogHint", locale)}
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
                  {categoryNavLabel(cat.slug, cat.label, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-wf-200 px-4 py-8 tablet:px-8 tablet:py-10">
        <h2 className="text-base font-bold text-wf-900 tablet:text-lg">
          {t("categoriesSeoTitle", locale)}
        </h2>
        <p className="mt-2 max-w-[640px] text-[13px] leading-relaxed text-wf-600">
          {t("categoriesSeoBody", locale)}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-[12.5px] font-semibold text-wf-800 underline"
        >
          {t("backToHomepage", locale)}
        </Link>
      </section>
    </PublicStorefrontChrome>
  )
}
