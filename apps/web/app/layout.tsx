import type { Metadata } from "next"
import { Suspense } from "react"
import "./globals.css"
import { CookieConsentBanner } from "./_components/cookie-consent-banner"
import { AffiliateClickCapture } from "./_components/affiliate-click-capture"
import { CartProviderRoot } from "./_components/cart/cart-provider-root"

export const metadata: Metadata = {
  title: "EuropMade — Kwaliteitsproducten uit Europa",
  description:
    "Het meest transparante, betrouwbare en eerlijke marketplace-platform van Europa, voor producten die daadwerkelijk in Europa zijn geproduceerd.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl">
      <body className="font-sans">
        <CartProviderRoot>{children}</CartProviderRoot>
        <CookieConsentBanner />
        <Suspense fallback={null}>
          <AffiliateClickCapture />
        </Suspense>
      </body>
    </html>
  )
}
