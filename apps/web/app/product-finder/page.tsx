import type { Metadata } from "next"
import { PublicStorefrontChrome } from "../_components/marketplace/public-storefront-chrome"
import { ProductFinderClient } from "../_components/search/product-finder-client"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t } from "../_lib/i18n/messages"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  return {
    title: `${t("productFinderTitle", locale)} — EuropMade`,
    description: t("productFinderMetaDescription", locale),
    robots: { index: true, follow: true },
    alternates: { canonical: "/product-finder" },
  }
}

export default async function ProductFinderPage() {
  const locale = await getStorefrontLocaleFromCookies()

  return (
    <PublicStorefrontChrome locale={locale}>
      <ProductFinderClient locale={locale} />
    </PublicStorefrontChrome>
  )
}
