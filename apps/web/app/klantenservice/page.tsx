import type { Metadata } from "next"
import Link from "next/link"
import { CmsPageView } from "../_components/cms/cms-page-view"
import { ContentPage } from "../_components/marketplace/content-page"
import {
  loadFixedCmsPage,
  metadataFromCmsPage,
} from "../_lib/cms/fixed-cms-page"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t } from "../_lib/i18n/messages"

const FALLBACK_META: Metadata = {
  title: "Klantenservice — EuropMade",
  description: "Hulp bij bestellingen, retouren, betalingen en je account.",
  alternates: { canonical: "/klantenservice" },
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/klantenservice", locale })
  if (cms) return metadataFromCmsPage(cms, FALLBACK_META)
  return FALLBACK_META
}

export default async function KlantenservicePage() {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/klantenservice", locale })
  if (cms) return <CmsPageView page={cms} locale={locale} />

  return (
    <ContentPage title={t("supportPageTitle", locale)}>
      <p>{t("supportPageIntro", locale)}</p>

      <section id="bestellen" className="scroll-mt-8">
        <h2 className="text-sm font-bold text-wf-900">
          {t("supportOrderingHeading", locale)}
        </h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <Link href="/account/orders" className="font-semibold underline">
              {t("supportMyOrders", locale)}
            </Link>{" "}
            — {t("supportMyOrdersHint", locale)}
          </li>
        </ul>
      </section>

      <section id="verzenden" className="mt-6 scroll-mt-8">
        <h2 className="text-sm font-bold text-wf-900">
          {t("supportShippingHeading", locale)}
        </h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <Link
              href="/juridisch/verzending"
              className="font-semibold underline"
            >
              {t("supportShippingHeading", locale)}
            </Link>
          </li>
        </ul>
      </section>

      <section id="retour" className="mt-6 scroll-mt-8">
        <h2 className="text-sm font-bold text-wf-900">
          {t("supportReturnsHeading", locale)}
        </h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <Link href="/account/returns" className="font-semibold underline">
              {t("supportReturns", locale)}
            </Link>{" "}
            — {t("supportReturnsHint", locale)}
          </li>
          <li>
            <Link
              href="/juridisch/retourneren"
              className="font-semibold underline"
            >
              {t("supportReturnPolicy", locale)}
            </Link>{" "}
            — {t("supportReturnPolicyHint", locale)}
          </li>
        </ul>
      </section>

      <ul className="mt-6 list-disc space-y-2 pl-5">
        <li>
          <Link href="/account/messages" className="font-semibold underline">
            {t("supportMessages", locale)}
          </Link>{" "}
          — {t("supportMessagesHint", locale)}
        </li>
        <li>
          <Link href="/juridisch/contact" className="font-semibold underline">
            {t("supportContact", locale)}
          </Link>{" "}
          — {t("supportContactHint", locale)}
        </li>
      </ul>
      <p className="mt-4">{t("supportPageOutro", locale)}</p>
    </ContentPage>
  )
}
