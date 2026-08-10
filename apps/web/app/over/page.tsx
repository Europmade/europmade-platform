import type { Metadata } from "next"
import { ContentPage } from "../_components/marketplace/content-page"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t } from "../_lib/i18n/messages"

export const metadata: Metadata = {
  title: "Over EuropMade — EuropMade",
  description:
    "EuropMade is de marketplace voor producten die daadwerkelijk in Europa zijn geproduceerd.",
}

export default async function OverPage() {
  const locale = await getStorefrontLocaleFromCookies()
  return (
    <ContentPage title={t("aboutPageTitle", locale)}>
      <p>{t("aboutPageP1", locale)}</p>
      <p>{t("aboutPageP2", locale)}</p>
      <p>{t("aboutPageP3", locale)}</p>
    </ContentPage>
  )
}
