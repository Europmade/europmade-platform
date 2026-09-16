import type { Metadata } from "next"
import { CmsPageView } from "../_components/cms/cms-page-view"
import { ContentPage } from "../_components/marketplace/content-page"
import {
  loadFixedCmsPage,
  metadataFromCmsPage,
} from "../_lib/cms/fixed-cms-page"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t } from "../_lib/i18n/messages"

const FALLBACK_META: Metadata = {
  title: "Werken bij EuropMade — EuropMade",
  description: "Carrièrepagina van EuropMade.",
  alternates: { canonical: "/werken-bij" },
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/werken-bij", locale })
  if (cms) return metadataFromCmsPage(cms, FALLBACK_META)
  return FALLBACK_META
}

export default async function CareersPage() {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/werken-bij", locale })
  if (cms) return <CmsPageView page={cms} locale={locale} />

  return (
    <ContentPage title={t("careersPageTitle", locale)}>
      <p>{t("pageInPreparation", locale)}</p>
    </ContentPage>
  )
}
