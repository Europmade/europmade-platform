import type { Metadata } from "next"
import { ContentPage } from "../_components/marketplace/content-page"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t } from "../_lib/i18n/messages"

export const metadata: Metadata = {
  title: "Werken bij EuropMade — EuropMade",
  description: "Carrièrepagina van EuropMade.",
}

export default async function CareersPage() {
  const locale = await getStorefrontLocaleFromCookies()
  return (
    <ContentPage title={t("careersPageTitle", locale)}>
      <p>{t("pageInPreparation", locale)}</p>
    </ContentPage>
  )
}
