import {
  categoryCmsBlockId,
  categoryCmsLocalizedHasText,
  getBlock,
  isUspSlotManualOverride,
  type CategoryCmsDocumentV2,
  type CategoryCmsLocalized,
  type CategoryCmsProfile,
} from "./cms-category-document"
import type { CategoryEditorialContext } from "./category-editorial-copy"

type Pair = { title: string; body: string }

function nl(value: string): CategoryCmsLocalized {
  return { nl: value, en: "", de: "", fr: "" }
}

function textNl(value: CategoryCmsLocalized | null | undefined): string {
  return value?.nl?.trim() ?? ""
}

function heroIntro(slug: string, name: string, profile: CategoryCmsProfile): string {
  if (slug === "huishouden") {
    return "Kies een apparaat op de taak die het moet doen, de plek in huis en het verbruik. Inbouw en vrijstaand vragen andere maten."
  }
  if (slug === "was-droog") {
    return "Een losse wasmachine en droger draaien naast elkaar. Een combinatie wast en droogt na elkaar en vraagt minder vloeroppervlak."
  }
  if (slug === "inbouwapparatuur") {
    return "Meet de nis en controleer stroom of gas voordat je een inbouwmodel kiest. Front en ventilatie horen bij dat model."
  }
  if (slug === "wasmachines") {
    return "Vulgewicht, toerental, energielabel en geluid bepalen of een wasmachine bij het huishouden en de plek past."
  }
  if (slug === "vaatwassers") {
    return "Een inbouwvaatwasser verdwijnt achter een front. Controleer de nis, het geluid, de couverts en de droogtechniek van het model."
  }
  if (profile === "level_3") {
    return `Let bij ${name} op maat, capaciteit en verbruik van het model. Een specificatie die niet is vastgelegd, blijft leeg.`
  }
  return `Kies binnen ${name} op gebruik, maat en verbruik. Een lege specificatie wordt niet aangevuld.`
}

function generatedIntro(value: string): boolean {
  return (
    value.includes("Elke tegel opent") ||
    value.includes("Open een groep om") ||
    value.includes("Kies een tegel") ||
    value.includes("staat hier als eigen groep") ||
    value.includes("blijft weg uit de filters") ||
    value.includes("staan op een eigen pagina") ||
    value.includes("in deze groep")
  )
}

function joinNl(names: string[]): string {
  const clean = names.map((name) => name.trim()).filter(Boolean)
  if (clean.length <= 1) return clean[0] ?? ""
  return `${clean.slice(0, -1).join(", ")} en ${clean[clean.length - 1]}`
}

function specKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ï/g, "i")
    .replace(/[^a-z0-9]+/g, "")
}

const SPEC: Record<string, Pair> = {
  vulgewicht: {
    title: "Vulgewicht",
    body: "Het vulgewicht is de kilo droge was die de fabrikant opgeeft. Kies alleen een grote trommel als je die vol krijgt. Katoen wast zuiniger in een volle trommel.",
  },
  energielabel: {
    title: "Energielabel",
    body: "Het label loopt van A tot G en hoort bij het programma op het label, bij wasmachines het Eco 40-60-programma. Een oude A+++ is niet dezelfde klasse als een A van nu. De klasse wordt niet omgerekend naar euro.",
  },
  geluidsniveau: {
    title: "Geluidsniveau",
    body: "Het decibelgetal geldt voor het programma op het label. Bij een slaapkamer of nachtwas weegt een lager getal zwaarder. Lager is stiller.",
  },
  toerental: {
    title: "Toerental",
    body: "Een hoger toerental centrifugeert droger en kreukt meer. Voor katoen droogt 1400 toeren vaak vergelijkbaar met 1600. Per programma kun je lager zetten.",
  },
  kleur: {
    title: "Kleur",
    body: "Kleur helpt uitvoeringen uit elkaar te houden. Alleen kleuren die bij een gekoppeld product staan, worden een filter.",
  },
  draairichting: {
    title: "Draairichting",
    body: "De draairichting laat zien naar welke kant de deur opent, als die specificatie bij de machine is ingevuld.",
  },
  breedte: {
    title: "Breedte",
    body: "De breedte is de maat uit het productdossier, meestal in centimeters. Gebruik die om te zien of het apparaat op de plek of in de nis past.",
  },
  nishoogte: {
    title: "Nishoogte",
    body: "De nishoogte is de inbouwmaat uit het productdossier. Meet de nis zelf nog na; de pagina vult geen ontbrekende maat in.",
  },
  hoogte: {
    title: "Hoogte",
    body: "De hoogte komt uit het productdossier. Gebruik die naast de breedte om te zien of het apparaat past.",
  },
  droogtechniek: {
    title: "Droogtechniek",
    body: "De droogtechniek, zoals een warmtepomp, staat er alleen als die bij de droger is vastgelegd. Er wordt geen techniek aangenomen.",
  },
  waterverbruik: {
    title: "Waterverbruik",
    body: "Het waterverbruik is de waarde die bij het product is opgeslagen. De pagina leidt daar geen jaarkosten uit af.",
  },
  energieverbruik: {
    title: "Energieverbruik",
    body: "Het energieverbruik komt uit het productdossier. Een lager getal betekent niet automatisch een bedrag dat je terugverdient.",
  },
}

