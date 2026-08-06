import type { Metadata } from "next"
import { ContentPage } from "../../_components/marketplace/content-page"

type LegalDoc = {
  slug: string
  title: string
  paragraphs: string[]
}

const DOCS: LegalDoc[] = [
  {
    slug: "algemene-voorwaarden",
    title: "Algemene voorwaarden",
    paragraphs: [
      "Deze voorwaarden gelden voor het gebruik van het EuropMade-platform. Door een account aan te maken of een bestelling te plaatsen, ga je akkoord met deze voorwaarden.",
      "EuropMade is geen verkoper van de getoonde producten. De koopovereenkomst komt tot stand tussen koper en de betreffende retailer/producent.",
      "Misbruik van het platform, fraude of schending van wet- en regelgeving kan leiden tot opschorting of beëindiging van toegang.",
    ],
  },
  {
    slug: "verzending",
    title: "Verzending",
    paragraphs: [
      "Verzendkosten, levertijden en vervoerders worden per aanbieding door de verkoper bepaald en getoond in de Buy Box en bij checkout.",
      "Bij bestellingen met meerdere verkopers kan de levering in deelzendingen plaatsvinden.",
      "Eventuele vertragingen of beschadigingen meld je via de berichtenfunctie bij je bestelling.",
    ],
  },
  {
    slug: "retourneren",
    title: "Retourneren",
    paragraphs: [
      "Je hebt in beginsel 14 of 30 dagen herroepingsrecht, afhankelijk van de voorwaarden van de gekozen verkoper (zichtbaar op de productpagina).",
      "Retouraanvragen dien je in via Mijn EuropMade → Retouren. De verkoper bevestigt de retourinstructies.",
      "Producten die hygiënisch verzegeld of gepersonaliseerd zijn, kunnen van retourrecht zijn uitgesloten — dit staat vermeld bij de aanbieding.",
    ],
  },
  {
    slug: "betaalmethoden",
    title: "Betaalmethoden",
    paragraphs: [
      "Beschikbare betaalmethoden (zoals iDEAL, creditcard of PayPal) worden bij checkout getoond via de aangesloten payment service provider.",
      "Betaling verloopt veilig via de PSP; EuropMade slaat geen volledige kaartgegevens op.",
      "Bij mislukte betaling wordt de bestelling niet bevestigd.",
    ],
  },
  {
    slug: "disclaimer",
    title: "Disclaimer",
    paragraphs: [
      "Hoewel we streven naar correcte productinformatie (inclusief Verified™-controles), kunnen fouten of wijzigingen voorkomen.",
      "EuropMade is niet aansprakelijk voor de inhoud van externe websites waarnaar wordt verwezen, noch voor handelingen van onafhankelijke verkopers buiten het platform om.",
      "Prijzen en beschikbaarheid kunnen wijzigen tot het moment van orderbevestiging.",
    ],
  },
  {
    slug: "privacybeleid",
    title: "Privacybeleid",
    paragraphs: [
      "We verwerken persoonsgegevens om je account, bestellingen, klantenservice en — met toestemming — affiliate-tracking te laten werken.",
      "Noodzakelijke cookies zijn altijd actief. Overige cookies (zoals affiliate-tracking) alleen na jouw toestemming. Beheer dit via Cookievoorkeuren.",
      "Je kunt inzage, correctie of verwijdering verzoeken via de AVG-routes in je account of via contact.",
    ],
  },
  {
    slug: "copyright",
    title: "Copyright",
    paragraphs: [
      "Teksten, merknaam, logo en vormgeving van EuropMade zijn beschermd. Niets mag zonder toestemming worden gekopieerd voor commercieel gebruik.",
      "Productafbeeldingen en merkinhoud blijven eigendom van de betreffende rechthebbenden (producenten/retailers).",
    ],
  },
  {
    slug: "garanties",
    title: "Garanties",
    paragraphs: [
      "Wettelijke garantie jegens de verkoper blijft van toepassing. Aanvullende producentgarantie staat vermeld op de productpagina.",
      "Claim garantiezaken via de verkoper (berichten/retourflow) of de producent wanneer dat zo is aangegeven.",
    ],
  },
  {
    slug: "terugbetalingsbeleid",
    title: "Terugbetalingsbeleid",
    paragraphs: [
      "Na een goedgekeurde retour of geannuleerde bestelling volgt terugbetaling volgens de betaalmethode en de termijnen van de verkoper/PSP.",
      "Gedeeltelijke terugbetalingen kunnen voorkomen bij deelleveringen of gedeeltelijke retouren.",
      "Platformkosten of niet-restitueerbare verzendkosten kunnen volgens de voorwaarden van de verkoper buiten de terugbetaling vallen.",
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    paragraphs: [
      "Voor ordergerelateerde vragen: gebruik eerst Berichten bij je bestelling (direct naar de verkoper).",
      "Voor platformvragen: via Klantenservice of e-mail info@europmade.eu (reactietijd doorgaans binnen 2 werkdagen).",
      "Postadres en KvK-gegevens worden aangevuld zodra de ondernemingsregistratie voor productie definitief is.",
    ],
  },
]

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const doc = DOCS.find((d) => d.slug === slug)
  if (!doc) return { title: "Juridisch — EuropMade" }
  return { title: `${doc.title} — EuropMade` }
}

export default async function JuridischDocPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const doc = DOCS.find((d) => d.slug === slug)
  if (!doc) {
    return (
      <ContentPage title="Niet gevonden">
        <p>Deze juridische pagina bestaat niet.</p>
      </ContentPage>
    )
  }
  return (
    <ContentPage title={doc.title}>
      {doc.paragraphs.map((p) => (
        <p key={p.slice(0, 40)}>{p}</p>
      ))}
    </ContentPage>
  )
}
