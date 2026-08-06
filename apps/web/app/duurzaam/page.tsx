import type { Metadata } from "next"
import { ContentPage } from "../_components/marketplace/content-page"

export const metadata: Metadata = {
  title: "Duurzame producten — EuropMade",
  description: "Duurzaamheid en Europese productie op EuropMade.",
}

export default function DuurzaamPage() {
  return (
    <ContentPage title="Duurzame producten">
      <p>
        EuropMade toont uitsluitend producten die in Europa zijn geproduceerd.
        Daarmee verkorten we onnodige importketens en maken we herkomst
        inzichtelijk.
      </p>
      <p>
        Duurzaamheidskenmerken (materialen, certificeringen) verschijnen op de
        productpagina wanneer de producent die heeft aangeleverd en gecontroleerd.
      </p>
    </ContentPage>
  )
}