const SLUG_USPS: Record<string, Pair[]> = {
  huishouden: [
    {
      title: "Eerst de taak",
      body: "Wassen, koken, koelen en schoonmaken zijn verschillende aankopen. Begin bij wat het apparaat moet doen, niet bij het merk.",
    },
    {
      title: "Inbouw of vrijstaand",
      body: "Een apparaat in een nis moet in de breedte, hoogte en diepte passen. Een vrijstaand model zet je naast het aanrecht en heeft die nis niet nodig.",
    },
    {
      title: "Energie en geluid",
      body: "Het Europese energielabel noemt de klasse en, bij veel apparaten, het geluid. Een lagere klasseletter is zuiniger. Een lager decibelgetal is stiller. Het label zegt niets over jouw energierekening.",
    },
    {
      title: "Capaciteit van het huishouden",
      body: "Vulgewicht bij wasgoed en het aantal couverts bij vaat horen bij hoeveel mensen er mee werken. Een te grote trommel was je zelden vol.",
    },
  ],
  inbouwapparatuur: [
    {
      title: "Nismaten",
      body: "Meet nisbreedte, nishoogte en nisdiepte voordat je een model kiest. Gebruik de maten van dat apparaat. Een ontbrekende maat wordt niet geschat.",
    },
    {
      title: "Aansluiting",
      body: "Een oven en een kookplaat vragen soms een eigen stroomgroep. Een gaskookplaat heeft een gasaansluiting nodig. Controleer wat er in de keuken aanwezig is.",
    },
    {
      title: "Front en ventilatie",
      body: "Een inbouwoven of vaatwasser heeft ruimte nodig voor het front en voor lucht. Die ruimte staat in de installatiegegevens van het model, niet als algemene regel.",
    },
    {
      title: "Verbruik per apparaat",
      body: "Vergelijk het energielabel van elk apparaat apart. Een zuinige oven maakt een minder zuinige vaatwasser niet goed.",
    },
  ],
  "was-droog": [
    {
      title: "Los of in één apparaat",
      body: "Een losse wasmachine en droger draaien tegelijk en houden elk hun eigen vulgewicht. Een combinatie past waar geen plaats is voor twee apparaten.",
    },
    {
      title: "Vulgewicht op elkaar",
      body: "Een droger die kleiner is dan de wasmachine droogt een volle trommel in meer dan één beurt. Stem de kilogrammen op elkaar af.",
    },
    {
      title: "Warmtepomp of condens",
      body: "Een warmtepomp hergebruikt warmte en heeft geen gat naar buiten nodig. Een condensdroger vangt vocht op in een reservoir of via een slang. Alleen als die techniek bij het model staat.",
    },
    {
      title: "Geluid in huis",
      body: "Staat het apparaat bij een slaapkamer, let dan op het decibelgetal tijdens centrifugeren of drogen. Een lager getal is stiller.",
    },
  ],
  "vrijstaande-apparaten": [
    {
      title: "Naast het aanrecht",
      body: "Een vrijstaand apparaat heeft een eigen ombouw. Je schuift het niet achter een keukenfront. Houd rekening met de opgegeven breedte en de werkhoogte.",
    },
    {
      title: "Dezelfde naam, andere plaatsing",
      body: "Een vrijstaande vaatwasser zet je naast het kastje. Een inbouwmodel verdwijnt achter een front en moet in de nis passen.",
    },
    {
      title: "Geluid en energie",
      body: "In een open keuken hoor je het programma. Vergelijk decibel en energielabel wanneer die bij het model staan.",
    },
    {
      title: "Aansluiting in de buurt",
      body: "Water, afvoer en stroom moeten bij de plek kunnen. Een vrijstaand model verplaats je niet zomaar als de leidingen elders zitten.",
    },
  ],
  keuken: [
    {
      title: "Hitte en vaatwasser",
      body: "Pannen en servies kies je op materiaal. Of een stuk in de vaatwasser mag, staat bij het product. Neem dat niet aan voor het hele materiaal.",
    },
    {
      title: "Bereiden of bewaren",
      body: "Een pan is gemaakt om te verhitten. Een voorraadbus of vershoudbak is gemaakt om eten te bewaren. Dat zijn andere eisen aan deksel, maat en materiaal.",
    },
    {
      title: "Koffie en thee",
      body: "Filter, pads of bonen bepalen welk apparaat bij je past. Inhoud en soort bereiding gelden alleen als ze bij dat apparaat zijn ingevuld.",
    },
    {
      title: "Maat van het aanrecht",
      body: "Een groot koffieapparaat of een braadpan moet op het aanrecht passen. Gebruik de opgegeven afmetingen, niet een schatting.",
    },
  ],
  wasmachines: [
    SPEC.vulgewicht!,
    SPEC.toerental!,
    SPEC.geluidsniveau!,
    SPEC.energielabel!,
  ],
  wasdrogers: [
    SPEC.droogtechniek!,
    {
      title: "Vulgewicht",
      body: "Het vulgewicht is de kilo wasgoed die de droger in één programma aankan. Stem dat af op de wasmachine, anders droogt een volle trommel in twee beurten.",
    },
    SPEC.geluidsniveau!,
    {
      title: "Energielabel",
      body: "Het label van een droger loopt van A tot G en hoort bij het standaardprogramma op het label. Een warmtepomp staat doorgaans zuiniger dan een condensdroger. De klasse wordt niet omgerekend naar euro.",
    },
  ],
  vaatwassers: [
    {
      title: "Geluidsniveau",
      body: "In een open keuken hoor je de vaatwasser. Een lager decibelgetal is stiller. Het getal geldt voor het programma dat de fabrikant op het label zet.",
    },
    {
      title: "Couverts",
      body: "Het aantal couverts zegt hoeveel standaardcouverts de fabrikant rekent. Grote pannen passen vaak minder dan dat aantal suggereert.",
    },
    {
      title: "Energie en water",
      body: "Het energielabel en het waterverbruik horen bij het eco-programma op het label. Daar volgt geen bedrag voor jouw jaarverbruik uit.",
    },
    {
      title: "Droogtechniek",
      body: "Zeoliet, condens of een automatische deuropening drogen verschillend. Die techniek telt alleen mee als ze bij dit model is vastgelegd.",
    },
  ],
  "vrijstaande-vaatwassers": [
    {
      title: "Eigen ombouw",
      body: "Een vrijstaand model heeft een afgewerkte zijkant en een eigen deur. Je bouwt het niet achter een keukenfront.",
    },
    {
      title: "Breedte naast het kastje",
      body: "Veel modellen zijn ongeveer 60 centimeter breed. Gebruik de breedte van dit model, zodat het tussen de kasten past.",
    },
    {
      title: "Geluid in de open keuken",
      body: "Zonder kastdeur ervoor hoor je het programma direct. Vergelijk het decibelgetal als de vaatwasser bij de zithoek staat.",
    },
    {
      title: "Couverts en droogresultaat",
      body: "Meer couverts is niet vanzelf schoner of droger. Kijk naar capaciteit én naar de droogtechniek die bij het model staat.",
    },
  ],
  "was-droogcombinaties": [
    {
      title: "Eén plek, twee stappen",
      body: "Het apparaat wast en droogt na elkaar. Je kunt niet tegelijk een nieuwe was starten. Dat scheelt ruimte en kost tijd.",
    },
    {
      title: "Drooggewicht kan lager zijn",
      body: "Sommige combinaties drogen een kleinere lading dan ze wassen. Gebruik het drooggewicht als dat apart is ingevuld, anders het opgegeven vulgewicht.",
    },
    {
      title: "Warmte in hetzelfde apparaat",
      body: "Drogen gebeurt in de wastrommel. Een warmtepomp in een combinatie staat er alleen als de fabrikant die techniek vermeldt.",
    },
    {
      title: "Geluid van beide programma's",
      body: "Je hoort zowel het wassen als het drogen. Bij een slaapkamer tellen beide decibelwaarden, wanneer ze zijn ingevuld.",
    },
  ],
}

