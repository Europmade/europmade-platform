import type { Metadata } from "next"
import { Suspense } from "react"
import "./globals.css"
import { CookieConsentBanner } from "./_components/cookie-consent-banner"
import { AffiliateClickCapture } from "./_components/affiliate-click-capture"
import { CartProviderRoot } from "./_components/cart/cart-provider-root"
import { getStorefrontLocaleFromCookies } from "./_lib/i18n/get-storefront-locale"
import { t } from "./_lib/i18n/messages"
import { StorefrontLocaleProvider } from "./_lib/i18n/storefront-locale-provider"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  return {
    title: t("metaSiteTitle", locale),
    description: t("metaSiteDescription", locale),
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getStorefrontLocaleFromCookies()
  return (
    <html lang={locale}>
      <body className="font-sans">
        <StorefrontLocaleProvider locale={locale}>
          <CartProviderRoot>{children}</CartProviderRoot>
          <CookieConsentBanner />
          <Suspense fallback={null}>
            <AffiliateClickCapture />
          </Suspense>
        </StorefrontLocaleProvider>
      </body>
    </html>
  )
}
