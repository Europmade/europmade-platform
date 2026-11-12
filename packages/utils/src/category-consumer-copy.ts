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

type ChoicePrompt = {
  title: string
  body: string
  ctaLabel: string
  href: string
}

/**
 * Consumer question, short intro and direct advice destination per category.
 * Other level-2 categories add an entry here. Empty or still-automatic choice
 * blocks pick this up at display time. A written title or body stays as stored.
 */
const CHOICE_PROMPTS: Record<string, ChoicePrompt> = {}

function choicePromptFor(slug: string): ChoicePrompt | null {
  return CHOICE_PROMPTS[slug.trim().toLowerCase()] ?? null
}

function isAutomaticChoice(title: string, body: string): boolean {
  if (!title && !body) return true
  return title.startsWith("Welke groep binnen ") && body.startsWith("Kies de groep die bij het gebruik past")
}

function isAutomaticChoiceCta(label: string): boolean {
  const value = label.trim()
  return !value || value === "Bekijk de groepen"
}

function isAutomaticChoiceHref(href: string): boolean {
  const value = href.trim()
  return !value || /#blk_.+_product_group_tiles$/.test(value)
}

/** Earlier display-time links that promised a comparison but opened the buying guide. */
function isStaleComparisonHref(href: string): boolean {
  return /#blk_.+_buying_guide$/.test(href.trim())
}

function textNl(value: CategoryCmsLocalized | null | undefined): string {
  return value?.nl?.trim() ?? ""
}

const PREVIOUS_HERO_INTRO: Record<string, string> = {}

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
    return "Schone was zonder dat je erbij blijft staan. Kies een machine die bij de grootte van je huishouden en bij de plek in huis past."
  }
  if (slug === "wasdrogers") {
    return "Was die meteen opgeborgen kan worden, ook als het buiten niet droogt. Een droger haalt dat uit de trommel, op het tempo van jouw huishouden."
  }
  if (slug === "vaatwassers") {
    return "Na het eten gaat de vaat de machine in en blijft het aanrecht vrij. Het apparaat zit achter het keukenfront, op de plek die je daarvoor hebt."
  }
  if (slug === "vrijstaande-vaatwassers") {
    return "Geen nis vrij? Zet de vaatwasser naast het aanrecht. Het apparaat heeft een eigen deur en neemt de afwas over."
  }
  if (slug === "was-droogcombinaties") {
    return "Wassen en drogen zonder een tweede apparaat. Eén kast doet beide na elkaar, op de plek waar geen ruimte is voor twee."
  }
  if (profile === "level_3") {
    return `Een ${name} neemt een terugkerende klus over, als het model bij je gebruik en bij de plek past.`
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

const PREVIOUS_LEVEL3_INTRO = new Set([
  "Vulgewicht, toerental, energielabel en geluid bepalen of een wasmachine bij het huishouden en de plek past.",
  "Een inbouwvaatwasser verdwijnt achter een front. Controleer de nis, het geluid, de couverts en de droogtechniek van het model.",
])

function replaceableHeroIntro(slug: string, value: string): boolean {
  if (!value || generatedIntro(value)) return true
  if (PREVIOUS_HERO_INTRO[slug] === value || PREVIOUS_LEVEL3_INTRO.has(value)) return true
  return /^Let bij .+ op maat, capaciteit en verbruik van het model/.test(value)
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
    { title: "Vulgewicht", body: "Kies kilo's die je vol krijgt" },
    { title: "Toerental", body: "Hoger centrifugeert droger" },
    { title: "Geluid in huis", body: "Lager decibelgetal is stiller" },
    { title: "Energielabel", body: "Klasse van het labelprogramma" },
  ],
  wasdrogers: [
    { title: "Droogtechniek", body: "Alleen als het model dat vermeldt" },
    { title: "Vulgewicht", body: "Stem af op de wasmachine" },
    { title: "Geluid in huis", body: "Lager decibelgetal is stiller" },
    { title: "Energielabel", body: "Klasse van het droogprogramma" },
  ],
  vaatwassers: [
    { title: "In de nis", body: "Maten van dit model" },
    { title: "Couverts", body: "Aantal dat de fabrikant rekent" },
    { title: "Geluid in de keuken", body: "Lager decibelgetal is stiller" },
    { title: "Energie en water", body: "Van het labelprogramma" },
  ],
  "vrijstaande-vaatwassers": [
    { title: "Eigen deur", body: "Geen keukenfront ervoor" },
    { title: "Breedte", body: "Naast het aanrecht" },
    { title: "Geluid in de keuken", body: "Zonder kastdeur hoor je het" },
    { title: "Couverts", body: "Aantal dat de fabrikant rekent" },
  ],
  "was-droogcombinaties": [
    { title: "Eén apparaat", body: "Wast en droogt na elkaar" },
    { title: "Vulgewicht", body: "Drooglading kan kleiner zijn" },
    { title: "Droogtechniek", body: "Alleen als het model dat vermeldt" },
    { title: "Geluid", body: "Van wassen en van drogen" },
  ],
}