function fallbackUsps(context: CategoryEditorialContext): Pair[] {
  const name = context.name.trim()
  const fromFilters = context.filterNames.slice(0, 4).map((filter) => {
    const known = SPEC[specKey(filter)]
    if (known) return known
    return {
      title: filter,
      body: `Bij ${name} vergelijk je ${filter} wanneer die waarde bij een gekoppeld product is ingevuld. Een ontbrekende waarde wordt niet aangevuld.`,
    }
  })
  const choice: Pair[] = [
    {
      title: "Past het in de ruimte",
      body: `Meet de plek voor ${name} voordat je een model kiest. Gebruik breedte, hoogte en diepte van dat model. Een lege maat blijft leeg.`,
    },
    {
      title: "Energie en geluid",
      body: "Het energielabel en het geluidsniveau komen van de fabrikant. Een lagere letter is zuiniger op het label. Een lager decibelgetal is stiller. Daar volgt geen jaarkostenplaatje uit.",
    },
    {
      title: "Geschikt voor het gebruik",
      body: `Kijk welke taak ${name} moet doen en hoe vaak. Een grotere capaciteit is alleen nuttig als je die ook vult.`,
    },
    {
      title: "Alleen wat vastligt",
      body: "Een functie, maat of verbruik telt mee als die bij het model is vastgelegd. Ontbreekt het veld, dan is die eigenschap niet bekend.",
    },
  ]
  const pairs = [...fromFilters]
  for (const item of choice) {
    if (pairs.length >= 4) break
    if (pairs.some((pair) => pair.title === item.title)) continue
    pairs.push(item)
  }
  return pairs.slice(0, 4)
}

export function consumerUspPairs(context: CategoryEditorialContext): Pair[] {
  return SLUG_USPS[context.slug] ?? fallbackUsps(context)
}

const TEMPLATE_USP_TITLES = new Set([
  "Producten komen uit de Product Cloud",
  "Prijs en voorraad alleen bij een verkoopbaar aanbod",
  "EuropMade verkoopt zelf geen producten",
  "Europese merken",
  "Betrouwbare merken",
  "Duidelijke aanbiedingen",
  "Service en garantie",
  "Echte productgroepen",
  "Advies op maat",
  "Geen verzonnen cijfers",
  "Specificaties uit Product Cloud",
  "Actuele aanbiedingen",
  "Geen beste koop",
])

