import type { Metadata } from "next"
import {
  ContentNav,
  ContentPage,
} from "../_components/marketplace/content-page"

export const metadata: Metadata = {
  title: "Juridisch — EuropMade",
  description: "Voorwaarden, privacy, retouren, betalingen en overige juridische informatie.",
}

const LINKS = [
  { href: "/juridisch/algemene-voorwaarden", label: "Algemene voorwaarden" },
  { href: "/juridisch/verzending", label: "Verzending" },
  { href: "/juridisch/retourneren", label: "Retourneren" },
  { href: "/juridisch/betaalmethoden", label: "Betaalmethoden" },
  { href: "/juridisch/disclaimer", label: "Disclaimer" },
  { href: "/juridisch/privacybeleid", label: "Privacybeleid" },
  { href: "/juridisch/copyright", label: "Copyright" },
  { href: "/juridisch/garanties", label: "Garanties" },
  { href: "/juridisch/terugbetalingsbeleid", label: "Terugbetalingsbeleid" },
  { href: "/juridisch/contact", label: "Contact" },
]

export default function JuridischIndexPage() {
  return (
    <ContentPage title="Juridisch">
      <p>
        Hier vind je de juridische informatie van EuropMade. EuropMade is een
        marketplace: de koopovereenkomst komt tot stand tussen jou en de
        verkoper. EuropMade faciliteert het platform.
      </p>
      <ContentNav items={LINKS} />
    </ContentPage>
  )
}
