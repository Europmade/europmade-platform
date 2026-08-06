import type { Metadata } from "next"
import { ContentPage } from "../_components/marketplace/content-page"

export const metadata: Metadata = {
  title: "Verified™ — EuropMade",
  description: "Wat Verified™ productinformatie betekent op EuropMade.",
}

export default function VerifiedPage() {
  return (
    <ContentPage title="Verified™">
      <p>
        Verified™ betekent dat herkomst- en productinformatie is gecontroleerd
        volgens de EuropMade-regels: productie in Europa, traceerbare
        producentgegevens en geen misleidende claims.
      </p>
      <p>
        Verified™ zegt iets over de productinformatie — niet over welke
        aanbieder de Buy Box wint.
      </p>
    </ContentPage>
  )
}
