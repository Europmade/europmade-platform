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
  title: "Over EuropMade — EuropMade",
  description:
    "EuropMade is de marketplace voor producten die daadwerkelijk in Europa zijn geproduceerd.",
  alternates: { canonical: "/over" },
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/over", locale })
  if (cms) return metadataFromCmsPage(cms, FALLBACK_META)
  return FALLBACK_META
}

export default async function OverPage() {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/over", locale })
  if (cms) return <CmsPageView page={cms} locale={locale} />

  return (
    <ContentPage title={t("aboutPageTitle", locale)}>
      <p>{t("aboutPageP1", locale)}</p>
      <p>{t("aboutPageP2", locale)}</p>
      <p>{t("aboutPageP3", locale)}</p>
    </ContentPage>
  )
}
