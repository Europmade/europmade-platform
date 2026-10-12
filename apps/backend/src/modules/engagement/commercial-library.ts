/**
 * Commerciële berichtenbibliotheek.
 * Alleen concepten: geen goedkeuring, geen activatie, geen verzending.
 * Productteksten komen uit de gepubliceerde catalogus. Ontbrekende triggers staan hier niet.
 */

export const LIBRARY_TOKENS = ["voornaam", "bedrijfsnaam", "email"] as const

export type LibraryAudience = "consumers" | "sellers" | "affiliates"

export type LibraryMessage = {
  id: string
  name: string
  communication_type: "acquisition" | "onboarding" | "newsletter" | "campaign"
  audience: LibraryAudience | null
  layout: "message" | "newsletter"
  subject: string
  preheader: string
  body: string
  cta_label: string
  cta_url: string
  tokens: string[]
  english?: {
    subject: string
    preheader: string
    body: string
    cta_label: string
  }
}

export type LibraryProgram = {
  id: string
  name: string
  program_type: LibraryMessage["communication_type"]
  start_mode: "event" | "condition" | null
  start_trigger: string | null
  audience: LibraryAudience | null
  steps: Array<{ id: string; template_id: string; delay_minutes: number }>
}

const DAY = 1440

function paragraphs(lines: string[]): string {
  return lines.map((line) => `<p>${line}</p>`).join("")
}

function message(lines: string[]): string {
  return paragraphs(lines)
}

function newsletter(input: {
  headline: string
  intro: string[]
  stories?: Array<{ title: string; text: string[] }>
  bind?: string
}): string {
  const parts = [
    "<!--em-layout:newsletter-->",
    "<!--em-hero-->",
    `<h2>${input.headline}</h2>`,
    paragraphs(input.intro),
  ]
  for (const story of input.stories ?? []) {
    parts.push(`<h3>${story.title}</h3>`, paragraphs(story.text))
  }
  if (input.bind) parts.push(`<!--em-bind:${input.bind}-->`)
  return parts.join("")
}

function item(
  message: Omit<LibraryMessage, "tokens"> & { tokens?: string[] }
): LibraryMessage {
  return { tokens: message.tokens ?? [], ...message }
}

