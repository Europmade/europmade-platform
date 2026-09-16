import type { Metadata } from "next"
import Link from "next/link"
import { COMMERCIAL_NAV_GROUPS } from "@europmade/utils"
import { AdSlot } from "../_components/homepage/ad-slot"
import { CommercialCategoryIcon } from "../_components/marketplace/commercial-category-icon"
import { PublicStorefrontChrome } from "../_components/marketplace/public-storefront-chrome"
import {
  fetchCategoryNav,
  fetchCommercialNav,
  filterCommercialNav,
} from "../_lib/category-nav"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t, tFormat } from "../_lib/i18n/messages"

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
  const commercial = filterCommercialNav(
    await fetchCommercialNav(locale),
    false
  )
  const mapped = new Set(
    COMMERCIAL_NAV_GROUPS.flatMap((g) => [g.key, ...g.pcSlugs])
  )
  const otherPc = (await fetchCategoryNav(locale)).filter(
    (row) =>
      !row.parent_category_id &&
      row.product_count > 0 &&
      !mapped.has(row.slug)
  )
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
            count: commercial.length,
          })}
        </p>
      </div>

      <section className="px-4 py-6 tablet:px-8 tablet:py-8">
        <h2 className="mb-4 text-base font-bold text-wf-900 tablet:text-lg">
          {t("navMainCategories", locale)}
        </h2>
        <ul className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-5 desktop:gap-4">
          {commercial.map((group) => (
            <li key={group.key}>
              <Link
                href={group.href}
                className="block rounded-lg border border-wf-300 px-2.5 py-4 text-center hover:border-wf-500"
              >
                <span className="mx-auto mb-2.5 flex justify-center">
                  <CommercialCategoryIcon group={group} size={44} />
                </span>
                <span className="text-xs font-semibold text-wf-800">
                  {group.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="py-2">
        <AdSlot position={1} compact location="category" />
      </div>

      {otherPc.length > 0 ? (
        <section className="px-4 py-6 tablet:px-8 tablet:py-8">
          <h2 className="mb-1 text-base font-bold text-wf-900 tablet:text-lg">
            {t("allCategories", locale)}
          </h2>
          <p className="mb-4 text-[12.5px] text-wf-600">
            {t("categoriesCatalogHint", locale)}
          </p>
          <ul className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-5 desktop:gap-4">
            {otherPc.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/categorie/${cat.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-wf-300 px-3 py-3 hover:border-wf-500"
                >
                  <span
                    className="inline-block h-9 w-9 shrink-0 rounded-full bg-wf-200"
                    aria-hidden
                  />
                  <span className="text-xs font-semibold text-wf-800">
                    {cat.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
