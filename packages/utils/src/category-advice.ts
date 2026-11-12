import type { CategoryV2FilterFacet } from "./category-v2-listing.ts"
import { categoryFacetLabelKey } from "./category-v2-listing.ts"

export type AdviceLink = { label: string; href: string }

export type AdviceSection = {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
  links?: AdviceLink[]
}

export type AdviceSelectionCandidate = {
  label: string
  href?: string
  match?: {
    label: string
    values?: string[]
    /** Any filled value except an explicit no. */
    positive?: boolean
    min?: number
    max?: number
    /** Hide the link when the range would keep every product. */
    subset?: boolean
  }
}

export type CategoryAdvice = {
  slug: string
  path: string
  metaTitle: string
  metaDescription: string
  heroTitle: string
  heroIntro: string
  imageSrc: string
  imageAlt: string
  imagePosition: string
  referralTitle: string
  referralIntro: string
  referralCta: string
  topicsTitle: string
  topics: Array<{ id: string; title: string }>
  sections: AdviceSection[]
  faqs: Array<{ question: string; answer: string }>
  selectionsTitle: string
  selectionsIntro: string
  selections: AdviceSelectionCandidate[]
  replacesGuideHeadings: string[]
}

const WASHERS = "/categorie/wasmachines"
const DRYERS = "/categorie/wasdrogers"
const COMBOS = "/categorie/was-droogcombinaties"
const LAUNDRY_PAIR = "/categorie/wasmachines-en-drogers"

