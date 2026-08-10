import type { Metadata } from "next"
import { ContentPage } from "../_components/marketplace/content-page"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t } from "../_lib/i18n/messages"

export const metadata: Metadata = {
  title: "Buy Box — EuropMade",
  description:
    "How EuropMade selects the best overall offer — never based on ads or commissions.",
}

export default async function BuyBoxUitlegPage() {
  const locale = await getStorefrontLocaleFromCookies()
  return (
    <ContentPage title={t("buyBoxPageTitle", locale)}>
      <p>{t("buyBoxPageP1", locale)}</p>
      <p>{t("buyBoxPageP2", locale)}</p>
      <p>{t("buyBoxPageP3", locale)}</p>
    </ContentPage>
  )
}