const PAGE_META_USP_TITLES = new Set([
  "Kies het juiste onderdeel",
  "Eerst de groep, dan het apparaat",
  "Aantallen uit het assortiment",
  "Merken uit deze categorie",
  "Apparaten voor een nis",
  "Niet de vrijstaande lijn",
  "Maten uit het productdossier",
  "Per groep verder",
  "Wassen of drogen",
  "Een combinatie telt één keer",
  "Vergelijk op de productpagina",
  "Merken in deze groep",
  "Kies een groep",
  "Verder vergelijken",
  "Alleen ingevulde specificaties",
  "Niet dezelfde groep",
  "Naast het keukenblok",
  "Eigen vaatwassers",
  "Specificaties per apparaat",
  "Groepen blijven bereikbaar",
  "Inbouw in de keuken",
  "Niet vrijstaand",
  "Geluid en formaat",
  "Alleen ingevulde uitvoeringen",
  "Vrij in de keuken",
  "Niet de inbouwlijn",
  "Geluid en breedte",
  "Programma's uit het dossier",
  "Eén plek in het assortiment",
  "Nog geen gekoppelde combinaties",
])

export function isGenericGeneratedUspTitle(value: string): boolean {
  const title = value.trim()
  return (
    title.endsWith("heeft een eigen pagina") ||
    title.startsWith("Groepen:") ||
    TEMPLATE_USP_TITLES.has(title) ||
    PAGE_META_USP_TITLES.has(title)
  )
}

function templateFaqQuestion(question: string): boolean {
  return (
    question.startsWith("Verkoopt EuropMade") ||
    question.startsWith("Welke groepen horen bij") ||
    question.startsWith("Is dit dezelfde groep") ||
    question.startsWith("Waarom zie ik niet") ||
    question.startsWith("Waarom zie ik geen ovens") ||
    question.startsWith("Waarom geeft de keuzehulp") ||
    question.startsWith("Wanneer staat er dat een product") ||
    question.startsWith("Welke prijs") ||
    question.startsWith("Waarom vergelijkt")
  )
}

function guideSections(context: CategoryEditorialContext): Array<{ id: string; heading: string; body: string }> {
  const name = context.name.trim()
  if (context.slug === "wasmachines") {
    return [
      {
        id: "gde_wasmachine_gewicht",
        heading: "Vulgewicht",
        body: "Een kleiner huishouden heeft vaak genoeg aan 8 kilogram. 9 of 11 kilogram is ruimer voor groot beddengoed. Gebruik het vulgewicht dat bij de machine is opgegeven, niet een schatting.",
      },
      {
        id: "gde_wasmachine_toerental",
        heading: "Toerental",
        body: "Het toerental zegt hoe hard de machine centrifugeert. Een hoger toerental haalt meer water uit de was, wat scheelt als je daarna droogt. Het getal op de kaart is het toerental uit het productdossier.",
      },
      {
        id: "gde_wasmachine_label",
        heading: "Energie en geluid",
        body: "Het energielabel en het geluidsniveau komen van de machine zelf. Een stillere machine is prettig in een open ruimte. De pagina rekent het label niet om naar een bedrag en wijst geen beste machine aan.",
      },
      {
        id: "gde_wasmachine_plaats",
        heading: "Plaatsing",
        body: "Let op de draairichting van de deur wanneer die is ingevuld, zodat de deur naar de plek opent waar je de wasmand zet. Afmetingen gebruik je alleen als ze bij die machine staan.",
      },
    ]
  }
  if (context.slug === "wasdrogers") {
    return [
      {
        id: "gde_droger_techniek",
        heading: "Droogtechniek",
        body: "Een warmtepomp hergebruikt warmte en staat zo in het productdossier wanneer de droger die techniek heeft. Andere technieken worden niet aangenomen als het veld leeg is.",
      },
      {
        id: "gde_droger_gewicht",
        heading: "Vulgewicht",
        body: "Stem het vulgewicht van de droger af op de wasmachine, zodat een volle trommel in één keer droogt. Gebruik het kilogram dat bij de droger is opgegeven.",
      },
      {
        id: "gde_droger_geluid",
        heading: "Geluid en energie",
        body: "Geluidsniveau en energielabel helpen als de droger in een leefruimte staat. Een lager decibelgetal is stiller. Daar volgt geen belofte over je energierekening uit.",
      },
      {
        id: "gde_droger_plaats",
        heading: "Plaatsing en vocht",
        body: "Een condens- of warmtepompdroger vangt vocht op of voert het af. Die eigenschap staat alleen op de kaart als ze bij deze droger is ingevuld. Houd rekening met de opgegeven afmetingen.",
      },
    ]
  }
  if (context.slug === "vaatwassers" || context.slug === "vrijstaande-vaatwassers") {
    const builtIn = context.slug === "vaatwassers"
    return [
      {
        id: "gde_vaat_plaats",
        heading: builtIn ? "Inbouw of vrijstaand" : "Vrijstaand of inbouw",
        body: builtIn
          ? "Een inbouwmodel verdwijnt achter een keukenfront en moet in de nis passen. Een vrijstaand model heeft een eigen ombouw en zet je naast het kastje."
          : "Een vrijstaand model heeft een afgewerkte buitenkant en een eigen deur. Een inbouwmodel gaat achter een front en moet in de nis passen.",
      },
      {
        id: "gde_vaat_maat",
        heading: "Breedte en nishoogte",
        body: "De meeste vrijstaande en inbouwmodellen zijn ongeveer 60 centimeter breed, maar gebruik de breedte en de nishoogte die bij dit model zijn ingevuld. Een lege maat wordt niet ingevuld.",
      },
      {
        id: "gde_vaat_geluid",
        heading: "Geluid, energie en water",
        body: "Geluidsniveau, energielabel en waterverbruik vergelijk je wanneer die waarden bij de vaatwasser staan. De tabel markeert geen zuinigste of stilste machine.",
      },
      {
        id: "gde_vaat_uitvoering",
        heading: "Bestek, deur en programma's",
        body: "Een besteklade, een meubelfront of een bepaald programma geldt alleen voor de vaatwassers waarbij die eigenschap is vastgelegd. Staat het er niet bij, dan is die uitvoering niet bekend.",
      },
    ]
  }
  if (context.slug === "was-droogcombinaties") {
    return [
      {
        id: "gde_combi_wanneer",
        heading: "Wanneer een combinatie",
        body: "Een was-droogcombinatie wast en droogt in één apparaat. Kies deze groep als je geen ruimte hebt voor een losse droger. Een losse wasmachine of droger hoort niet op deze pagina.",
      },
      {
        id: "gde_combi_gewicht",
        heading: "Vulgewicht",
        body: "Het vulgewicht gaat over de lading die het apparaat aan kan. Droogt een combinatie een kleinere lading dan hij wast, dan staat dat alleen zo vermeld als het bij het product is ingevuld.",
      },
      {
        id: "gde_combi_leeg",
        heading: "Nog geen producten",
        body: "Zijn er geen was-droogcombinaties gekoppeld, dan blijft de pagina open en toont hij een nulstand. Er worden geen voorbeeldmodellen toegevoegd.",
      },
    ]
  }
  const filters = context.filterNames.slice(0, 4)
  if (filters.length === 0 || context.profile !== "level_3") return []
  return filters.map((filter, index) => {
    const known = SPEC[specKey(filter)]
    return {
      id: `gde_${context.slug}_${index}`.replace(/[^a-z0-9_-]/gi, "").slice(0, 48),
      heading: known?.title ?? filter,
      body: known
        ? known.body
        : `Bij ${name} gebruik je ${filter} om producten naast elkaar te zetten. De pagina toont alleen waarden die bij een gekoppeld product zijn ingevuld.`,
    }
  })
}