const WASHER_ADVICE: CategoryAdvice = {
  slug: "wasmachines",
  path: "/advies/wasmachines",
  metaTitle: "Welke wasmachine past bij jou?",
  metaDescription:
    "Keuzehulp voor een wasmachine: vulgewicht, afmetingen, energielabel, geluid, toerental, functies en het verschil met een losse droger of was-droogcombinatie.",
  heroTitle: "Welke wasmachine past bij jou?",
  heroIntro:
    "De juiste wasmachine hangt af van je huishouden, hoeveel was je draait, de plek die je hebt en wat je prettig vindt in gebruik. Er is geen model dat voor iedereen de beste keuze is. Op deze pagina lees je waar je op let, en daarna vergelijk je de machines die EuropMade nu toont.",
  imageSrc: "/category/atmosphere/huishouden-hero.png",
  imageAlt: "Lichte wasruimte met een volledige wasmachine, plant en wasmand",
  imagePosition: "center 55%",
  referralTitle: "Welk advies helpt jou bij het kiezen?",
  referralIntro:
    "Vulgewicht, plek, energie, geluid en functies bepalen samen of een wasmachine past. De keuzehulp zet die onderwerpen op een rij, zonder een model als beste aan te wijzen.",
  referralCta: "Bekijk de keuzehulp en het koopadvies",
  topicsTitle: "Snel naar het juiste advies",
  topics: [
    { id: "huishouden", title: "Welk vulgewicht heb ik nodig?" },
    { id: "afmetingen", title: "Welke afmetingen passen bij mijn ruimte?" },
    { id: "energie", title: "Hoe zuinig moet mijn wasmachine zijn?" },
    { id: "geluid", title: "Hoe stil moet mijn wasmachine zijn?" },
    { id: "toerental", title: "Welk toerental heb ik nodig?" },
    { id: "functies", title: "Welke functies zijn voor mij nuttig?" },
    { id: "bouwkwaliteit", title: "Hoe belangrijk is de bouwkwaliteit?" },
    { id: "combinatie", title: "Een wasmachine met droger of een was-droogcombinatie?" },
  ],
  sections: [
    {
      id: "huishouden",
      title: "Kies op basis van jouw huishouden",
      paragraphs: [
        "Het vulgewicht is het gewicht droge was dat de fabrikant opgeeft voor het programma op het energielabel, meestal katoen. Dat getal is geen voorschrift voor elke was die je draait. Synthetisch en fijn wasgoed vul je niet tot dat maximum.",
        "Hoeveel kilogram bij je past, volgt uit een paar vragen tegelijk. Hoeveel mensen wassen er mee? Was je om de dag of één keer in de week? Gaan dekbedovertrekken en handdoeken in dezelfde trommel? En heb je soms een echt grote beurt, of juist veel kleine?",
        "Een klein huishouden dat beddengoed meewast, kan dezelfde trommel nodig hebben als een groter huishouden dat vaker kleine wasjes draait. Consumentenorganisaties geven daarom alleen een richting, geen vast aantal kilo per persoon. Gebruik het vulgewicht dat bij het model staat en vergelijk de machines op dat getal.",
      ],
      links: [{ label: "Bekijk de wasmachines", href: WASHERS }],
    },
    {
      id: "afmetingen",
      title: "Afmetingen en plaatsing",
      paragraphs: [
        "Meet de vrije breedte, hoogte en diepte voordat je een model kiest. Tel de ruimte achter de machine mee voor de slang en de stekker, en de ruimte die de deur nodig heeft om open te gaan. Een machine die op papier in de nis past, kan alsnog klemmen als de deur tegen een kast of de wasmand botst.",
        "Kijk op het model of de deur links of rechts opent, wanneer dat is ingevuld. In een smalle bijkeuken is die draairichting vaak belangrijker dan een extra programma.",
        "Een wasmachine kan in de badkamer, de keuken of de bijkeuken staan. Wat je nodig hebt, is een geschikte wateraanvoer, een afvoer en een geaard stopcontact. Vocht, een oneffen vloer en een te krappe nis los je niet op met een specificatie op de kaart. Volg het installatievoorschrift van dat model.",
        "Waterbeveiliging, zoals een toevoerslang die de waterstroom begrenst, geldt alleen als het model die bescherming noemt. Het vervangt geen goede aansluiting.",
        "Wil je later een droger erboven? Dan moet de wasmachine waterpas staan en moet de droger met een passende stapelset op die machine kunnen. Zet nooit de wasmachine bovenop de droger.",
      ],
      links: [{ label: "Vergelijk de wasmachines", href: WASHERS }],
    },
    {
      id: "energie",
      title: "Energie- en waterverbruik",
      paragraphs: [
        "Het huidige Europese energielabel voor wasmachines gebruikt de schaal A tot en met G. A is op die schaal de zuinigste klasse. Een oude aanduiding als A+++ hoort bij het vorige label en is niet dezelfde klasse als de A van nu.",
        "Het label hoort bij het testprogramma Eco 40-60. Daarop staan het gewogen stroomverbruik in kilowattuur per 100 wasbeurten, het waterverbruik in liters per wasbeurt en de centrifuge-efficiëntie. Die getallen maken modellen vergelijkbaar, omdat ze op dezelfde meetwijze zijn gebaseerd.",
        "Je werkelijke verbruik wijkt daarvan af. Een heet programma, een volle of juist bijna lege trommel en een korte was vragen andere hoeveelheden stroom en water. Vergelijk daarom de klasse én de getallen op het label, en lees het programma dat jij vaak gebruikt. Deze pagina rekent dat niet om naar een bedrag op je jaarrekening.",
      ],
      links: [{ label: "Bekijk de wasmachines", href: WASHERS }],
    },
    {
      id: "geluid",
      title: "Geluidsniveau",
      paragraphs: [
        "Wassen en centrifugeren klinken niet hetzelfde. Tijdens het wassen hoor je water en de trommel. Tijdens het centrifugeren loopt het toerental op en kan de machine meer dreunen, zeker als de was scheef ligt.",
        "Op het energielabel staat het geluid van het centrifugeren in decibel, met een geluidsklasse. Een lager getal is op die meting stiller dan een hoger getal. Er is geen decibelwaarde waarvan je kunt zeggen dat die voor elk huis stil genoeg is.",
        "In een open keuken of een kleine woning hoor je de machine in de kamer. Zet de opgegeven decibelwaarden van de modellen naast elkaar, en bedenk of de machine naast de zithoek staat of achter een dichte deur. Het getal op de kaart is het getal uit het productdossier, geen belofte over jouw vloer of muur.",
      ],
    },
    {
      id: "toerental",
      title: "Toerental en centrifugeren",
      paragraphs: [
        "Het toerental is het aantal omwentelingen van de trommel per minuut tijdens het centrifugeren. Een hoger toerental haalt doorgaans meer water uit de was, zodat het wasgoed minder nat uit de machine komt.",
        "Dat is nuttig als je daarna droogt in een droger, op een rek in huis of als je grote stukken katoen wast. Het is niet voor iedereen nodig. Wie de was buiten ophangt of kreuk wilt beperken, heeft aan een lager toerental soms genoeg. Een hoger toerental kan kreukelijker wasgoed geven.",
        "Het verschil tussen 1400 en 1600 toeren is geen vaste stap in droogte voor elke lading. Het label noemt ook de centrifuge-efficiëntieklasse van het testprogramma. Vergelijk die klasse en het opgegeven toerental van het model, en kies wat bij jouw manier van drogen past.",
      ],
    },
    {
      id: "functies",
      title: "Functies en technieken",
      paragraphs: [
        "Een functie telt alleen mee als die bij het model is vermeld. Staat ze er niet bij, dan is niet bekend of de machine haar heeft. Namen verschillen per merk. Hieronder staan functies die bij wasmachines voorkomen, en wanneer ze iets toevoegen.",
      ],
      bullets: [
        "Stoomfunctie. Sommige programma's gebruiken stoom om kreuk te verminderen of een kledingstuk op te frissen. Dat is geen vervanging voor een wasbeurt van vuile was. Alleen nuttig als je die programma's echt gaat gebruiken.",
        "Automatische wasmiddeldosering. De machine doseert uit een reservoir. Handig als je niet bij elke beurt wilt afmeten. Minder relevant als je zelf doseert of een vorm van wasmiddel gebruikt die het model niet ondersteunt.",
        "Snelwasprogramma. Een korter programma, vaak voor een kleinere lading of minder vuile was. Kijk in de programmabeschrijving voor welke belading het bedoeld is.",
        "Beladingssensor. De machine past water of tijd aan de hoeveelheid was aan, wanneer het model die sensor heeft. Je hoeft de trommel dan niet altijd vol te maken, maar je sorteert nog steeds op textiel en vuil.",
        "Wifi en een app. Daarmee start of volg je een programma op afstand, als het model dat biedt. Je hebt het netwerk en de app van dat merk nodig. Zonder wifi wast de machine gewoon.",
        "Trommelreiniging. Een onderhoudsprogramma voor de trommel. Het vervangt niet het afnemen van de rubbers en het open laten van de deur na een wasbeurt.",
        "Waterbeveiliging. Een slang of sensor die de gevolgen van een lekkage beperkt, alleen als het model die bescherming noemt.",
      ],
    },
    {
      id: "bouwkwaliteit",
      title: "Bouwkwaliteit en levensduur",
      paragraphs: [
        "Hoe lang een wasmachine meegaat, hangt af van het model, het gebruik en het onderhoud. Een jaartal of een belofte over levensduur hoort daar niet bij, en die geven we hier niet.",
        "Wat je wél kunt vergelijken, is wat er van het model is vastgelegd: het type motor als dat vermeld is, het materiaal van de trommel als dat vermeld is, en of er een vorm van lekbescherming bij staat. Een zwaardere machine staat vaak vaster, maar gewicht alleen zegt niets over hoe lang ze meegaat.",
        "De garantie lees je bij de aanbieding van de verkoper. Die kan per verkoper verschillen. Onderhoud doet meer voor geur en slijtage dan een slogan: maak het wasmiddellaatje en de deurrubber schoon, laat de deur na afloop op een kier en draai af en toe een hete onderhoudswas zoals de handleiding van het model dat beschrijft.",
      ],
    },
    {
      id: "combinatie",
      title: "Wasmachine, losse droger of was-droogcombinatie?",
      paragraphs: [
        "Alleen een wasmachine wast. Drogen doe je daarna aan de lijn, op een rek of in een aparte droger. Dat is de eenvoudigste opstelling als je de ruimte of de droger nog niet hebt.",
        "Een wasmachine met een losse droger geeft twee apparaten. Je kunt een volgende was starten terwijl de eerste droogt. Je hebt vloeroppervlak nodig, of een stapelset zodat de droger bovenop de wasmachine staat. Stem de droogcapaciteit af op de was die je echt droogt; die is niet vanzelf gelijk aan het maximale vulgewicht van de wasmachine.",
        "Een was-droogcombinatie doet beide in één kast. Dat scheelt ruimte. Wassen en drogen gebeuren na elkaar, dus een beurt duurt langer dan alleen wassen. De droogcapaciteit van een combinatie is vaak lager dan de wascapaciteit; gebruik de twee getallen die het model zelf noemt. Het energielabel van een combinatie laat het wassen en de volledige was- én droogcyclus apart zien. Dat label is niet hetzelfde als het label van een losse wasmachine.",
        "Kies de combinatie als één apparaat moet passen en je de langere doorlooptijd accepteert. Kies losse apparaten als je veel was achter elkaar draait of de droogcapaciteit gelijk wilt houden aan een volle trommel.",
      ],
      links: [
        { label: "Wasmachines", href: WASHERS },
        { label: "Wasdrogers", href: DRYERS },
        { label: "Was-droogcombinaties", href: COMBOS },
        { label: "Wasmachines en drogers", href: LAUNDRY_PAIR },
      ],
    },
  ],
  faqs: [
    {
      question: "Hoeveel kilogram vulgewicht heb ik nodig?",
      answer:
        "Er is geen kilogram dat voor elk huishouden klopt. Kijk naar het aantal mensen, hoe vaak je wast en of dekbedovertrekken en handdoeken mee moeten. Het getal bij de machine is het maximum droge katoen voor het labelprogramma, niet de hoeveelheid voor elke stof.",
    },
    {
      question: "Wat is het verschil tussen 1400 en 1600 toeren?",
      answer:
        "Beide zijn hoge toerentallen. Een hoger toerental haalt doorgaans meer water uit katoen, maar het verschil is geen vaste hoeveelheid voor elke lading. Vergelijk ook de centrifuge-efficiëntieklasse op het label. Een hoger toerental is niet nodig als je de was toch buiten hangt of kreuk wilt beperken.",
    },
    {
      question: "Wat betekent energieklasse A?",
      answer:
        "Op het huidige label, met de schaal A tot en met G, is A de zuinigste klasse voor het Eco 40-60-programma. Die A is niet de oude A+++. Lees naast de letter het stroomverbruik per 100 wasbeurten en het waterverbruik per wasbeurt.",
    },
    {
      question: "Hoeveel water verbruikt een wasmachine?",
      answer:
        "Het label noemt het waterverbruik in liters per wasbeurt voor het testprogramma. Een ander programma of een andere belading verbruikt een andere hoeveelheid. Vergelijk de liters die bij de modellen staan; er is hier geen algemeen litertal voor alle machines.",
    },
    {
      question: "Hoe weet ik of een wasmachine in mijn ruimte past?",
      answer:
        "Meet breedte, hoogte en diepte, inclusief de slangen achter de machine en de zwaai van de deur. Zet die maten naast de maten van het model. Let op de draairichting als die is ingevuld.",
    },
    {
      question: "Is een stoomfunctie nuttig?",
      answer:
        "Alleen als het model stoom heeft en jij die programma's gebruikt, bijvoorbeeld om kreuk te verminderen of een kledingstuk op te frissen. Stoom vervangt geen gewone wasbeurt van vuile was.",
    },
    {
      question: "Wat is automatische wasmiddeldosering?",
      answer:
        "De machine geeft zelf wasmiddel uit een reservoir, afgestemd op de belading, wanneer het model dat systeem heeft. Je vult het reservoir af en toe bij. Het voegt weinig toe als je liever zelf doseert.",
    },
    {
      question: "Hoe voorkom ik dat mijn wasmachine gaat trillen?",
      answer:
        "Zet de machine waterpas, verwijder de transportbeveiliging voor het eerste gebruik en verdeel de was in de trommel. Een scheve lading of een bolle vloer maakt meer lawaai dan het decibelgetal op het label. Open de kast niet om dit zelf te verhelpen.",
    },
    {
      question: "Hoe onderhoud ik mijn wasmachine?",
      answer:
        "Maak het wasmiddellaatje en de deurrubber schoon, laat de deur na het wassen op een kier en volg de onderhoudswas uit de handleiding van het model. Welk programma daarvoor bestaat, staat bij dat model.",
    },
    {
      question: "Hoe voorkom ik nare geurtjes?",
      answer:
        "Haal natte was er meteen uit, veeg het rubber droog en doseer niet meer wasmiddel dan de was nodig heeft. Een onderhoudsprogramma helpt als het model dat heeft. Geur komt vaak door vocht dat in de machine achterblijft, niet door het energielabel.",
    },
    {
      question: "Wanneer is een wasmachine aan vervanging toe?",
      answer:
        "Als ze het wasresultaat niet meer haalt en een reparatie voor jou niet de moeite is. Er is geen leeftijd waarop een machine vanzelf op is. De garantie en de verkoper van jouw aanbieding bepalen wat er onder reparatie valt.",
    },
    {
      question: "Kan ik een droger boven op mijn wasmachine plaatsen?",
      answer:
        "Ja, als de droger voor die wasmachine geschikt is en je de bijpassende stapelset gebruikt. De wasmachine moet waterpas staan. Zet de wasmachine nooit bovenop de droger.",
    },
  ],
  selectionsTitle: "Bekijk de wasmachines",
  selectionsIntro:
    "De links hieronder openen het assortiment. Een link met een filter verschijnt alleen als die eigenschap bij de getoonde wasmachines is ingevuld.",
  selections: [
    { label: "Bekijk alle wasmachines", href: WASHERS },
    {
      label: "Bekijk wasmachines vanaf 9 kg",
      match: { label: "Vulgewicht", min: 9, subset: true },
    },
    {
      label: "Bekijk wasmachines met energielabel A",
      match: { label: "Energielabel", values: ["A"] },
    },
    {
      label: "Bekijk wasmachines met een lager opgegeven geluid",
      match: { label: "Geluidsniveau", max: 72, subset: true },
    },
    {
      label: "Bekijk wasmachines met een stoomfunctie",
      match: {
        label: "Soort stoomfunctie",
        values: ["Iron Assist", "Iron Assist (steam)", "Steam smoothing", "SteamCare", "Steam", "Stoom"],
      },
    },
    {
      label: "Bekijk wasmachines met automatische wasmiddeldosering",
      match: { label: "Automatische wasmiddeldosering", positive: true },
    },
  ],
  replacesGuideHeadings: ["Vulgewicht", "Toerental", "Energie en geluid", "Plaatsing"],
}