export const COMMERCIAL_MESSAGES: LibraryMessage[] = [
  item({
    id: "ctpl_lib_p_why",
    name: "Prospect — Waarom verkopen via EuropMade",
    communication_type: "acquisition",
    audience: null,
    layout: "newsletter",
    subject: "{{bedrijfsnaam}}, kopers zoeken uw Europese aanbod",
    preheader: "Geen abonnement. U betaalt 10% commissie wanneer u verkoopt.",
    cta_label: "Bekijk waarom verkopen",
    cta_url: "/waarom-verkopen",
    tokens: ["voornaam", "bedrijfsnaam"],
    body: newsletter({
      headline: "Kopers zoeken uw Europese aanbod",
      intro: [
        "Hallo {{voornaam}},",
        "EuropMade is het platform waar kopers Europese producten zoeken, vergelijken en bestellen. {{bedrijfsnaam}} blijft de verkoper: u bepaalt het aanbod, de prijs en de levering.",
        "U hoeft uw huidige kanalen niet te sluiten. EuropMade is een extra etalage voor kopers die bewust bij Europese merken en makers kopen.",
        "De Buy Box kiest de beste totale aanbieding voor de klant. Advertenties en commissies bepalen die keuze niet.",
        "Er is geen verplicht abonnement. De verkoopcommissie is 10% en geldt wanneer u verkoopt. Optionele banners of sponsored products zijn apart en alleen als u die zelf aanzet.",
      ],
    }),
    english: {
      subject: "{{bedrijfsnaam}}, buyers are looking for your European range",
      preheader: "No subscription. You pay 10% commission when you sell.",
      cta_label: "See why sellers join",
      body: newsletter({
        headline: "Buyers are looking for your European range",
        intro: [
          "Hello {{voornaam}},",
          "EuropMade is where buyers search, compare and order European products. {{bedrijfsnaam}} stays the seller: you set the offer, the price and the delivery.",
          "You do not have to close your current channels. EuropMade is an extra shop window for people who deliberately buy from European brands and makers.",
          "The Buy Box picks the best total offer for the customer. Ads and commissions do not decide that choice.",
          "There is no mandatory subscription. The sales commission is 10% and applies when you sell. Optional banners or sponsored products are separate, and only if you switch them on.",
        ],
      }),
    },
  }),
  item({
    id: "ctpl_lib_p_origin",
    name: "Prospect — Europese herkomst zichtbaar",
    communication_type: "acquisition",
    audience: null,
    layout: "newsletter",
    subject: "Laat de herkomst van {{bedrijfsnaam}} zien waar kopers vergelijken",
    preheader: "Herkomst, maker en productinformatie horen op de productkaart.",
    cta_label: "Bekijk hoe herkomst werkt",
    cta_url: "/waarom-verkopen",
    tokens: ["voornaam", "bedrijfsnaam"],
    body: newsletter({
      headline: "Europese herkomst hoort op de productkaart",
      intro: [
        "Hallo {{voornaam}},",
        "Op EuropMade is Europese herkomst geen slogan naast de prijs. De productkaart toont wat u vastlegt: maker, herkomst en de informatie waarmee een koper vergelijkt.",
        "Voor {{bedrijfsnaam}} betekent dat: een koper ziet niet alleen een artikel, maar het Europese verhaal dat u kunt onderbouwen. Wat u niet invult, kunnen wij niet tonen.",
        "Made in Europe en European Ownership zijn aparte controles. Die claimt u alleen met de gegevens en het bewijs die bij het product horen. Een mail vervangt die controle niet.",
      ],
    }),
  }),
  item({
    id: "ctpl_lib_p_buyers",
    name: "Prospect — Zichtbaarheid bij Europese kopers",
    communication_type: "acquisition",
    audience: null,
    layout: "newsletter",
    subject: "Kopers die Europees zoeken, vinden {{bedrijfsnaam}} nu niet",
    preheader: "Zichtbaarheid ontstaat uit een complete kaart, niet uit een advertentie.",
    cta_label: "Bekijk het platform",
    cta_url: "/",
    tokens: ["voornaam", "bedrijfsnaam"],
    body: newsletter({
      headline: "Zichtbaar waar kopers Europees vergelijken",
      intro: [
        "Hallo {{voornaam}},",
        "De kopers op EuropMade komen voor Europese merken en producten. Zij filteren en vergelijken. Een leeg of half ingevuld aanbod van {{bedrijfsnaam}} verdwijnt tussen kaarten die wel compleet zijn.",
        "Zichtbaarheid begint bij een gepubliceerd product met een duidelijke naam, foto en omschrijving. Daarna telt de totale aanbieding: prijs, levering en voorraad.",
        "U koopt die plek niet met een hogere commissie. De vergelijking blijft voor de klant.",
      ],
    }),
  }),
  item({
    id: "ctpl_lib_p_publish",
    name: "Prospect — Aanmelden en publiceren",
    communication_type: "acquisition",
    audience: null,
    layout: "newsletter",
    subject: "Zo meldt {{bedrijfsnaam}} zich aan en publiceert u een product",
    preheader: "Account, bedrijfsgegevens, eerste product, daarna publicatie.",
    cta_label: "Start de aanmelding",
    cta_url: "/register?redirect=/partner-onboarding",
    tokens: ["voornaam", "bedrijfsnaam"],
    body: newsletter({
      headline: "Aanmelden en een eerste product publiceren",
      intro: [
        "Hallo {{voornaam}},",
        "Aanmelden is een vaste volgorde. U maakt een account, vult de bedrijfsgegevens van {{bedrijfsnaam}} in en dient de onboarding in. Pas na goedkeuring zet u een aanbod live.",
        "Een product publiceert u met een herkenbare naam, een omschrijving van wat het is, minstens één foto en de levering die u echt waarmaakt.",
        "U hoeft niet meteen een heel assortiment te vullen. Eén complete kaart is genoeg om te zien hoe kopers uw aanbod tegenkomen.",
      ],
    }),
  }),
  item({
    id: "ctpl_lib_p_terms",
    name: "Prospect — Hoe EuropMade werkt en wat het kost",
    communication_type: "acquisition",
    audience: null,
    layout: "newsletter",
    subject: "De afspraak met {{bedrijfsnaam}}: 10% bij verkoop, geen abonnement",
    preheader: "Wat u betaalt, wanneer u betaalt, en wat wij niet bepalen.",
    cta_label: "Lees de afspraak",
    cta_url: "/waarom-verkopen",
    tokens: ["voornaam", "bedrijfsnaam"],
    body: newsletter({
      headline: "10% bij verkoop, geen abonnement",
      intro: [
        "Hallo {{voornaam}},",
        "EuropMade verkoopt uw producten niet zelf. {{bedrijfsnaam}} blijft de verkoper naar de klant. Wij brengen het aanbod bij kopers die Europese producten zoeken.",
        "De verkoopcommissie is 10%. Die geldt wanneer u verkoopt. Er is geen verplicht maandelijks seller-abonnement. Zonder verkoop betaalt u die commissie niet.",
        "Banners, sponsored products en affiliatepromotie zijn optioneel. Affiliatecommissie is een aparte afspraak per seller en staat bij het product, niet als vast percentage in deze mail.",
        "De voorwaarden die bij uw aanmelding horen, leest u vóór u indient. Deze mail vervangt die voorwaarden niet.",
      ],
    }),
  }),
  item({
    id: "ctpl_lib_p_followup",
    name: "Prospect — Opvolging zonder reactie",
    communication_type: "acquisition",
    audience: null,
    layout: "message",
    subject: "Ik laat {{bedrijfsnaam}} niet tussen de andere post verdwijnen",
    preheader: "Kort de kern, voor het geval het eerste bericht is blijven liggen.",
    cta_label: "Plan een kennismaking",
    cta_url: "/waarom-verkopen",
    tokens: ["voornaam", "bedrijfsnaam"],
    body: message([
      "Hallo {{voornaam}},",
      "Ik heb nog geen reactie van {{bedrijfsnaam}} gezien. Dat is geen probleem. Een eerste bericht blijft vaak liggen.",
      "De kern blijft hetzelfde. U houdt uw eigen verkoop. Kopers op EuropMade zoeken Europese producten. U betaalt 10% commissie bij een verkoop en geen abonnement.",
      "Als het moment niet past, hoeft u niets te doen. Als u wilt weten of uw assortiment hier thuishoort, begint dat met de aanmelding of een kort gesprek.",
    ]),
  }),
  item({
    id: "ctpl_lib_p_last",
    name: "Prospect — Laatste bericht zonder reactie",
    communication_type: "acquisition",
    audience: null,
    layout: "message",
    subject: "Laatste bericht aan {{bedrijfsnaam}}",
    preheader: "Hierna stop ik deze reeks, tenzij u zelf reageert.",
    cta_label: "Toch kennismaken",
    cta_url: "/register?redirect=/partner-onboarding",
    tokens: ["voornaam", "bedrijfsnaam"],
    body: message([
      "Hallo {{voornaam}},",
      "Dit is het laatste bericht in deze reeks. Ik blijf {{bedrijfsnaam}} niet benaderen zolang u niet reageert.",
      "De uitnodiging blijft open. Europese kopers vergelijken op EuropMade, u bepaalt het aanbod, en de commissie van 10% geldt alleen bij verkoop.",
      "Een reactie stopt deze automatische opvolging. Dan gaat het gesprek verder met een mens, niet met nog een mail uit deze reeks.",
    ]),
  }),
  item({
    id: "ctpl_lib_p_meeting",
    name: "Prospect — Interesse en kennismakingsgesprek",
    communication_type: "acquisition",
    audience: null,
    layout: "message",
    subject: "Laten we {{bedrijfsnaam}} kort doornemen",
    preheader: "Geen nieuwe reeks. Een gesprek over assortiment, levering en de afspraak.",
    cta_label: "Ga verder met de aanmelding",
    cta_url: "/register?redirect=/partner-onboarding",
    tokens: ["voornaam", "bedrijfsnaam"],
    body: message([
      "Hallo {{voornaam}},",
      "Goed dat {{bedrijfsnaam}} wil weten of EuropMade past. Dit bericht staat klaar voor een menselijke opvolging. De automatische acquisitiereeks stopt zodra u reageert.",
      "In het gesprek kijken we naar drie dingen: welke producten u wilt publiceren, hoe u levert, en of de afspraak van 10% bij verkoop zonder abonnement werkbaar is.",
      "U hoeft voor dat gesprek nog geen assortiment live te zetten. De aanmelding kan alvast open, zodat de bedrijfsgegevens klaarstaan.",
    ]),
  }),
  item({
    id: "ctpl_lib_s_incomplete",
    name: "Verkoper — Aanmelding nog niet afgerond",
    communication_type: "onboarding",
    audience: null,
    layout: "message",
    subject: "De aanmelding van {{bedrijfsnaam}} staat nog op concept",
    preheader: "Alleen zolang de onboarding nog niet is ingediend.",
    cta_label: "Rond de aanmelding af",
    cta_url: "/partner-onboarding",
    tokens: ["voornaam", "bedrijfsnaam"],
    body: message([
      "Hallo {{voornaam}},",
      "U hebt een account voor {{bedrijfsnaam}}, maar de onboarding staat nog op concept. Zonder indiening kunnen we de aanmelding niet beoordelen en kunt u nog niet publiceren.",
      "Wat nog nodig is, staat in uw aanmelding: de bedrijfsgegevens en de stappen die daar nog open zijn. Deze herinnering hoort alleen bij een aanmelding die nog niet is ingediend.",
      "Dient u de onboarding in, dan hoort dit bericht niet meer bij de volgende stap. Goedkeuring en het eerste product volgen daarna apart.",
    ]),
  }),
  item({
    id: "ctpl_lib_c_welcome",
    name: "Consument — Welkom bij EuropMade",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Welkom. Dit is waar u Europese producten vergelijkt",
    preheader: "Eén platform, de verkoper levert, de Buy Box kiest de beste aanbieding.",
    cta_label: "Ontdek waarom kopen",
    cta_url: "/waarom-kopen",
    tokens: [],
    body: newsletter({
      headline: "Welkom bij EuropMade",
      intro: [
        "U zoekt hier producten van Europese merken en makers. U vergelijkt ze op één pagina. De verkoper blijft degene die levert.",
        "De Buy Box kiest de beste totale aanbieding voor u. Niet de advertentie en niet de commissie.",
        "Onderstaand staan producten die nu gepubliceerd zijn. Dit is een selectie uit de catalogus, geen claim dat elk artikel dezelfde herkomst heeft.",
      ],
      bind: "selection",
    }),
    english: {
      subject: "Welcome. This is where you compare European products",
      preheader: "One platform, the seller delivers, the Buy Box picks the best offer.",
      cta_label: "See why people buy here",
      body: newsletter({
        headline: "Welcome to EuropMade",
        intro: [
          "You look here for products from European brands and makers. You compare them on one page. The seller remains the one who delivers.",
          "The Buy Box picks the best total offer for you. Not the ad and not the commission.",
          "Below are products that are published now. This is a selection from the catalogue, not a claim that every item shares the same origin.",
        ],
        bind: "selection",
      }),
    },
  }),
  item({
    id: "ctpl_lib_c_selection",
    name: "Consument — Selectie gepubliceerde merken en producten",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Een selectie uit wat er nu echt gepubliceerd is",
    preheader: "Een selectie uit wat er nu gepubliceerd is.",
    cta_label: "Open de catalogus",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "Nu in de catalogus",
      intro: [
        "Dit zijn gepubliceerde producten. De teksten hieronder volgen de productkaart. Er staat geen korting bij die niet op het aanbod staat.",
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_c_clothing",
    name: "Consument — Selectie kleding",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Kleding die nu in de categorie staat",
    preheader: "Gepubliceerde producten uit de categorie Kleding.",
    cta_label: "Bekijk kleding",
    cta_url: "/categorie/kleding",
    tokens: [],
    body: newsletter({
      headline: "Kleding",
      intro: [
        "De kaarten komen uit de categorie Kleding en gebruiken de foto, de naam en de omschrijving van de catalogus.",
      ],
      bind: "category:kleding",
    }),
  }),
  item({
    id: "ctpl_lib_c_outdoor",
    name: "Consument — Selectie outdoor",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Twee outdoorproducten die nu gepubliceerd zijn",
    preheader: "Gepubliceerde producten uit de categorie Outdoor.",
    cta_label: "Bekijk outdoor",
    cta_url: "/categorie/outdoor",
    tokens: [],
    body: newsletter({
      headline: "Outdoor",
      intro: [
        "De kaarten komen uit de categorie Outdoor. Elk product houdt de foto, de naam en de omschrijving van zijn eigen kaart.",
      ],
      bind: "category:outdoor",
    }),
  }),
  item({
    id: "ctpl_lib_c_home",
    name: "Consument — Selectie elektronica, keuken en huishouden",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Elektronica, keuken en huishouden uit de catalogus",
    preheader: "Gepubliceerde producten uit elektronica, keuken en huishouden.",
    cta_label: "Bekijk elektronica",
    cta_url: "/categorie/elektronica",
    tokens: [],
    body: newsletter({
      headline: "In huis",
      intro: [
        "Vier gepubliceerde producten uit Elektronica, Keuken en Huishouden. Specificaties staan op de productkaart, niet verder aangevuld in deze mail.",
      ],
      bind: "category:elektronica,keuken,huishouden",
    }),
  }),
  item({
    id: "ctpl_lib_c_inspiration",
    name: "Consument — Inspiratie Europese makelij",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Wat de productkaart wél over herkomst zegt",
    preheader: "Alleen de herkomst die in de catalogus staat.",
    cta_label: "Lees waarom kopen",
    cta_url: "/waarom-kopen",
    tokens: [],
    body: newsletter({
      headline: "Herkomst alleen waar de kaart die noemt",
      intro: [
        "EuropMade laat Europese producten zien. Een herkomstzin komt alleen mee als die in de productomschrijving staat.",
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_c_recurring",
    name: "Consument — Terugkerende selectie",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "De selectie van dit moment",
    preheader: "Opnieuw gevuld met producten die nu gepubliceerd zijn.",
    cta_label: "Open de catalogus",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "Wat er nu staat",
      intro: [
        "Dit is de nieuwsbrief voor een volgende selectie. Er is geen herhalend schema dat deze mail vanzelf elke week verstuurt. Een redacteur keurt een versie goed en plant of start hem apart.",
        "De producten hieronder zijn de huidige catalogusselectie. Wissel ze bij een nieuwe editie voor producten die dan gepubliceerd zijn.",
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_c_firstbuy",
    name: "Consument — Eerste aankoop",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "U kijkt mee, u hebt hier nog niets besteld",
    preheader: "Een eerste bestelling begint bij een kaart die klopt.",
    cta_label: "Bekijk een eerste product",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "Begin bij één product",
      intro: [
        "U bent ingeschreven en er staat nog geen bestelling op uw account. Deze mail gaat alleen naar dat geval.",
        "Kies één kaart, controleer het aanbod en de levering, en bestel als dat klopt. Er staat hier geen korting die de verkoper niet heeft gepubliceerd.",
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_c_back30",
    name: "Consument — 30 dagen geen bestelling",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Dertig dagen zonder bestelling",
    preheader: "Een korte selectie uit wat er nu gepubliceerd is.",
    cta_label: "Kijk opnieuw",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "Het is dertig dagen geleden",
      intro: [
        "Sinds uw laatste bestelling, of sinds uw account als u nog niet bestelde, zijn dertig dagen verstreken. Daarom deze selectie.",
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_c_back60",
    name: "Consument — 60 dagen geen bestelling",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Zestig dagen verder",
    preheader: "Alleen als er in die periode geen bestelling was.",
    cta_label: "Open de catalogus",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "Zestig dagen",
      intro: [
        "Er is zestig dagen geen bestelling geplaatst. Deze mail bestaat alleen voor dat gegeven. Er zit geen verzonnen aanbieding aan vast.",
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_c_back90",
    name: "Consument — 90 dagen geen bestelling",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Negentig dagen zonder bestelling",
    preheader: "Een laatste selectie op basis van die termijn.",
    cta_label: "Bekijk wat er nu staat",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "Negentig dagen",
      intro: [
        "Dit is de lange termijn: negentig dagen zonder bestelling. Daarna hoort een nieuwe mail alleen bij een nieuwe termijn of een nieuwe publicatie, niet bij dezelfde stilte.",
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_c_repeat",
    name: "Consument — Terugkerende klant",
    communication_type: "campaign",
    audience: "consumers",
    layout: "newsletter",
    subject: "U hebt al meer dan eens besteld",
    preheader: "Een selectie voor wie de catalogus al kent.",
    cta_label: "Bekijk de selectie",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "Fijn dat u terugkomt",
      intro: [
        "Op uw account staan meerdere bestellingen. Deze mail start alleen in dat geval.",
        "De selectie gebruikt producten die nu gepubliceerd zijn. Het is geen persoonlijk advies op basis van een bekeken categorie. Die gegevens sturen deze reeks niet.",
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_c_newbrand",
    name: "Consument — Nieuw merk gepubliceerd",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Er staat een nieuw merk op EuropMade",
    preheader: "De merkpagina noemt het merk. Deze mail verzint geen naam.",
    cta_label: "Bekijk de merken",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "Een merk is gepubliceerd",
      intro: [
        "De naam, het logo en de producten komen van de merkpagina en de catalogus. Deze tekst vult geen merknaam in.",
      ],
      bind: "brand",
    }),
  }),
  item({
    id: "ctpl_lib_c_newproduct",
    name: "Consument — Nieuw product gepubliceerd",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Een nieuw product is gepubliceerd",
    preheader: "De productkaart heeft de naam, de foto en de omschrijving.",
    cta_label: "Open de catalogus",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "Een product is gepubliceerd",
      intro: [
        "Naam, foto, merk en omschrijving komen van de productkaart. Prijs en levering blijven bij het aanbod.",
      ],
      bind: "product",
    }),
  }),
  item({
    id: "ctpl_lib_c_category",
    name: "Consument — Categorie met drie merken",
    communication_type: "newsletter",
    audience: "consumers",
    layout: "newsletter",
    subject: "Een categorie heeft nu producten van minstens drie merken",
    preheader: "Dat moment is gemeten. De categorienaam staat in de shop.",
    cta_label: "Bekijk de categorieën",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "Een categorie is breed genoeg",
      intro: [
        "Deze selectie toont gepubliceerde producten uit een categorie met minstens drie merken. De kaarten komen uit die categorie.",
      ],
      bind: "category-live",
    }),
  }),
  item({
    id: "ctpl_lib_c_offer",
    name: "Consument — Gepubliceerde actie",
    communication_type: "campaign",
    audience: "consumers",
    layout: "newsletter",
    subject: "Er is een actie gepubliceerd",
    preheader: "Prijs en periode staan bij het aanbod, niet in deze tekst.",
    cta_label: "Bekijk het aanbod",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "Een actie is nu geldig",
      intro: [
        "Alleen een aanbod met een actieprijs en een ingegane periode komt hierin. Ontbreekt die periode, dan blijft de actie uit deze nieuwsbrief.",
      ],
      bind: "offer",
    }),
  }),
  item({
    id: "ctpl_lib_c_delivered",
    name: "Consument — Na de eerste levering",
    communication_type: "campaign",
    audience: "consumers",
    layout: "newsletter",
    subject: "Uw eerste bestelling is geleverd",
    preheader: "Een volgende selectie, zonder een korting die er niet is.",
    cta_label: "Kijk verder",
    cta_url: "/",
    tokens: [],
    body: newsletter({
      headline: "De eerste levering is binnen",
      intro: [
        "Uw eerste bestelling is als geleverd gemarkeerd. Daarom deze ene vervolgmail.",
        "Hieronder staan andere gepubliceerde producten. Het is geen aanbeveling op basis van wat u bekeek. Die gegevens gebruiken we hier niet.",
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_a_welcome",
    name: "Affiliate — Welkom en promotie",
    communication_type: "newsletter",
    audience: "affiliates",
    layout: "newsletter",
    subject: "Uw affiliateaccount is goedgekeurd",
    preheader: "U promoot producten. De verkoper levert. De commissie staat bij het product.",
    cta_label: "Open het dashboard",
    cta_url: "/affiliate/dashboard",
    tokens: [],
    body: newsletter({
      headline: "U kunt nu promoten",
      intro: [
        "Uw aanmelding als affiliatepartner is goedgekeurd. U deelt trackinglinks naar producten. De verkoper blijft degene die levert.",
        "U verdient commissie op een bestelling die via uw link wordt toegeschreven. Het percentage maakt u niet zelf: het is de commissie van de verkopende seller plus de EuropMade-bijdrage van 3 procentpunt.",
      ],
      bind: "selection",
    }),
    english: {
      subject: "Your affiliate account is approved",
      preheader: "You promote products. The seller delivers. The commission is shown on the product.",
      cta_label: "Open the dashboard",
      body: newsletter({
        headline: "You can promote now",
        intro: [
          "Your affiliate application is approved. You share tracking links to products. The seller remains the one who delivers.",
          "You earn commission on an order attributed through your link. You do not set the percentage: it is the selling seller’s commission plus EuropMade’s contribution of 3 percentage points.",
        ],
        bind: "selection",
      }),
    },
  }),
  item({
    id: "ctpl_lib_a_links",
    name: "Affiliate — Trackinglinks en commissie",
    communication_type: "newsletter",
    audience: "affiliates",
    layout: "message",
    subject: "Zo werkt een trackinglink",
    preheader: "Link, toestemming, 30 dagen attributie. Geen zelf verzonnen percentage.",
    cta_label: "Maak een trackinglink",
    cta_url: "/affiliate/dashboard/products",
    tokens: [],
    body: message([
      "U kiest een product in het dashboard en maakt een trackinglink. Die link legt u en het product vast. Het aanbod waarop iemand landt, bepaalt niet welke seller later de commissie betaalt.",
      "Attributie geldt 30 dagen na een geldige klik met cookietoestemming. Een bestelling op uw eigen account levert geen commissie op.",
      "Het percentage bij het product is berekend: de productcommissie van de verkopende seller, of anders de standaard van die seller, plus 3 procentpunt EuropMade. Deze mail vult daar geen ander cijfer voor in.",
    ]),
  }),
  item({
    id: "ctpl_lib_a_firstpromo",
    name: "Affiliate — Eerste promotie",
    communication_type: "newsletter",
    audience: "affiliates",
    layout: "newsletter",
    subject: "Zet uw eerste link live",
    preheader: "Eén product, één link, de kaart als bron.",
    cta_label: "Kies een product",
    cta_url: "/affiliate/dashboard/products",
    tokens: [],
    body: newsletter({
      headline: "Begin met één product",
      intro: [
        "Gebruik de naam, de foto en de omschrijving van de kaart. De commissie is alleen het berekende percentage. De trackinglink maakt u in het dashboard.",
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_a_selection",
    name: "Affiliate — Merken en producten om te promoten",
    communication_type: "newsletter",
    audience: "affiliates",
    layout: "newsletter",
    subject: "Producten die u nu kunt linken",
    preheader: "Uit de gepubliceerde catalogus. Commissie ziet u bij het product.",
    cta_label: "Open de productkiezer",
    cta_url: "/affiliate/dashboard/products",
    tokens: [],
    body: newsletter({
      headline: "Nu te promoten",
      intro: [
        "Deze selectie gebruikt gepubliceerde producten. De commissie staat niet als vast cijfer in de tekst, omdat die per verkoper en product wordt berekend.",
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_a_categories",
    name: "Affiliate — Selectie per categorie",
    communication_type: "newsletter",
    audience: "affiliates",
    layout: "newsletter",
    subject: "Vier categorieën, zeven echte producten",
    preheader: "Kleding, outdoor, elektronica, keuken en huishouden.",
    cta_label: "Kies een categorie",
    cta_url: "/affiliate/dashboard/products",
    tokens: [],
    body: newsletter({
      headline: "Per categorie",
      intro: ["Elk blok is een gepubliceerd product in zijn categorie. Link naar de productkaart, niet naar een verzonnen actiepagina."],
      stories: [
        { title: "Hoe u selecteert", text: ["De kaarten hieronder zijn gepubliceerde producten. Hun categorie staat bij de kaart, niet als een verzonnen lijst."] },
      ],
      bind: "selection",
    }),
  }),
  item({
    id: "ctpl_lib_a_offer",
    name: "Affiliate — Actie alleen met echte voorwaarden",
    communication_type: "campaign",
    audience: "affiliates",
    layout: "newsletter",
    subject: "Promoot een actie alleen als de periode op het aanbod staat",
    preheader: "Geen campagnedatum en geen korting die wij hier bedenken.",
    cta_label: "Controleer het aanbod",
    cta_url: "/affiliate/dashboard/products",
    tokens: [],
    body: newsletter({
      headline: "Alleen een geldige actie",
      intro: [
        "Prijs en periode komen van het aanbod. Er is geen automatische start voor een affiliatecampagne. Deze nieuwsbrief toont alleen een actie die nu geldig is.",
      ],
      bind: "offer",
    }),
  }),
  item({
    id: "ctpl_lib_a_commission",
    name: "Affiliate — Commissie zoals berekend",
    communication_type: "newsletter",
    audience: "affiliates",
    layout: "newsletter",
    subject: "De commissie staat bij het product, niet in een vast tarief",
    preheader: "Sellercommissie plus 3 procentpunt EuropMade. Geen verzonnen verdienste.",
    cta_label: "Bekijk de commissie per product",
    cta_url: "/affiliate/dashboard/products",
    tokens: [],
    body: newsletter({
      headline: "Wat u kunt noemen",
      intro: [
        "Noem het percentage dat bij het product is berekend. Dat is de productcommissie van de verkopende seller, of de standaard van die seller als er geen productregel is, plus 3 procentpunt.",
        "Noem geen eurobedrag. De orderwaarde is nog niet bekend. Een wijziging van de commissieafspraak heeft nog geen eigen automatische mail.",
      ],
      bind: "commission",
    }),
  }),
  item({
    id: "ctpl_lib_a_tips",
    name: "Affiliate — Tips voor promotie en content",
    communication_type: "newsletter",
    audience: "affiliates",
    layout: "message",
    subject: "Vier regels voor een productpost",
    preheader: "Gebruik de kaart. Verzin geen voorraad, korting of herkomst.",
    cta_label: "Pak een productkaart",
    cta_url: "/affiliate/dashboard/products",
    tokens: [],
    body: message([
      "Gebruik de productnaam, de hoofdfoto en een korte zin uit de omschrijving. Dat is genoeg voor een eerste post.",
      "Zet de trackinglink op de koopknop, niet op een losse homepage, zodat de attributie bij het product hoort.",
      "Schrijf geen korting, levertijd of land van herkomst die niet op de kaart staan. De commissie noemt u alleen zoals het dashboard die berekent.",
      "Eén product per post is duidelijker dan een lijst zonder context. Een categorie-overzicht maakt u pas wanneer u de kaarten echt hebt gelezen.",
    ]),
  }),
  item({
    id: "ctpl_lib_a_firstsale",
    name: "Affiliate — Eerste toegeschreven verkoop",
    communication_type: "newsletter",
    audience: "affiliates",
    layout: "message",
    subject: "Uw eerste toegeschreven verkoop staat vast",
    preheader: "Het bedrag en het percentage komen uit de commissieregel, niet uit deze mail.",
    cta_label: "Bekijk uw commissies",
    cta_url: "/affiliate/dashboard/commissions",
    tokens: [],
    body: message([
      "Er is een eerste verkoop aan u toegeschreven. Het percentage, het bedrag en de seller staan op de commissieregel van die order. Een latere wijziging van sellerinstellingen verandert die regel niet.",
      "Uitbetaling volgt de bestaande termijn, inclusief de retourperiode. Deze mail noemt geen bedrag.",
      "Een volgende link maakt u op dezelfde manier: product kiezen, trackinglink, alleen feiten van de kaart.",
    ]),
  }),
  item({
    id: "ctpl_lib_a_newbrand",
    name: "Affiliate — Nieuw merk om te promoten",
    communication_type: "newsletter",
    audience: "affiliates",
    layout: "newsletter",
    subject: "Een nieuw merk is gepubliceerd",
    preheader: "Wacht met promoten tot de producten van dat merk zelf live zijn.",
    cta_label: "Zoek producten van nieuwe merken",
    cta_url: "/affiliate/dashboard/products",
    tokens: [],
    body: newsletter({
      headline: "Een merk om te bekijken",
      intro: [
        "Naam en beeld komen van de merkpagina. Producten alleen als ze gepubliceerd zijn. De commissie is de berekende commissie bij die kaart.",
      ],
      bind: "brand",
    }),
  }),
  item({
    id: "ctpl_lib_a_newproduct",
    name: "Affiliate — Nieuw product om te promoten",
    communication_type: "newsletter",
    audience: "affiliates",
    layout: "newsletter",
    subject: "Een nieuw product kan een trackinglink krijgen",
    preheader: "Open de kaart voordat u de naam, de foto of de commissie overneemt.",
    cta_label: "Open de productkiezer",
    cta_url: "/affiliate/dashboard/products",
    tokens: [],
    body: newsletter({
      headline: "Een product om te linken",
      intro: [
        "Naam, foto en omschrijving komen van de kaart. De trackinglink maakt u in het dashboard. De commissie is de berekening bij dit product.",
      ],
      bind: "product",
    }),
  }),
]

const sequence = (
  programId: string,
  steps: Array<[string, number]>
): LibraryProgram["steps"] =>
  steps.map(([template_id, delay_minutes], index) => ({
    id: `estp_${programId.replace("elpr_", "")}_${index + 1}`,
    template_id,
    delay_minutes,
  }))

export const COMMERCIAL_PROGRAMS: LibraryProgram[] = [
  {
    id: "elpr_lib_prospects",
    name: "Prospecten overtuigen om te verkopen",
    program_type: "acquisition",
    start_mode: null,
    start_trigger: null,
    audience: null,
    steps: sequence("elpr_lib_prospects", [
      ["ctpl_lib_p_why", 0],
      ["ctpl_lib_p_origin", 3 * DAY],
      ["ctpl_lib_p_buyers", 4 * DAY],
      ["ctpl_lib_p_publish", 4 * DAY],
      ["ctpl_lib_p_terms", 3 * DAY],
      ["ctpl_lib_p_followup", 5 * DAY],
      ["ctpl_lib_p_last", 7 * DAY],
    ]),
  },
  {
    id: "elpr_lib_incomplete",
    name: "Aanmelding nog niet afgerond",
    program_type: "onboarding",
    start_mode: "condition",
    start_trigger: "account_created",
    audience: "sellers",
    steps: sequence("elpr_lib_incomplete", [["ctpl_lib_s_incomplete", 2 * DAY]]),
  },
  {
    id: "elpr_lib_c_welcome",
    name: "Consument welkom",
    program_type: "newsletter",
    start_mode: "event",
    start_trigger: "consumer_newsletter_subscribed",
    audience: "consumers",
    steps: sequence("elpr_lib_c_welcome", [["ctpl_lib_c_welcome", 0]]),
  },
  {
    id: "elpr_lib_c_firstbuy",
    name: "Consument eerste aankoop",
    program_type: "newsletter",
    start_mode: "condition",
    start_trigger: "consumer_subscribed_no_order",
    audience: "consumers",
    steps: sequence("elpr_lib_c_firstbuy", [["ctpl_lib_c_firstbuy", 2 * DAY]]),
  },
  {
    id: "elpr_lib_c_back30",
    name: "Consument zonder bestelling na 30, 60 en 90 dagen",
    program_type: "newsletter",
    start_mode: "condition",
    start_trigger: "consumer_inactive_30d",
    audience: "consumers",
    steps: sequence("elpr_lib_c_back30", [
      ["ctpl_lib_c_back30", 0],
      ["ctpl_lib_c_back60", 30 * DAY],
      ["ctpl_lib_c_back90", 30 * DAY],
    ]),
  },
  {
    id: "elpr_lib_c_repeat",
    name: "Consument die terugkeert",
    program_type: "campaign",
    start_mode: "condition",
    start_trigger: "consumer_repeat_order",
    audience: "consumers",
    steps: sequence("elpr_lib_c_repeat", [["ctpl_lib_c_repeat", 0]]),
  },
  {
    id: "elpr_lib_c_delivered",
    name: "Consument na eerste levering",
    program_type: "campaign",
    start_mode: "event",
    start_trigger: "consumer_first_order_received",
    audience: "consumers",
    steps: sequence("elpr_lib_c_delivered", [["ctpl_lib_c_delivered", 0]]),
  },
  {
    id: "elpr_lib_c_newbrand",
    name: "Consument nieuw merk",
    program_type: "newsletter",
    start_mode: "event",
    start_trigger: "brand_published",
    audience: "consumers",
    steps: sequence("elpr_lib_c_newbrand", [["ctpl_lib_c_newbrand", 0]]),
  },
  {
    id: "elpr_lib_c_newproduct",
    name: "Consument nieuw product",
    program_type: "newsletter",
    start_mode: "event",
    start_trigger: "consumer_product_published",
    audience: "consumers",
    steps: sequence("elpr_lib_c_newproduct", [["ctpl_lib_c_newproduct", 0]]),
  },
  {
    id: "elpr_lib_c_category",
    name: "Consument categorie met drie merken",
    program_type: "newsletter",
    start_mode: "condition",
    start_trigger: "category_three_brands",
    audience: "consumers",
    steps: sequence("elpr_lib_c_category", [["ctpl_lib_c_category", 0]]),
  },
  {
    id: "elpr_lib_c_offer",
    name: "Consument gepubliceerde actie",
    program_type: "campaign",
    start_mode: "event",
    start_trigger: "offer_published",
    audience: "consumers",
    steps: sequence("elpr_lib_c_offer", [["ctpl_lib_c_offer", 0]]),
  },
  {
    id: "elpr_lib_a_welcome",
    name: "Affiliate welkom en eerste promotie",
    program_type: "newsletter",
    start_mode: "event",
    start_trigger: "affiliate_approved",
    audience: "affiliates",
    steps: sequence("elpr_lib_a_welcome", [
      ["ctpl_lib_a_welcome", 0],
      ["ctpl_lib_a_links", 2 * DAY],
      ["ctpl_lib_a_tips", 4 * DAY],
      ["ctpl_lib_a_firstpromo", 3 * DAY],
    ]),
  },
  {
    id: "elpr_lib_a_firstsale",
    name: "Affiliate eerste verkoop",
    program_type: "newsletter",
    start_mode: "event",
    start_trigger: "affiliate_first_sale",
    audience: "affiliates",
    steps: sequence("elpr_lib_a_firstsale", [["ctpl_lib_a_firstsale", 0]]),
  },
  {
    id: "elpr_lib_a_newbrand",
    name: "Affiliate nieuw merk",
    program_type: "newsletter",
    start_mode: "event",
    start_trigger: "affiliate_brand_published",
    audience: "affiliates",
    steps: sequence("elpr_lib_a_newbrand", [["ctpl_lib_a_newbrand", 0]]),
  },
  {
    id: "elpr_lib_a_newproduct",
    name: "Affiliate nieuw product",
    program_type: "newsletter",
    start_mode: "event",
    start_trigger: "affiliate_product_published",
    audience: "affiliates",
    steps: sequence("elpr_lib_a_newproduct", [["ctpl_lib_a_newproduct", 0]]),
  },
]

export const DRAFT_IMPROVEMENTS = [
  {
    template_name: "Welkom bij EuropMade",
    version_number: 2,
    subject: "Welkom bij EuropMade, {{voornaam}}",
    preheader: "Bedrijfsgegevens, een eerste product, daarna pas publiceren.",
    cta_label: "Ga naar uw start",
    cta_url: "/seller",
    tokens: ["voornaam", "bedrijfsnaam"],
    body: message([
      "Hallo {{voornaam}},",
      "{{bedrijfsnaam}} is binnen. U kunt nu de gegevens controleren en het eerste product voorbereiden. Publiceren doet u pas wanneer de kaart compleet is: naam, omschrijving, foto en levering.",
      "EuropMade verkoopt niet in uw plaats. Kopers vergelijken Europese producten. De verkoopcommissie is 10% wanneer u verkoopt. Er is geen verplicht abonnement.",
      "De goedgekeurde versie van dit bericht blijft de versie die een actieve reeks gebruikt. Dit concept ligt klaar voor een volgende beoordeling.",
    ]),
  },
]