export function consumerFaqItems(
  context: CategoryEditorialContext
): Array<{ id: string; question: string; answer: string }> {
  return faqItems(context)
}

function faqItems(context: CategoryEditorialContext): Array<{ id: string; question: string; answer: string }> {
  const name = context.name.trim()
  if (context.slug === "huishouden") {
    return [
      {
        id: "faq_huis_energie",
        question: "Welke huishoudelijke apparaten zijn het meest energiezuinig?",
        answer: "Vergelijk het energielabel binnen dezelfde productgroep, bijvoorbeeld wasmachines of vaatwassers, wanneer dat label bij het product is ingevuld. Een label van een wasmachine zegt niets over een vaatwasser. Deze pagina wijst geen zuinigste model aan.",
      },
      {
        id: "faq_huis_inbouw",
        question: "Hoe kies ik de juiste inbouwapparatuur?",
        answer: "Meet de nis en controleer of de keuken de aansluiting heeft die het model vraagt, zoals een stroomgroep of gas. Breedte en nishoogte staan bij het product wanneer ze zijn ingevuld. Kies daarna de productgroep, bijvoorbeeld ovens of vaatwassers.",
      },
      {
        id: "faq_huis_merken",
        question: "Wat is het voordeel van Europese merken?",
        answer: "Bij een product zie je het merk en de verkoper. Europese herkomst geldt alleen wanneer die in het productdossier is vastgelegd. Een merknaam alleen is geen herkomstbewijs.",
      },
    ]
  }
  if (context.slug === "inbouwapparatuur") {
    return [
      {
        id: "faq_inbouw_tegel",
        question: "Waarom staan ovens en kookplaten niet elk op een eigen tegel?",
        answer: "Die groepen heten in het assortiment Ovens en magnetrons, en Kookplaten, fornuizen en afzuigkappen. Elke tegel opent precies die groep.",
      },
      {
        id: "faq_inbouw_maat",
        question: "Waar zie ik of een apparaat in de nis past?",
        answer: "Breedte en nishoogte staan bij het product wanneer ze zijn ingevuld. Op deze pagina kies je eerst de productgroep.",
      },
    ]
  }
  if (context.slug === "wasmachines") {
    return [
      {
        id: "faq_wasmachine_gewicht",
        question: "Hoeveel kilogram heb ik nodig?",
        answer: "Voor een klein huishouden is 8 kilogram vaak genoeg. Kies 9 kilogram of meer als je vaak groot beddengoed wast. Gebruik het vulgewicht dat bij de machine staat.",
      },
      {
        id: "faq_wasmachine_toeren",
        question: "Wat zegt het toerental?",
        answer: "Een hoger toerental centrifugeert de was droger. Dat is handig als je daarna een droger gebruikt. Het getal is het toerental uit het productdossier.",
      },
      {
        id: "faq_wasmachine_combi",
        question: "Hoort een was-droogcombinatie hier ook?",
        answer: "Nee. Een combinatie staat bij Was-droogcombinaties en wordt niet ook als wasmachine geteld.",
      },
    ]
  }
  if (context.slug === "wasdrogers") {
    return [
      {
        id: "faq_droger_techniek",
        question: "Wat is een warmtepompdroger?",
        answer: "Een warmtepomp droogt door warmte opnieuw te gebruiken. Die techniek staat bij een droger alleen als ze in het productdossier is ingevuld.",
      },
      {
        id: "faq_droger_gewicht",
        question: "Moet het vulgewicht gelijk zijn aan mijn wasmachine?",
        answer: "Een droger met minstens hetzelfde vulgewicht kan een volle was in één keer drogen. Vergelijk het kilogram dat bij de droger staat.",
      },
      {
        id: "faq_droger_geluid",
        question: "Hoe lees ik het geluidsniveau?",
        answer: "Een lager decibelgetal is stiller. De pagina rangschikt de drogers daar niet op van beste naar slechtste.",
      },
    ]
  }
  if (context.slug === "vaatwassers" || context.slug === "vrijstaande-vaatwassers") {
    return [
      {
        id: "faq_vaat_verschil",
        question: "Wat is het verschil tussen inbouw en vrijstaand?",
        answer: "Een inbouwvaatwasser verdwijnt achter een keukenfront. Een vrijstaand model plaats je naast het aanrecht. Het zijn twee pagina's, ook al heten ze allebei Vaatwassers.",
      },
      {
        id: "faq_vaat_maat",
        question: "Hoe weet ik of de vaatwasser past?",
        answer: "Gebruik de breedte en, bij inbouw, de nishoogte die bij het model zijn ingevuld. Een ontbrekende maat wordt niet geschat.",
      },
      {
        id: "faq_vaat_geluid",
        question: "Waar let ik op bij geluid en verbruik?",
        answer: "Vergelijk geluidsniveau, energielabel en waterverbruik wanneer die bij de vaatwasser staan. Daar volgt geen belofte over je jaarrekening uit.",
      },
    ]
  }
  const items = []
  const filters = context.filterNames.slice(0, 3)
  if (filters.length > 0) {
    items.push({
      id: `faq_${context.slug}_letop`.replace(/[^a-z0-9_-]/gi, "").slice(0, 48),
      question: `Waar let ik op bij ${name}?`,
      answer: `Begin met ${joinNl(filters)}. Die specificaties verschijnen alleen wanneer ze bij een product in ${name} zijn ingevuld.`,
    })
  }
  if (context.children.length > 0) {
    items.push({
      id: `faq_${context.slug}_groepen`.replace(/[^a-z0-9_-]/gi, "").slice(0, 48),
      question: `Welke groepen horen bij ${name}?`,
      answer: joinNl(context.children.map((child) => child.name)),
    })
  }
  if (context.distinguishedFrom && context.parentName) {
    items.push({
      id: `faq_${context.slug}_anders`.replace(/[^a-z0-9_-]/gi, "").slice(0, 48),
      question: `Is dit dezelfde ${name} als onder ${context.distinguishedFrom}?`,
      answer: `Nee. Deze pagina is ${name} onder ${context.parentName}.`,
    })
  }
  return items
}

