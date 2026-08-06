import type { Metadata } from "next"
import { ContentPage } from "../_components/marketplace/content-page"

export const metadata: Metadata = {
  title: "Over EuropMade — EuropMade",
  description:
    "EuropMade is de marketplace voor producten die daadwerkelijk in Europa zijn geproduceerd.",
}

export default function OverPage() {
  return (
    <ContentPage title="Over EuropMade">
      <p>
        EuropMade is het marketplace-platform voor producten die daadwerkelijk
        in Europa zijn geproduceerd. Wij verkopen zelf geen producten: onafhankelijke
        retailers en producenten bieden hun aanbod aan, en jij koopt rechtstreeks
        bij hen.
      </p>
      <p>
        Elke productpagina bevat gecontroleerde informatie over herkomst,
        producent en materiaal. De Buy Box selecteert automatisch de beste totale
        aanbieding voor jou — nooit op basis van advertenties of commissies.
      </p>
      <p>
        Ons doel: het meest transparante, betrouwbare en eerlijke
        marketplace-platform van Europa.
      </p>
    </ContentPage>
  )
}