const PREVIOUS_USP_BODIES = new Set([
  "Het vulgewicht is de kilo droge was die de fabrikant opgeeft. Kies alleen een grote trommel als je die vol krijgt. Katoen wast zuiniger in een volle trommel.",
  "Het label loopt van A tot G en hoort bij het programma op het label, bij wasmachines het Eco 40-60-programma. Een oude A+++ is niet dezelfde klasse als een A van nu. De klasse wordt niet omgerekend naar euro.",
  "Het decibelgetal geldt voor het programma op het label. Bij een slaapkamer of nachtwas weegt een lager getal zwaarder. Lager is stiller.",
  "Een hoger toerental centrifugeert droger en kreukt meer. Voor katoen droogt 1400 toeren vaak vergelijkbaar met 1600. Per programma kun je lager zetten.",
  "De droogtechniek, zoals een warmtepomp, staat er alleen als die bij de droger is vastgelegd. Er wordt geen techniek aangenomen.",
  "Het vulgewicht is de kilo wasgoed die de droger in één programma aankan. Stem dat af op de wasmachine, anders droogt een volle trommel in twee beurten.",
  "Het label van een droger loopt van A tot G en hoort bij het standaardprogramma op het label. Een warmtepomp staat doorgaans zuiniger dan een condensdroger. De klasse wordt niet omgerekend naar euro.",
  "In een open keuken hoor je de vaatwasser. Een lager decibelgetal is stiller. Het getal geldt voor het programma dat de fabrikant op het label zet.",
  "Het aantal couverts zegt hoeveel standaardcouverts de fabrikant rekent. Grote pannen passen vaak minder dan dat aantal suggereert.",
  "Het energielabel en het waterverbruik horen bij het eco-programma op het label. Daar volgt geen bedrag voor jouw jaarverbruik uit.",
  "Zeoliet, condens of een automatische deuropening drogen verschillend. Die techniek telt alleen mee als ze bij dit model is vastgelegd.",
  "Een vrijstaand model heeft een afgewerkte zijkant en een eigen deur. Je bouwt het niet achter een keukenfront.",
  "Veel modellen zijn ongeveer 60 centimeter breed. Gebruik de breedte van dit model, zodat het tussen de kasten past.",
  "Zonder kastdeur ervoor hoor je het programma direct. Vergelijk het decibelgetal als de vaatwasser bij de zithoek staat.",
  "Meer couverts is niet vanzelf schoner of droger. Kijk naar capaciteit én naar de droogtechniek die bij het model staat.",
  "Het apparaat wast en droogt na elkaar. Je kunt niet tegelijk een nieuwe was starten. Dat scheelt ruimte en kost tijd.",
  "Sommige combinaties drogen een kleinere lading dan ze wassen. Gebruik het drooggewicht als dat apart is ingevuld, anders het opgegeven vulgewicht.",
  "Drogen gebeurt in de wastrommel. Een warmtepomp in een combinatie staat er alleen als de fabrikant die techniek vermeldt.",
  "Je hoort zowel het wassen als het drogen. Bij een slaapkamer tellen beide decibelwaarden, wanneer ze zijn ingevuld.",
])

function shortFilterUsp(filter: string): Pair {
  const known = SPEC[specKey(filter)]
  if (known) return { title: known.title, body: "Vergelijk de waarde van het model" }
  return { title: filter, body: "Vergelijk de waarde van het model" }
}