function adviceSummary(childName: string, childSlug: string, parentName: string): string {
  if (childSlug === "wasmachines") {
    return "Alleen wassen. Een losse droger kan daarna draaien terwijl de machine vrij is. Let op vulgewicht, toerental en geluid."
  }
  if (childSlug === "wasdrogers") {
    return "Een aparte droger droogt een volle was. Kies warmtepomp of condens, en een vulgewicht dat bij de wasmachine past."
  }
  if (childSlug === "was-droogcombinaties") {
    return "Wassen en drogen na elkaar in één kast. Minder vloeroppervlak, en het drooggewicht kan lager zijn dan het wasgewicht."
  }
  if (childSlug === "vaatwassers") {
    return "Achter een keukenfront. Controleer nisbreedte, nishoogte, geluid, couverts en droogtechniek."
  }
  if (childSlug === "vrijstaande-vaatwassers") {
    return "Een eigen ombouw naast het aanrecht. Let op de breedte, het geluid in de open keuken en het aantal couverts."
  }
  if (childSlug === "ovens-magnetrons" || childSlug === "ovens-en-magnetrons") {
    return "Een oven en een combimagnetron verschillen in programma's. Meet de nis en controleer of de stroomgroep het vermogen aankan."
  }
  if (childSlug.includes("kookplaat") || childSlug.includes("fornuis") || childSlug.includes("afzuig")) {
    return "Inductie warmt de pan via een magneetveld. Keramisch verwarmt een gloeizone. Gas vraagt een gasaansluiting. Kies wat de keuken heeft."
  }
  if (childSlug.includes("koel")) {
    return "Een inbouwkoelkast moet in de nis passen, inclusief ventilatie achter of boven het apparaat. Gebruik de nismaten van het model."
  }
  if (childSlug.includes("wasmiddel") || childSlug.includes("droogrek")) {
    return "Wasmiddel kies je bij de vlek en de trommel. Een droogrek droogt zonder apparaat en vraagt vloer- of kastruimte."
  }
  if (childSlug.includes("wasmachines-en-droger")) {
    return "Wasmachines en drogers naast elkaar. Kies eerst of je alleen wast, alleen droogt, of beide apparaten nodig hebt."
  }
  if (childSlug.startsWith("alles-in")) {
    return `Het volledige aanbod binnen ${parentName}. Vergelijk vulgewicht, maat en verbruik van het model dat je overweegt.`
  }
  return `${childName}: vergelijk de maat, de capaciteit en het verbruik van het model dat je overweegt.`
}

