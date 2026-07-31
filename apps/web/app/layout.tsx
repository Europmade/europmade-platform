import type { Metadata } from "next"
import { Suspense } from "react"
import "./globals.css"
import { CookieConsentBanner } from "./_components/cookie-consent-banner"
import { AffiliateClickCapture } from "./_components/affiliate-click-capture"

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
        {children}
        <CookieConsentBanner />
        <Suspense fallback={null}>
          <AffiliateClickCapture />
        </Suspense>
      </body>
    </html>
  )
}