function fallbackUsps(context: CategoryEditorialContext): Pair[] {
  const name = context.name.trim()
  if (context.profile === "level_3") {
    const fromFilters = context.filterNames.slice(0, 4).map((filter) => shortFilterUsp(filter))
    const choice: Pair[] = [
      { title: "Past het in de ruimte", body: "Gebruik de maten van het model" },
      { title: "Energie en geluid", body: "Alleen als die bij het model staan" },
      { title: "Dagelijks gebruik", body: "Kies capaciteit die je vult" },
      { title: "Ingevulde gegevens", body: "Een lege waarde blijft leeg" },
    ]
    const pairs = [...fromFilters]
    for (const item of choice) {
      if (pairs.length >= 4) break
      if (pairs.some((pair) => pair.title === item.title)) continue
      pairs.push(item)
    }
    return pairs.slice(0, 4)
  }
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

const PREVIOUS_SHORT_FAQ = new Set([
  "Hoeveel kilogram heb ik nodig?",
  "Wat zegt het toerental?",
  "Hoort een was-droogcombinatie hier ook?",
  "Wat is een warmtepompdroger?",
  "Moet het vulgewicht gelijk zijn aan mijn wasmachine?",
  "Hoe lees ik het geluidsniveau?",
  "Wat is het verschil tussen inbouw en vrijstaand?",
  "Hoe weet ik of de vaatwasser past?",
  "Waar let ik op bij geluid en verbruik?",
])

function staleGeneratedFaq(question: string): boolean {
  return PREVIOUS_SHORT_FAQ.has(question.trim())
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
  if (context.slug === "wasmachines") return washerFaq()
  if (context.slug === "wasdrogers") return dryerFaq()
  if (context.slug === "was-droog") return laundryFaq()
  if (context.slug === "was-droogcombinaties") return comboFaq()
  if (context.slug === "wasmachines-en-drogers") return washerDryerSetFaq()
  if (context.slug === "vaatwassers") return builtInDishwasherFaq()
  if (context.slug === "vrijstaande-vaatwassers") return freestandingDishwasherFaq()
  const items = []
  const filters = context.filterNames.slice(0, 3)
  if (filters.length > 0) {
    items.push({
      id: `faq_${context.slug}_letop`.replace(/[^a-z0-9_-]/gi, "").slice(0, 48),
      question: `Waar let ik op bij ${name}?`,
      answer: `Begin met ${joinNl(filters)}. Die specificaties verschijnen alleen wanneer ze bij een product in ${name} zijn ingevuld.`,
    })
  }
  return items
}

function shopperFaq(prefix: string): Array<{ id: string; question: string; answer: string }> {
  return [
    {
      id: `${prefix}_bestellen`,
      question: "Hoe werkt bestellen via EuropMade?",
      answer:
        "EuropMade verkoopt de apparaten niet zelf. De koop sluit je met de verkoper van de aanbieding die je kiest. Prijs en aanbod staan op de productpagina; de bestelling rond je af bij het afrekenen. Een vraag over een geplaatste bestelling stel je via Berichten bij die bestelling. Uitleg over bestellen staat bij Klantenservice.",
    },
    {
      id: `${prefix}_verzending`,
      question: "Wie verzendt mijn bestelling?",
      answer:
        "De verkoper verzendt. Verzendkosten, levertijd en vervoerder horen bij die aanbieding en zie je bij de aanbieding en bij het afrekenen. Koop je bij meer dan één verkoper, dan kan de levering in delen aankomen. Vertraging of schade meld je via Berichten bij de bestelling. De pagina Verzending licht dit toe.",
    },
    {
      id: `${prefix}_retour`,
      question: "Hoe werkt retourneren?",
      answer:
        "Hoe lang je kunt retourneren, hangt af van de verkoper en staat bij de aanbieding. Dat kan 14 of 30 dagen zijn. Een retour vraag je aan via Mijn EuropMade, onder Retouren. De verkoper stuurt daarna de instructies. Hygiënisch verzegelde of gepersonaliseerde producten kunnen zijn uitgesloten; ook dat staat bij de aanbieding. De pagina Retourneren zet de stappen op een rij.",
    },
    {
      id: `${prefix}_herkomst`,
      question: "Wat betekent Made in Europe bij EuropMade?",
      answer:
        "Made in Europe is geen merknaam. EuropMade beoordeelt herkomst met vaste criteria voor assemblage, onderdelen en materialen. Een score zie je alleen als die voor dat product is vastgelegd. Een Europese merknaam alleen is geen bewijs van herkomst. De uitleg staat op de pagina Hoe bepaalt EuropMade Made in Europe.",
    },
  ]
}

function washerFaq(): Array<{ id: string; question: string; answer: string }> {
  return [
    ...shopperFaq("faq_wasmachine"),
    {
      id: "faq_wasmachine_gewicht",
      question: "Hoeveel kilogram vulgewicht heb ik nodig?",
      answer:
        "Er is geen vast aantal kilo per persoon. Kijk hoe vaak je wast, of dekbedovertrekken en handdoeken meekomen en welk vulgewicht bij het model staat. Dat getal is het maximum droge katoen voor het labelprogramma. Fijn en synthetisch wasgoed vul je niet tot dat maximum.",
    },
    {
      id: "faq_wasmachine_toeren",
      question: "Wat is het verschil tussen 1400 en 1600 toeren?",
      answer:
        "Een hoger toerental haalt doorgaans meer water uit de was. Het verschil is niet voor elke lading hetzelfde, en 1600 toeren is niet voor elk huishouden nodig. Vergelijk ook de centrifuge-efficiëntieklasse op het label van het model.",
    },
    {
      id: "faq_wasmachine_label",
      question: "Wat betekent energieklasse A bij een wasmachine?",
      answer:
        "Op het huidige label loopt de schaal van A tot en met G. A is daar de zuinigste klasse voor het Eco 40-60-programma en is niet de oude A+++. Lees ook het stroomverbruik per 100 wasbeurten en het waterverbruik per wasbeurt. Je eigen programma kan daarvan afwijken.",
    },
    {
      id: "faq_wasmachine_water",
      question: "Hoeveel water verbruikt een wasmachine?",
      answer:
        "Het label vermeldt liters per wasbeurt voor het testprogramma. Een ander programma of een andere belading verbruikt iets anders. Vergelijk de liters die bij de machines staan; er is geen enkel verbruikscijfer voor alle modellen.",
    },
    {
      id: "faq_wasmachine_plaats",
      question: "Hoe weet ik of een wasmachine in mijn ruimte past?",
      answer:
        "Meet de vrije breedte, hoogte en diepte, inclusief slangen achter de machine en de ruimte die de deur nodig heeft. Gebruik de maten van het model. De draairichting telt mee wanneer die is ingevuld.",
    },
    {
      id: "faq_wasmachine_stoom",
      question: "Is een stoomfunctie nuttig?",
      answer:
        "Alleen als het model stoom heeft en jij die programma's gebruikt, bijvoorbeeld tegen kreuk of om een kledingstuk op te frissen. Stoom is geen vervanging voor een wasbeurt van vuile was.",
    },
    {
      id: "faq_wasmachine_trillen",
      question: "Hoe voorkom ik dat mijn wasmachine gaat trillen?",
      answer:
        "Zet de machine waterpas, haal de transportbeveiliging er vóór het eerste gebruik af en verdeel de was. Een scheve lading geeft meer beweging dan het decibelgetal alleen verklaart.",
    },
    {
      id: "faq_wasmachine_stapelen",
      question: "Kan ik een droger boven op mijn wasmachine plaatsen?",
      answer:
        "Dat kan als de droger bij die wasmachine past en je de stapelset gebruikt die daarbij hoort. De wasmachine blijft onder en moet waterpas staan.",
    },
  ]
}

function dryerFaq(): Array<{ id: string; question: string; answer: string }> {
  return [
    ...shopperFaq("faq_droger"),
    {
      id: "faq_droger_techniek",
      question: "Wat is het verschil tussen een warmtepompdroger en een condensdroger?",
      answer:
        "Een warmtepompdroger gebruikt de warmte opnieuw en droogt op een lagere temperatuur. Die verbruikt doorgaans minder stroom dan een condensdroger zonder warmtepomp; de droogtijd kan langer zijn. Welke techniek een model heeft, staat er alleen als dat is ingevuld. Vergelijk het energielabel van dat model.",
    },
    {
      id: "faq_droger_gewicht",
      question: "Welke droogcapaciteit heb ik nodig?",
      answer:
        "De capaciteit is het gewicht droge was dat de droger opgeeft. Stem die af op de was die je in één keer wilt drogen, niet automatisch op het maximum van je wasmachine. Een vollere trommel dan het model aangeeft droogt niet beter.",
    },
    {
      id: "faq_droger_label",
      question: "Hoe lees ik het energielabel van een droger?",
      answer:
        "Gebruik de klasse en het verbruik die bij dit model staan. Een warmtepomp staat vaak zuiniger op het label dan een condensdroger, maar het label van het model telt, niet de technieknaam alleen. Daar volgt geen bedrag voor je jaarverbruik uit.",
    },
    {
      id: "faq_droger_geluid",
      question: "Hoeveel geluid maakt een droger?",
      answer:
        "Vergelijk het opgegeven decibelgetal. Een lager getal is op die meting stiller. Er is geen waarde die voor elke woning stil genoeg is. In een open ruimte hoor je de droger meer dan achter een dichte deur.",
    },
    {
      id: "faq_droger_plaats",
      question: "Waar plaats ik een droger?",
      answer:
        "Gebruik de opgegeven afmetingen en houd ruimte voor de deur en, bij een luchtafvoer, voor de afvoerslang. Een condens- of warmtepompdroger voert het vocht af via een reservoir of een afvoer, wanneer het model dat zo vermeldt. Zet de droger waterpas.",
    },
    {
      id: "faq_droger_stapelen",
      question: "Kan ik een droger op een wasmachine stapelen?",
      answer:
        "Ja, met een stapelset die bij beide apparaten past. De droger komt bovenop, de wasmachine blijft onder en staat waterpas. Zonder passende set stapelen is geen veilige oplossing.",
    },
    {
      id: "faq_droger_onderhoud",
      question: "Hoe houd ik een droger in conditie?",
      answer:
        "Maak het pluizenfilter na het drogen leeg. Bij een warmtepomp hoort ook het onderhoud van de warmtewisselaar, zoals de handleiding van dat model beschrijft. Een verstopt filter maakt de droogtijd langer.",
    },
    {
      id: "faq_droger_los",
      question: "Wanneer is een losse droger handiger dan een was-droogcombinatie?",
      answer:
        "Als je een volgende was wilt starten terwijl de eerste droogt, of als je de droogcapaciteit gelijk wilt houden aan een volle trommel. Een combinatie staat in één kast en droogt na het wassen, vaak met een lagere droogcapaciteit dan de wascapaciteit.",
    },
  ]
}

function comboFaq(): Array<{ id: string; question: string; answer: string }> {
  return [
    ...shopperFaq("faq_combi"),
    {
      id: "faq_combi_wanneer",
      question: "Wanneer past een was-droogcombinatie bij mij?",
      answer:
        "Als je één apparaat kwijt kunt en wassen en drogen na elkaar accepteert. Was je veel achter elkaar, dan zijn een losse wasmachine en droger vaak praktischer. De combinatie staat op een eigen pagina en telt niet mee als losse wasmachine.",
    },
    {
      id: "faq_combi_capaciteit",
      question: "Is de droogcapaciteit gelijk aan het wasvulgewicht?",
      answer:
        "Vaak niet. Gebruik de twee getallen die het model noemt: hoeveel kilogram het wast en hoeveel kilogram het in één programma droogt. Een volle wasbeurt past dus niet vanzelf in de droogcyclus.",
    },
    {
      id: "faq_combi_label",
      question: "Hoe lees ik het energielabel van een was-droogcombinatie?",
      answer:
        "Het label van een combinatie laat het wassen en de volledige was- en droogcyclus apart zien, op de schaal A tot en met G. Dat is een ander label dan dat van een losse wasmachine. Vergelijk de klasse en het verbruik van het programma dat jij gebruikt.",
    },
    {
      id: "faq_combi_maten",
      question: "Hoeveel ruimte heeft een was-droogcombinatie nodig?",
      answer:
        "Reken met de breedte, hoogte en diepte van het model, plus ruimte voor slangen en de deur. Omdat wassen en drogen in één kast zitten, heb je geen tweede apparaat naast of boven de machine nodig.",
    },
    {
      id: "faq_combi_tijd",
      question: "Hoe lang duurt wassen en drogen achter elkaar?",
      answer:
        "De machine voert de twee stappen na elkaar uit, dus de totale duur is langer dan alleen wassen. De programmaduur staat bij het model en hangt af van het gekozen programma en de belading.",
    },
    {
      id: "faq_combi_geluid",
      question: "Maakt een combinatie evenveel geluid bij drogen als bij wassen?",
      answer:
        "Niet per se. Centrifugeren en drogen klinken anders. Gebruik de decibelwaarde die bij het model staat en bedenk of de machine in een leefruimte staat. Een lager getal is op die meting stiller, niet automatisch stil genoeg voor elk huis.",
    },
    {
      id: "faq_combi_functies",
      question: "Welke extra functies heeft een was-droogcombinatie?",
      answer:
        "Stoom, een kort programma of bediening via een app gelden alleen als dat model ze vermeldt. Een functienaam van een merk zegt niets over een ander model. Ontbreekt de functie op de kaart, dan is ze voor dat model niet bekend.",
    },
    {
      id: "faq_combi_onderhoud",
      question: "Hoe onderhoud ik een was-droogcombinatie?",
      answer:
        "Maak het wasmiddellaatje, de deurrubber en het pluizenfilter schoon, en laat de deur na gebruik op een kier. Welk onderhoudsprogramma het model heeft, staat in de handleiding van dat model.",
    },
  ]
}

function washerDryerSetFaq(): Array<{ id: string; question: string; answer: string }> {
  return [
    ...shopperFaq("faq_set"),
    {
      id: "faq_set_wanneer",
      question: "Wanneer heb ik een wasmachine én een droger nodig?",
      answer:
        "Als je na het wassen meteen wilt drogen, of een volgende was wilt starten terwijl de eerste droogt. Eén wasmachine is genoeg als je aan de lijn of op een rek droogt. Een combinatie doet beide in één kast.",
    },
    {
      id: "faq_set_gewicht",
      question: "Moet de droger evenveel kilogram aankunnen als de wasmachine?",
      answer:
        "Stem de droger af op de was die je in één keer wilt drogen. Dat hoeft niet het maximum van de wasmachine te zijn. Een kleinere droger droogt een volle trommel in meer dan één beurt.",
    },
    {
      id: "faq_set_label",
      question: "Kan ik het energielabel van wasmachine en droger vergelijken?",
      answer:
        "Nee. Het zijn verschillende labels, elk voor het eigen testprogramma. Zet wasmachines onderling naast elkaar en drogers onderling. Een klasse van de wasmachine zegt niets over de droger.",
    },
    {
      id: "faq_set_plaats",
      question: "Hoe plaats ik een wasmachine en een droger?",
      answer:
        "Naast elkaar als je de vloeroppervlakte hebt, of de droger bovenop de wasmachine met een passende stapelset. De wasmachine blijft onder en staat waterpas. Gebruik de maten van beide modellen.",
    },
  ]
}

function builtInDishwasherFaq(): Array<{ id: string; question: string; answer: string }> {
  return [
    ...shopperFaq("faq_vaat_inbouw"),
    {
      id: "faq_vaat_inbouw_verschil",
      question: "Wat is het verschil tussen een inbouw- en een vrijstaande vaatwasser?",
      answer:
        "Een inbouwmodel gaat in een nis en krijgt een keukenfront. Een vrijstaand model heeft een eigen deur en zet je naast het aanrecht. Het zijn twee pagina's. De maten van het model bepalen of het past, niet de paginanaam.",
    },
    {
      id: "faq_vaat_inbouw_nis",
      question: "Hoe weet ik of een inbouwvaatwasser in de nis past?",
      answer:
        "Gebruik de breedte en de nishoogte die bij het model zijn ingevuld, en de ruimte voor de deur en de aansluitingen. Een ontbrekende maat wordt niet ingevuld of geschat.",
    },
    {
      id: "faq_vaat_inbouw_label",
      question: "Wat zegt het energielabel van een vaatwasser?",
      answer:
        "Vergelijk de klasse van het eco-programma en, wanneer ze zijn ingevuld, het stroom- en waterverbruik per cyclus. Het label van een vaatwasser zegt niets over een wasmachine. Er volgt geen bedrag voor je jaarverbruik uit.",
    },
    {
      id: "faq_vaat_inbouw_water",
      question: "Hoe vergelijk ik het waterverbruik?",
      answer:
        "Zet de liters per cyclus naast elkaar wanneer die bij de modellen staan. Een ander programma verbruikt een andere hoeveelheid. Er is geen algemeen litertal voor alle vaatwassers.",
    },
    {
      id: "faq_vaat_inbouw_geluid",
      question: "Hoe stil is een vaatwasser in een open keuken?",
      answer:
        "Vergelijk het opgegeven decibelgetal. Een lager getal is op die meting stiller. In een open keuken hoor je het programma in de kamer. Er is geen decibelwaarde die voor elke keuken stil genoeg is.",
    },
    {
      id: "faq_vaat_inbouw_droog",
      question: "Wat betekent de droogtechniek?",
      answer:
        "Drogen kan met condens, een deur die automatisch opent of een ander systeem dat het model noemt, zoals zeoliet. Gebruik de techniek die bij die vaatwasser is ingevuld. Staat ze er niet bij, dan is de droogwijze niet bekend.",
    },
    {
      id: "faq_vaat_inbouw_aansluit",
      question: "Waar let ik op bij het aansluiten van een inbouwvaatwasser?",
      answer:
        "Je hebt water, een afvoer en stroom nodig, plus een nis die bij de maten van het model past. Een meubelfront hoort bij de modellen die daarvoor bedoeld zijn. Volg het installatievoorschrift van dat model.",
    },
    {
      id: "faq_vaat_inbouw_onderhoud",
      question: "Hoe onderhoud ik een vaatwasser?",
      answer:
        "Maak de filters en de sproeiarmen schoon zoals de handleiding van het model beschrijft. Zout en glansspoelmiddel gebruik je alleen als het model die reservoirs heeft. Etensresten die je eraf haalt vóór het inruimen, houden de filter langer bruikbaar.",
    },
  ]
}

function freestandingDishwasherFaq(): Array<{ id: string; question: string; answer: string }> {
  return [
    ...shopperFaq("faq_vaat_vrij"),
    {
      id: "faq_vaat_vrij_verschil",
      question: "Wanneer kies ik een vrijstaande vaatwasser?",
      answer:
        "Als je geen nis achter een keukenfront hebt, of als het apparaat een eigen deur moet hebben. Een inbouwmodel hoort in een kastnis. Gebruik de pagina die bij de uitvoering past.",
    },
    {
      id: "faq_vaat_vrij_maat",
      question: "Hoe weet ik of een vrijstaande vaatwasser past?",
      answer:
        "Meet de vrije breedte, hoogte en diepte naast of onder het aanrecht, inclusief slangen en de deur. Gebruik de maten die bij het model staan. Een lege maat wordt niet geschat.",
    },
    {
      id: "faq_vaat_vrij_label",
      question: "Wat zegt het energielabel van een vaatwasser?",
      answer:
        "Vergelijk de klasse van het eco-programma en de verbruiksgetallen die bij het model staan. Het label gaat over die meetcyclus. Je eigen programma kan meer of minder vragen, en het label wordt niet omgerekend naar een jaarbedrag.",
    },
    {
      id: "faq_vaat_vrij_water",
      question: "Hoe vergelijk ik het waterverbruik?",
      answer:
        "Kijk naar de liters per cyclus wanneer die zijn ingevuld. Programma en belading veranderen het verbruik. Zet alleen modellen naast elkaar waarvan dat getal bekend is.",
    },
    {
      id: "faq_vaat_vrij_geluid",
      question: "Hoe vergelijk ik het geluid van een vrijstaande vaatwasser?",
      answer:
        "Gebruik het decibelgetal van het model. Een lager getal is op die meting stiller. Een vrijstaand apparaat staat vaak dichter bij de leefruimte dan een inbouwmodel achter een front, dus de plek telt mee. Er is geen algemeen stildrempel.",
    },
    {
      id: "faq_vaat_vrij_droog",
      question: "Wat betekent de droogtechniek?",
      answer:
        "De droogwijze staat bij het model, bijvoorbeeld condens, een deur die opent of een zeoliet-systeem. Alleen die vermelding telt. De techniek zegt niet vanzelf hoe droog jouw vaat uit een ander programma komt.",
    },
    {
      id: "faq_vaat_vrij_aansluit",
      question: "Hoe sluit ik een vrijstaande vaatwasser aan?",
      answer:
        "Het model heeft water, een afvoer en een stopcontact nodig. De aansluitset en de maten volg je uit het voorschrift van dat model. Een vrijstaand apparaat heeft geen keukenfront nodig.",
    },
    {
      id: "faq_vaat_vrij_onderhoud",
      question: "Hoe onderhoud ik een vaatwasser?",
      answer:
        "Spoel de filter schoon en controleer de sproeiarmen, zoals de handleiding van het model aangeeft. Zout en glansspoelmiddel horen alleen bij modellen met die reservoirs.",
    },
  ]
}

function laundryFaq(): Array<{ id: string; question: string; answer: string }> {
  return [
    {
      id: "faq_was_bestellen",
      question: "Hoe werkt bestellen via EuropMade?",
      answer:
        "EuropMade verkoopt de apparaten niet zelf. De koop sluit je met de verkoper van de aanbieding die je kiest. Prijs en aanbod staan op de productpagina; de bestelling rond je af bij het afrekenen. Een vraag over een geplaatste bestelling stel je via Berichten bij die bestelling. Uitleg over bestellen staat bij Klantenservice.",
    },
    {
      id: "faq_was_verzending",
      question: "Wie verzendt mijn bestelling?",
      answer:
        "De verkoper verzendt. Verzendkosten, levertijd en vervoerder horen bij die aanbieding en zie je bij de aanbieding en bij het afrekenen. Koop je bij meer dan één verkoper, dan kan de levering in delen aankomen. Vertraging of schade meld je via Berichten bij de bestelling. De pagina Verzending licht dit toe.",
    },
    {
      id: "faq_was_retour",
      question: "Hoe werkt retourneren?",
      answer:
        "Hoe lang je kunt retourneren, hangt af van de verkoper en staat bij de aanbieding. Dat kan 14 of 30 dagen zijn. Een retour vraag je aan via Mijn EuropMade, onder Retouren. De verkoper stuurt daarna de instructies. Hygiënisch verzegelde of gepersonaliseerde producten kunnen zijn uitgesloten; ook dat staat bij de aanbieding. De pagina Retourneren zet de stappen op een rij.",
    },
    {
      id: "faq_was_herkomst",
      question: "Wat betekent Made in Europe bij EuropMade?",
      answer:
        "Made in Europe is geen merknaam. EuropMade beoordeelt herkomst met vaste criteria voor assemblage, onderdelen en materialen. Een score zie je alleen als die voor dat product is vastgelegd. Een Europese merknaam alleen is geen bewijs van herkomst. De uitleg staat op de pagina Hoe bepaalt EuropMade Made in Europe.",
    },
    {
      id: "faq_was_vulgewicht",
      question: "Welk vulgewicht past bij mijn huishouden?",
      answer:
        "Het vulgewicht is de hoeveelheid droge katoenwas die de fabrikant opgeeft. Voor één of twee personen is een kleinere trommel vaak genoeg; veel modellen zijn 7 of 8 kilogram. Een huishouden van drie of vier personen komt vaak uit bij 7 of 8 kilogram. Bij vijf personen of meer, of bij groot beddengoed, kijk je eerder naar 9 kilogram of meer. Fijne of synthetische was vul je niet tot dat maximum. Gebruik het getal dat bij het model staat en vergelijk de wasmachines op vulgewicht.",
    },
    {
      id: "faq_was_droogtechniek",
      question: "Wat is het verschil tussen een warmtepompdroger en een condensdroger?",
      answer:
        "Een warmtepompdroger gebruikt de warmte opnieuw en droogt op een lagere temperatuur. Die verbruikt doorgaans minder stroom dan een condensdroger zonder warmtepomp, en de droogtijd kan langer zijn. Een condensdroger verwarmt de lucht per beurt, is vaak sneller klaar en verbruikt meer stroom. Welke techniek een model heeft, staat alleen zo vermeld als dat in het productdossier staat. Vergelijk het energielabel van dat model; de pagina wijst geen zuinigste droger aan.",
    },
    {
      id: "faq_was_stapelen",
      question: "Kan ik een droger op mijn wasmachine plaatsen?",
      answer:
        "Soms wel, als de fabrikant stapelen toestaat en je de bijpassende stapelset gebruikt. Zet de droger bovenop de wasmachine, niet andersom: de wasmachine is zwaarder en trilt bij het centrifugeren. Zet de onderste machine waterpas. Of een model stapelbaar is, staat in de installatiegegevens van dat model.",
    },
    {
      id: "faq_was_trillen",
      question: "Hoe voorkom ik dat mijn wasmachine gaat trillen?",
      answer:
        "Zet de machine waterpas op een stabiele vloer. Haal bij een nieuwe of verhuisde machine de transportbeveiliging uit de achterkant vóór het eerste gebruik, zoals de handleiding van dat model aangeeft. Eén zwaar stuk, zoals een badmat, laat de trommel slingeren; verdeel de was. Blijft de machine hard bonken terwijl hij recht staat en de lading gelijkmatig is, open de behuizing dan niet zelf. Kijk eerst of er nog garantie is en neem contact op via Berichten bij de bestelling.",
    },
  ]
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
      const body = textNl(slot.body)
      if (title && !isGenericGeneratedUspTitle(title) && !PREVIOUS_USP_BODIES.has(body)) return
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
  const prompt = choicePromptFor(context.slug)
  if (choice && prompt && isAutomaticChoice(textNl(choice.title), textNl(choice.body))) {
    choice.title = nl(prompt.title)
    choice.body = nl(prompt.body)
    if (isAutomaticChoiceCta(textNl(choice.cta_label))) choice.cta_label = nl(prompt.ctaLabel)
    if (isAutomaticChoiceHref(choice.href) || isStaleComparisonHref(choice.href)) choice.href = prompt.href
    filled.push("choice.prompt")
  } else if (
    choice &&
    prompt &&
    textNl(choice.title) === prompt.title &&
    textNl(choice.body) === prompt.body &&
    isStaleComparisonHref(choice.href)
  ) {
    choice.href = prompt.href
    filled.push("choice.href")
  } else if (choice && (textNl(choice.body).includes("De keuzehulp gebruikt alleen specificaties") || textNl(choice.body).includes("Elke kaart opent"))) {
    choice.body = nl(
      `Beantwoord een paar vragen over ${context.name.trim()}. Een vraag verschijnt alleen als meerdere producten in deze groep dezelfde soort specificatie hebben.`
    )
    filled.push("choice.body")
  } else if (choice && !textNl(choice.title) && !textNl(choice.body)) {
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
    const kept = faq.items.filter(
      (item) => !templateFaqQuestion(textNl(item.question)) && !staleGeneratedFaq(textNl(item.question))
    )
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
  if (hero && replaceableHeroIntro(context.slug, textNl(hero.intro))) {
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