function staleAdvice(summary: string): boolean {
  return (
    summary.startsWith("Open ") ||
    summary.startsWith("Kies wasmachines") ||
    summary.startsWith("Kies wasdrogers") ||
    summary.startsWith("Kies een combinatie") ||
    summary.startsWith("Dit is de inbouw") ||
    summary.startsWith("Dit zijn vaatwassers") ||
    summary.includes("lege specificatie blijft leeg")
  )
}

function knowText(context: CategoryEditorialContext): string {
  if (context.slug === "was-droog") {
    return [
      "Een losse droger droogt terwijl de wasmachine opnieuw kan draaien. Een combinatie doet beide na elkaar en past waar geen ruimte is voor twee apparaten.",
      "Stem het vulgewicht van de droger af op de wasmachine. Een kleinere droger droogt een volle trommel in twee beurten.",
      "Een warmtepomp heeft geen afvoer naar buiten en hergebruikt warmte. Een condensdroger vangt vocht op. Alleen als die techniek bij het model staat.",
      "Bij een leefruimte of slaapkamer vergelijk je het geluid in decibel. Een lager getal is stiller.",
    ].join("\n")
  }
  if (context.slug === "inbouwapparatuur") {
    return [
      "Meet nisbreedte, nishoogte en nisdiepte, en houd de ventilatieruimte aan die het model voorschrijft.",
      "Controleer of de keuken de aansluiting heeft: een aparte stroomgroep, of gas bij een gaskookplaat.",
      "Een frontpaneel bij een vaatwasser of koelkast moet bij de deur passen. Die maat staat bij het model.",
      "Vergelijk energie en geluid per apparaat. Het label van de oven zegt niets over de vaatwasser.",
    ].join("\n")
  }
  if (context.slug === "vrijstaande-apparaten") {
    return [
      "Reken de werkhoogte en de breedte naast de kasten, inclusief een vrije deur.",
      "Water, afvoer en stopcontact moeten bij die plek kunnen.",
      "In een open keuken hoor je het programma. Vergelijk het decibelgetal van het model.",
    ].join("\n")
  }
  if (context.profile !== "level_2") return ""
  return [
    `Kijk bij ${context.name.trim()} naar maat, capaciteit en verbruik van het model.`,
    "Een functie telt alleen mee als de fabrikant die bij dat model heeft vastgelegd.",
    "Een grotere capaciteit helpt alleen als je die in het dagelijks gebruik ook vult.",
  ].join("\n")
}

function genericGuide(sectionHeading: string, sectionBody: string): boolean {
  return sectionHeading === "Aanbod" && sectionBody.includes("winkelwagen")
}

/**
 * Replaces the automatic system sentences in a draft with consumer copy.
 * A manually overridden USP slot and any other non-matching text stay as they are.
 * Nothing is published.
 */
