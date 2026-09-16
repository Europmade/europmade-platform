import type { Metadata } from "next"
import { CmsPageView } from "../_components/cms/cms-page-view"
import { ContentPage } from "../_components/marketplace/content-page"
import {
  loadFixedCmsPage,
  metadataFromCmsPage,
} from "../_lib/cms/fixed-cms-page"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"

const FALLBACK_META: Metadata = {
  title: "Duurzame producten — EuropMade",
  description: "Duurzaamheid en Europese productie op EuropMade.",
  alternates: { canonical: "/duurzaam" },
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/duurzaam", locale })
  if (cms) return metadataFromCmsPage(cms, FALLBACK_META)
  return FALLBACK_META
}

export default async function DuurzaamPage() {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/duurzaam", locale })
  if (cms) return <CmsPageView page={cms} locale={locale} />

  return (
    <ContentPage title="Duurzame producten">
      <p>
        EuropMade toont uitsluitend producten die in Europa zijn geproduceerd.
        Daarmee verkorten we onnodige importketens en maken we herkomst
        inzichtelijk.
      </p>
      <p>
        Duurzaamheidskenmerken (materialen, certificeringen) verschijnen op de
        productpagina wanneer de producent die heeft aangeleverd en gecontroleerd.
      </p>
    </ContentPage>
  )
}
