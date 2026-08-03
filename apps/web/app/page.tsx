import type { Metadata } from "next"
import { Homepage } from "./_components/homepage/homepage"

export const metadata: Metadata = {
  title: "EuropMade — Europese producten, rechtstreeks van de makers",
  description:
    "EuropMade is de marketplace waar je precies weet wie iets maakt, waar het vandaan komt, en bij wie je koopt — vergelijk aanbieders, koop veilig. Uitsluitend producten geproduceerd in Europa.",
  openGraph: {
    title: "EuropMade — Europese producten, rechtstreeks van de makers",
    description:
      "Marketplace voor producten die daadwerkelijk in Europa zijn geproduceerd. Verified™ productinformatie, veilig betalen, 30 dagen retour.",
    locale: "nl_NL",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
}

export default function HomePage() {
  return <Homepage />
}
