import type { Metadata } from "next"
import Link from "next/link"
import { CmsPageView } from "../_components/cms/cms-page-view"
import { ContentPage } from "../_components/marketplace/content-page"
import {
  loadFixedCmsPage,
  metadataFromCmsPage,
} from "../_lib/cms/fixed-cms-page"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"

const FALLBACK_META: Metadata = {
  title: "Verified™ — EuropMade",
  description: "Wat Verified™ productinformatie betekent op EuropMade.",
  alternates: { canonical: "/verified" },
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/verified", locale })
  if (cms) return metadataFromCmsPage(cms, FALLBACK_META)
  return FALLBACK_META
}

export default async function VerifiedPage() {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/verified", locale })
  if (cms) return <CmsPageView page={cms} locale={locale} />

  return (
    <ContentPage title="Verified™">
      <p>
        Verified™ betekent dat herkomst- en productinformatie is gecontroleerd
        volgens de EuropMade-regels: productie in Europa, traceerbare
        producentgegevens en geen misleidende claims.
      </p>
      <p>
        Verified™ zegt iets over de productinformatie — niet over welke
        aanbieder de Buy Box wint.
      </p>
      <p>
        Voor de Made in Europe-beoordelingsscore zie{" "}
        <Link href="/made-in-europe" className="font-semibold underline">
          Hoe bepalen wij Made in Europe?
        </Link>
        .
      </p>
    </ContentPage>
  )
}