export function restoreGenericCategoryCopy(
  doc: CategoryCmsDocumentV2,
  context: CategoryEditorialContext
): { document: CategoryCmsDocumentV2; filled: string[] } {
  if (doc.profile !== context.profile) return { document: doc, filled: [] }
  const filled: string[] = []
  const next = structuredClone(doc)
  const pairs = consumerUspPairs(context)
  const usp = getBlock(next, "usp_bar")
  if (usp) {
    const meta = next.block_meta[usp.id]
    usp.slots.forEach((slot, index) => {
      const pair = pairs[index]
      if (!pair) return
      const title = textNl(slot.title)
      if (title && !isGenericGeneratedUspTitle(title)) return
      if (!title && isUspSlotManualOverride(meta, index)) return
      slot.title = nl(pair.title)
      slot.body = nl(pair.body)
      if (meta && meta.manual_override && typeof meta.manual_override === "object") {
        meta.manual_override[String(index)] = false
      }
      filled.push(`usp.${index}`)
    })
  }

  const choice = getBlock(next, "choice_assistant_cta")
  if (choice && (textNl(choice.body).includes("De keuzehulp gebruikt alleen specificaties") || textNl(choice.body).includes("Elke kaart opent"))) {
    choice.body = nl(
      `Beantwoord een paar vragen over ${context.name.trim()}. Een vraag verschijnt alleen als meerdere producten in deze groep dezelfde soort specificatie hebben.`
    )
    filled.push("choice.body")
  }
  if (choice && !textNl(choice.title) && !textNl(choice.body)) {
    choice.title = nl(`Welke groep binnen ${context.name.trim()}?`)
    choice.body = nl("Kies de groep die bij het gebruik past. Daarna vergelijk je maat, capaciteit en verbruik van het model.")
    if (!choice.href.trim()) {
      choice.href = `#blk_${context.slug}_${context.profile}_product_group_tiles`
    }
    if (!textNl(choice.cta_label)) choice.cta_label = nl("Bekijk de groepen")
    filled.push("choice.empty")
  }

  const advice = getBlock(next, "advice_compare")
  if (advice) {
    if (advice.items.length === 0 && context.children.length > 0) {
      if (!textNl(advice.title)) advice.title = nl("Advies en vergelijken")
      advice.items = context.children.slice(0, 6).map((child) => ({
        id: `adv_${child.slug}`.replace(/[^a-z0-9_-]/gi, "").slice(0, 48),
        label: nl(child.name),
        href: `/categorie/${child.slug}`,
        summary: nl(adviceSummary(child.name, child.slug, context.name.trim())),
        cta_label: nl("Vergelijk"),
      }))
      filled.push("advice.children")
    }
    for (const item of advice.items) {
      const label = textNl(item.label)
      const named = context.children.filter((row) => row.name.trim() === label)
      const currentSlug = (item.href.match(/\/categorie\/([^/?#]+)/i)?.[1] ?? "").toLowerCase()
      const currentIsChild = context.children.some((row) => row.slug === currentSlug)
      if (named.length === 1 && named[0] && !currentIsChild) {
        item.href = `/categorie/${named[0].slug}`
        filled.push(`advice.href.${named[0].slug}`)
      }
      if (!staleAdvice(textNl(item.summary))) continue
      const child = context.children.find((row) => row.name.trim() === label)
      item.summary = nl(
        adviceSummary(label, child?.slug ?? "", context.name.trim())
      )
      filled.push(`advice.${item.id}`)
    }
  }

  const guide = getBlock(next, "buying_guide")
  const sections = guideSections(context)
  if (guide && sections.length > 0) {
    const first = guide.sections[0]
    const replace =
      guide.sections.length === 0 ||
      (first
        ? genericGuide(textNl(first.heading), textNl(first.body)) ||
          textNl(first.body).includes("Deze pagina is") ||
          textNl(first.body).includes("op de pagina")
        : false)
    if (replace) {
      guide.title = nl(`Koopgids ${context.name.trim()}`)
      guide.intro = nl(
        `Deze gids helpt je ${context.name.trim()} te kiezen op eigenschappen die bij deze producten horen. Een specificatie die niet is ingevuld, laten we weg.`
      )
      guide.sections = sections.map((section) => ({
        id: section.id,
        heading: nl(section.heading),
        body: nl(section.body),
        bullets: [],
      }))
      filled.push("buying_guide")
    }
  }

  const faq = getBlock(next, "faq")
  const questions = faqItems(context)
  if (faq && questions.length > 0) {
    const kept = faq.items.filter((item) => !templateFaqQuestion(textNl(item.question)))
    if (kept.length === 0) {
      faq.title = nl("Vragen")
      faq.items = questions.map((item) => ({
        id: item.id,
        question: nl(item.question),
        answer: nl(item.answer),
      }))
      filled.push("faq")
    } else if (kept.length !== faq.items.length) {
      faq.items = kept
      filled.push("faq.template")
    }
  }

  const hero = getBlock(next, "hero")
  if (hero && (!textNl(hero.intro) || generatedIntro(textNl(hero.intro)))) {
    hero.intro = nl(heroIntro(context.slug, context.name.trim(), context.profile))
    filled.push("hero.intro")
  }
  if (hero && !textNl(hero.primary_cta_label)) {
    const target = context.profile === "level_1"
      ? "subcategory_tiles"
      : context.profile === "level_2"
        ? "product_group_tiles"
        : "product_grid"
    if (getBlock(next, target)) {
      hero.primary_cta_label = nl(context.profile === "level_3" ? "Bekijk het assortiment" : "Ontdek de groepen")
      if (!hero.primary_cta_href?.trim()) {
        hero.primary_cta_href = `#${categoryCmsBlockId(context.slug, context.profile, target)}`
      }
      filled.push("hero.primary")
    }
  }
  if (hero && !textNl(hero.secondary_cta_label)) {
    const target = context.profile === "level_1"
      ? "why_europmade"
      : context.profile === "level_2"
        ? "choice_assistant_cta"
        : "buying_guide"
    const label = context.profile === "level_1"
      ? "Waarom EuropMade?"
      : context.profile === "level_2"
        ? "Keuzehulp"
        : "Koopgids"
    if (getBlock(next, target)) {
      hero.secondary_cta_label = nl(label)
      if (!hero.secondary_cta_href?.trim()) {
        hero.secondary_cta_href = `#${categoryCmsBlockId(context.slug, context.profile, target)}`
      }
      filled.push("hero.secondary")
    }
  }

  const practical = knowText(context)
  if (practical && context.profile === "level_2") {
    let intro = getBlock(next, "intro")
    if (!intro) {
      intro = {
        id: categoryCmsBlockId(context.slug, context.profile, "intro"),
        type: "intro",
        visible: true,
        body: nl(""),
      }
      next.blocks.push(intro)
    }
    if (!textNl(intro.body)) {
      intro.body = nl(practical)
      filled.push("intro")
    }
  }

  const mission =
    "EuropMade is een marketplace voor aanbod van Europese bedrijven. Per product hoort zichtbaar te zijn welk bedrijf het aanbiedt en welke herkomst in het productdossier staat. Zonder vastgelegd productieland is er geen herkomstlabel. Duurzaamheid, kwaliteit of garantie vullen we niet in zonder een bron bij dat product."
  const why = getBlock(next, "why_europmade")
  if (
    why &&
    (!textNl(why.body) ||
      textNl(why.body).includes("vult geen herkomst") ||
      textNl(why.body).includes("vergelijk je het aanbod van verkopers"))
  ) {
    if (!textNl(why.title)) why.title = nl("Waarom EuropMade?")
    why.body = nl(mission)
    filled.push("why.mission")
  }

  if (filled.length > 0 && !categoryCmsLocalizedHasText(next.seo.h1)) {
    next.seo.h1 = nl(context.name.trim())
  }
  return { document: filled.length > 0 ? next : doc, filled }
}
