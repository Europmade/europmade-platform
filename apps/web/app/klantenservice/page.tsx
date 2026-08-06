import type { Metadata } from "next"
import Link from "next/link"
import { ContentPage } from "../_components/marketplace/content-page"

export const metadata: Metadata = {
  title: "Klantenservice — EuropMade",
  description: "Hulp bij bestellingen, retouren, betalingen en je account.",
}

export default function KlantenservicePage() {
  return (
    <ContentPage title="Klantenservice">
      <p>
        Heb je een vraag over een bestelling, retour of je account? Gebruik de
        onderstaande routes — zo helpen we je sneller.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <Link href="/account/orders" className="font-semibold underline">
            Mijn bestellingen
          </Link>{" "}
          — status, tracking en berichten met de verkoper
        </li>
        <li>
          <Link href="/account/returns" className="font-semibold underline">
            Retouren
          </Link>{" "}
          — retour aanvragen of opvolgen
        </li>
        <li>
          <Link href="/account/messages" className="font-semibold underline">
            Berichten
          </Link>{" "}
          — conversatie met de verkoper over een order
        </li>
        <li>
          <Link href="/juridisch/retourneren" className="font-semibold underline">
            Retourbeleid
          </Link>{" "}
          — termijnen en voorwaarden
        </li>
        <li>
          <Link href="/juridisch/contact" className="font-semibold underline">
            Contact
          </Link>{" "}
          — bereikbaarheid van EuropMade
        </li>
      </ul>
      <p>
        Voor productspecifieke vragen is de verkoper je eerste aanspreekpunt via
        de berichtenfunctie bij je bestelling.
      </p>
    </ContentPage>
  )
}
