import type { Metadata } from "next"
import { ContentPage } from "../_components/marketplace/content-page"

export const metadata: Metadata = {
  title: "Buy Box uitgelegd — EuropMade",
  description:
    "Hoe EuropMade de beste totale aanbieding selecteert — nooit op basis van advertenties of commissies.",
}

export default function BuyBoxUitlegPage() {
  return (
    <ContentPage title="Buy Box uitgelegd">
      <p>
        De Buy Box toont automatisch de beste totale aanbieding voor jou. We
        wegen onder meer prijs, levertijd, beoordeling, voorraad en
        betrouwbaarheid.
      </p>
      <p>
        Advertenties, commissies of platformbelang spelen géén rol bij de
        selectie. Zo blijft de keuze eerlijk voor klant én verkoper.
      </p>
      <p>
        Via &quot;Alle aanbieders bekijken&quot; vergelijk je zelf alle
        beschikbare offers voor hetzelfde product.
      </p>
    </ContentPage>
  )
}