const ADVICE: Record<string, CategoryAdvice> = {
  wasmachines: WASHER_ADVICE,
}

export function getCategoryAdvice(slug: string): CategoryAdvice | null {
  return ADVICE[slug.trim().toLowerCase()] ?? null
}

export function listCategoryAdviceSlugs(): string[] {
  return Object.keys(ADVICE)
}

const NEGATIVE_FILTER = new Set(["nee", "no", "false", "geen", "niet aanwezig", "0"])

function sameText(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase("nl") === right.trim().toLocaleLowerCase("nl")
}

function facetForLabel(facets: CategoryV2FilterFacet[], label: string): CategoryV2FilterFacet | null {
  const key = categoryFacetLabelKey(label)
  return facets.find((facet) => categoryFacetLabelKey(facet.label) === key) ?? null
}

/** Keeps a selection only when the live filters can honour it. */
export function resolveAdviceSelections(
  advice: CategoryAdvice,
  facets: CategoryV2FilterFacet[]
): AdviceLink[] {
  const base = `/categorie/${advice.slug}`
  const links: AdviceLink[] = []
  for (const candidate of advice.selections) {
    if (!candidate.match) {
      if (candidate.href) links.push({ label: candidate.label, href: candidate.href })
      continue
    }
    const facet = facetForLabel(facets, candidate.match.label)
    if (!facet) continue
    if (candidate.match.values || candidate.match.positive) {
      if (facet.type !== "checkbox" || facet.options.length === 0) continue
      const wanted = candidate.match.values ?? []
      const options = facet.options.filter((option) => {
        if (NEGATIVE_FILTER.has(option.value.trim().toLocaleLowerCase("nl"))) return false
        if (NEGATIVE_FILTER.has(option.label.trim().toLocaleLowerCase("nl"))) return false
        if (wanted.length === 0) return true
        return wanted.some((item) => sameText(item, option.value) || sameText(item, option.label))
      })
      if (options.length === 0) continue
      const params = options
        .map((option) => `f=${encodeURIComponent(`${facet.label}:${option.label}`)}`)
        .join("&")
      links.push({ label: candidate.label, href: `${base}?${params}` })
      continue
    }
    if (facet.type !== "range" || facet.min == null || facet.max == null) continue
    const { min, max, subset } = candidate.match
    if (min != null && facet.max < min) continue
    if (max != null && facet.min > max) continue
    const low = min ?? facet.min
    const high = max ?? facet.max
    if (subset && low <= facet.min && high >= facet.max) continue
    const params: string[] = []
    if (min != null) params.push(`min=${encodeURIComponent(`${facet.label}:${min}`)}`)
    if (max != null) params.push(`max=${encodeURIComponent(`${facet.label}:${max}`)}`)
    if (params.length === 0) continue
    links.push({ label: candidate.label, href: `${base}?${params.join("&")}` })
  }
  return links
}
