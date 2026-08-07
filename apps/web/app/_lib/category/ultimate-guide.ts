/**
 * Interactive ultimate-guide layer — presentation only.
 * Adds top lists, Q&A, attribute knowledge, when-not, save-money, lifespan.
 */

import type { StorefrontLocale } from "../i18n/locales"
import type { CategorySortKey } from "../category-listing"
import type { ListingProduct } from "../listing-products"
import {
  getSpecialistGuide,
  type SpecialistGuide,
} from "./buying-guide-specialist"

function pick(
  locale: StorefrontLocale,
  nl: string,
  en: string,
  de = en,
  fr = en
): string {
  if (locale === "en") return en
  if (locale === "de") return de
  if (locale === "fr") return fr
  return nl
}

export type GuidePickStrategy =
  | "best"
  | "value"
  | "premium"
  | "budget"
  | "rating"
  | "verified"

export type TopListDef = {
  id: string
  emoji: string
  title: string
  subtitle: string
  strategy: GuidePickStrategy
  filterIds: string[]
  sort: CategorySortKey
}

export type BuyingQuestion = {
  id: string
  question: string
  answer: string
  focusAttr?: string
  filterIds?: string[]
}

export type AttributeKnowledge = {
  id: string
  match: string
  title: string
  what: string
  whenImportant: string
  whenNot: string
  commonMistake: string
  recommended: string
  examples: string
}

export type ComparisonRow = {
  scenario: string
  pick: string
  why: string
}

export type UltimateGuide = SpecialistGuide & {
  topListsHeading: string
  topLists: TopListDef[]
  buyingQuestions: BuyingQuestion[]
  attributesHeading: string
  attributes: AttributeKnowledge[]
  whenNotHeading: string
  whenNot: string[]
  saveMoneyHeading: string
  saveMoney: string[]
  lifespanHeading: string
  lifespan: { title: string; body: string }[]
  comparisonHeading: string
  comparisonRows: ComparisonRow[]
  personaCta: string
  top3Heading: string
  applyFiltersLabel: string
  showProductsLabel: string
}

function scoreBest(p: ListingProduct): number {
  return p.rating * 20 + (p.verified ? 8 : 0) + p.offerCount * 2
}

function scoreValue(p: ListingProduct): number {
  const priceScore = Math.max(0, 400 - p.priceCents / 100)
  return p.rating * 15 + priceScore / 10 + (p.verified ? 5 : 0)
}

export function pickTopProducts(
  products: ListingProduct[],
  strategy: GuidePickStrategy,
  limit = 3
): ListingProduct[] {
  const copy = [...products]
  switch (strategy) {
    case "budget":
      return copy
        .sort((a, b) => a.priceCents - b.priceCents || b.rating - a.rating)
        .slice(0, limit)
    case "premium":
      return copy
        .sort((a, b) => b.priceCents - a.priceCents || b.rating - a.rating)
        .slice(0, limit)
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating).slice(0, limit)
    case "verified":
      return copy
        .filter((p) => p.verified)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, limit)
    case "value":
      return copy.sort((a, b) => scoreValue(b) - scoreValue(a)).slice(0, limit)
    case "best":
    default:
      return copy.sort((a, b) => scoreBest(b) - scoreBest(a)).slice(0, limit)
  }
}

function electronicsExtras(
  locale: StorefrontLocale,
  label: string
): Omit<
  UltimateGuide,
  keyof SpecialistGuide | "topListsHeading" | "personaCta" | "top3Heading" | "applyFiltersLabel" | "showProductsLabel"
> {
  return {
    topLists: [
      {
        id: "best",
        emoji: "🏆",
        title: pick(locale, "Beste keuze", "Best pick"),
        subtitle: pick(locale, "Hoogste totaalscore", "Highest overall score"),
        strategy: "best",
        filterIds: [],
        sort: "rating",
      },
      {
        id: "value",
        emoji: "💰",
        title: pick(locale, "Beste prijs-kwaliteit", "Best value"),
        subtitle: pick(locale, "Balans prijs & reviews", "Balance of price & reviews"),
        strategy: "value",
        filterIds: [],
        sort: "popularity",
      },
      {
        id: "premium",
        emoji: "⭐",
        title: pick(locale, "Beste premium", "Best premium"),
        subtitle: pick(locale, "Als je topprestaties nodig hebt", "When you need top performance"),
        strategy: "premium",
        filterIds: [],
        sort: "price-desc",
      },
      {
        id: "student",
        emoji: "👨‍🎓",
        title: pick(locale, "Beste voor studenten", "Best for students"),
        subtitle: pick(locale, "Licht, batterij, budget", "Light, battery, budget"),
        strategy: "budget",
        filterIds: ["type_laptop", "usbc_yes"],
        sort: "price-asc",
      },
      {
        id: "family",
        emoji: "👨‍👩‍👧",
        title: pick(locale, "Beste voor gezinnen", "Best for families"),
        subtitle: pick(locale, "Betrouwbaar & Verified™", "Reliable & Verified™"),
        strategy: "verified",
        filterIds: [],
        sort: "rating",
      },
      {
        id: "business",
        emoji: "🏢",
        title: pick(locale, "Beste zakelijk", "Best for business"),
        subtitle: pick(locale, "Stabiel voor werkdagen", "Stable for workdays"),
        strategy: "rating",
        filterIds: ["type_laptop"],
        sort: "rating",
      },
      {
        id: "travel",
        emoji: "🎒",
        title: pick(locale, "Beste voor onderweg", "Best for travel"),
        subtitle: pick(locale, "USB-C & draagbaar", "USB-C & portable"),
        strategy: "value",
        filterIds: ["usbc_yes", "wireless_yes"],
        sort: "popularity",
      },
    ],
    buyingQuestions: [
      {
        id: "q_which",
        question: pick(locale, `Welke ${label.toLowerCase()} past bij mij?`, `Which ${label.toLowerCase()} fits me?`),
        answer: pick(
          locale,
          "Start bij gebruik: studie/onderweg → licht + batterij; kantoor → schermcomfort; creatief → processor + geheugen. Kies daarna pas merk en prijs.",
          "Start with use: study/travel → light + battery; office → screen comfort; creative → CPU + memory. Only then brand and price."
        ),
      },
      {
        id: "q_ram",
        question: pick(locale, "Hoeveel geheugen heb ik nodig?", "How much memory do I need?"),
        answer: pick(
          locale,
          "8 GB: licht gebruik. 16 GB: sweet spot voor de meeste mensen. 32 GB+: alleen bij zware multitask of pro-bewerking.",
          "8 GB: light use. 16 GB: sweet spot for most people. 32 GB+: only heavy multitask or pro editing."
        ),
        focusAttr: "geheugen",
      },
      {
        id: "q_cpu",
        question: pick(locale, "Hoe belangrijk is de processor?", "How important is the processor?"),
        answer: pick(
          locale,
          "Belangrijk bij video, design of zware apps. Voor mail, Office en browse koop je beter batterij en comfort dan extra cores.",
          "Important for video, design or heavy apps. For mail, Office and browse, buy battery and comfort over extra cores."
        ),
        focusAttr: "processor",
      },
      {
        id: "q_screen",
        question: pick(locale, "Hoe groot moet mijn scherm zijn?", "How large should my screen be?"),
        answer: pick(
          locale,
          "13–14\": maximaal meeneembaar. 15–16\": thuis/kantoorcomfort. Groter is zelden nodig tenzij je vast op één plek werkt.",
          "13–14\": maximum portability. 15–16\": home/office comfort. Larger is rarely needed unless you stay put."
        ),
        focusAttr: "scherm",
      },
      {
        id: "q_battery",
        question: pick(locale, "Wanneer is batterijduur belangrijk?", "When does battery life matter?"),
        answer: pick(
          locale,
          "Als je vaak onderweg bent of weinig laadtijd hebt. Thuis aan de stekker mag batterij minder zwaar wegen dan scherm en toetsenbord.",
          "If you’re often on the go or short on charge time. At a desk, battery can weigh less than screen and keyboard."
        ),
        focusAttr: "batterij",
      },
      {
        id: "q_usbc",
        question: pick(locale, "Wanneer is USB-C belangrijk?", "When does USB-C matter?"),
        answer: pick(
          locale,
          "Als je met één kabel wilt laden én docken. Voor reizen en bureaus met dockingstation is USB-C vaak doorslaggevender dan een snellere CPU.",
          "If you want one-cable charge and dock. For travel and docked desks, USB-C often beats a faster CPU."
        ),
        focusAttr: "usb-c",
        filterIds: ["usbc_yes"],
      },
      {
        id: "q_nopremium",
        question: pick(locale, "Wanneer heb ik géén dure laptop nodig?", "When don’t I need an expensive laptop?"),
        answer: pick(
          locale,
          "Als je vooral browsen, Office, video’s en lichte apps doet. Betaal dan voor betrouwbaarheid en comfort — niet voor topsnelheid die stilstaat.",
          "If you mainly browse, use Office, watch video and light apps. Pay for reliability and comfort — not unused top speed."
        ),
      },
    ],
    attributesHeading: pick(
      locale,
      "Belangrijkste eigenschappen",
      "Key attributes"
    ),
    attributes: [
      {
        id: "attr_cpu",
        match: "processor",
        title: pick(locale, "Processor", "Processor"),
        what: pick(locale, "Bepaalt hoe snel zware taken lopen.", "Sets how fast heavy tasks run."),
        whenImportant: pick(locale, "Video, design, development, zware multitask.", "Video, design, development, heavy multitask."),
        whenNot: pick(locale, "Mail, browse, Netflix, lichte Office.", "Mail, browse, Netflix, light Office."),
        commonMistake: pick(locale, "Meer cores kopen ‘voor later’ zonder dat gebruik.", "Buying more cores ‘for later’ without that use."),
        recommended: pick(locale, "Middenklasse CPU voor dagelijks; top alleen bij wekelijks zwaar werk.", "Mid-range CPU for daily; top only for weekly heavy work."),
        examples: pick(locale, "Student: midden. Editor: hoog. Alleen mail: basis.", "Student: mid. Editor: high. Mail-only: basic."),
      },
      {
        id: "attr_ram",
        match: "geheugen",
        title: pick(locale, "Geheugen", "Memory"),
        what: pick(locale, "Houdt apps soepel open naast elkaar.", "Keeps apps smooth side by side."),
        whenImportant: pick(locale, "Veel tabs, design, virtuele machines.", "Many tabs, design, VMs."),
        whenNot: pick(locale, "Eén app tegelijk, licht gebruik.", "One app at a time, light use."),
        commonMistake: pick(locale, "32 GB kopen terwijl 16 GB genoeg is.", "Buying 32 GB when 16 GB is enough."),
        recommended: pick(locale, "16 GB is de sweet spot voor de meeste mensen.", "16 GB is the sweet spot for most people."),
        examples: pick(locale, "Browser+Office: 16 GB. Pro edit: 32 GB+.", "Browser+Office: 16 GB. Pro edit: 32 GB+."),
      },
      {
        id: "attr_screen",
        match: "scherm",
        title: pick(locale, "Scherm", "Display"),
        what: pick(locale, "Bepaalt leescomfort en beeldkwaliteit.", "Drives reading comfort and image quality."),
        whenImportant: pick(locale, "Lange sessies, foto/video, heldere ruimtes.", "Long sessions, photo/video, bright rooms."),
        whenNot: pick(locale, "Korte checks of vast aan extern scherm.", "Short checks or always on external display."),
        commonMistake: pick(locale, "OLED kopen zonder dat je het verschil merkt.", "Buying OLED when you won’t notice the difference."),
        recommended: pick(locale, "Kies formaat naar meeneembaarheid; helderheid naar gebruik.", "Pick size for portability; brightness for your use."),
        examples: pick(locale, "Reizen: 13–14\". Bureau: 15–16\".", "Travel: 13–14\". Desk: 15–16\"."),
      },
      {
        id: "attr_bat",
        match: "batterij",
        title: pick(locale, "Batterij", "Battery"),
        what: pick(locale, "Hoe lang je zonder stekker kunt werken.", "How long you can work unplugged."),
        whenImportant: pick(locale, "College, trein, klantbezoek, weinig stopcontacten.", "Campus, train, client visits, few outlets."),
        whenNot: pick(locale, "Altijd aan dockingstation of thuisbureau.", "Always docked or at a home desk."),
        commonMistake: pick(locale, "Batterij negeren voor een snellere CPU die je niet nodig hebt.", "Ignoring battery for a faster CPU you don’t need."),
        recommended: pick(locale, "Prioriteer batterij als je >3u/dag onderweg bent.", "Prioritise battery if you’re >3h/day on the go."),
        examples: pick(locale, "Student/reiziger: hoog. Vast bureau: middel.", "Student/traveller: high. Fixed desk: medium."),
      },
      {
        id: "attr_weight",
        match: "gewicht",
        title: pick(locale, "Gewicht", "Weight"),
        what: pick(locale, "Bepaalt of meenemen prettig blijft.", "Decides if carrying stays comfortable."),
        whenImportant: pick(locale, "Dagelijks in tas of tussen locaties.", "Daily in a bag or between locations."),
        whenNot: pick(locale, "Vast op één bureau.", "Fixed on one desk."),
        commonMistake: pick(locale, "Zwaar ‘powerhouse’ kopen dat je niet meeneemt.", "Buying a heavy powerhouse you never carry."),
        recommended: pick(locale, "Lichter wint vaker dan sneller bij dagelijks transport.", "Lighter often beats faster for daily carry."),
        examples: pick(locale, "Pendelaar: licht. Studio: gewicht oké.", "Commuter: light. Studio: weight ok."),
      },
      {
        id: "attr_bt",
        match: "bluetooth",
        title: pick(locale, "Bluetooth / draadloos", "Bluetooth / wireless"),
        what: pick(locale, "Verbindt muis, headset en accessoires zonder kabel.", "Connects mouse, headset and accessories wirelessly."),
        whenImportant: pick(locale, "Veel accessoires, clean desk, onderweg.", "Many accessories, clean desk, on the go."),
        whenNot: pick(locale, "Alles vast bedraad of docking-only.", "Everything wired or dock-only."),
        commonMistake: pick(locale, "Bluetooth als hoofdreden kiezen i.p.v. batterij/geheugen.", "Choosing Bluetooth as the main reason over battery/memory."),
        recommended: pick(locale, "Handig, zelden de doorslaggevende aankoopreden.", "Handy, rarely the deciding purchase reason."),
        examples: pick(locale, "Headset-gebruiker: wel. Dock-only: optioneel.", "Headset user: yes. Dock-only: optional."),
      },
      {
        id: "attr_usbc",
        match: "usb-c",
        title: pick(locale, "USB-C", "USB-C"),
        what: pick(locale, "Eén poort voor laden, data en vaak video.", "One port for charge, data and often video."),
        whenImportant: pick(locale, "Reizen, docking, minimale kabels.", "Travel, docking, minimal cables."),
        whenNot: pick(locale, "Je blijft bij oude accessoires zonder adapterplan.", "You stick to legacy accessories without an adapter plan."),
        commonMistake: pick(locale, "USB-C negeren en later dongles stapelen.", "Ignoring USB-C and later stacking dongles."),
        recommended: pick(locale, "Kies USB-C laden als je onderweg of met een dock werkt.", "Choose USB-C charging if you travel or use a dock."),
        examples: pick(locale, "Pendelaar/dock: must. Vast oud setup: nice-to-have.", "Commuter/dock: must. Legacy setup: nice-to-have."),
      },
    ],
    whenNotHeading: pick(locale, "Koop dit NIET als…", "Don’t buy this if…"),
    whenNot: [
      pick(locale, "Je alleen browsen en mail doet — premium power is verspilling.", "You only browse and mail — premium power is waste."),
      pick(locale, "Je functies koopt ‘voor later’ die je dit jaar niet gebruikt.", "You buy features ‘for later’ you won’t use this year."),
      pick(locale, "Je altijd aan een vast scherm zit — koop geen ultralight premium zonder noodzaak.", "You’re always on a fixed display — don’t buy ultralight premium without need."),
      pick(locale, "Je de laagste prijs wilt zonder Verified™ of garantie te checken.", "You want the lowest price without checking Verified™ or warranty."),
      pick(locale, "Je OLED/32 GB wilt omdat het indrukwekkend klinkt, niet omdat je het nodig hebt.", "You want OLED/32 GB because it sounds impressive, not because you need it."),
    ],
    saveMoneyHeading: pick(locale, "Bespaar geld", "Save money"),
    saveMoney: [
      pick(locale, "Voor de meeste mensen is 16 GB geheugen voldoende.", "For most people, 16 GB memory is enough."),
      pick(locale, "32 GB koop je alleen bij zware multitask of pro-bewerking.", "Buy 32 GB only for heavy multitask or pro editing."),
      pick(locale, "Een OLED-scherm is niet altijd nodig — helderheid en formaat tellen vaker.", "OLED isn’t always needed — brightness and size matter more often."),
      pick(locale, "Premium loont alleen wanneer je de extra’s wekelijks gebruikt.", "Premium pays off only when you use the extras weekly."),
      pick(locale, "Vergelijk de Buy Box-totale deal, niet alleen de stickerprijs.", "Compare the Buy Box total deal, not just sticker price."),
      pick(locale, "Kies USB-C + goede batterij vóór een duurdere CPU die stilstaat.", "Pick USB-C + solid battery before a pricier idle CPU."),
    ],
    lifespanHeading: pick(locale, "Levensduur & onderhoud", "Lifespan & care"),
    lifespan: [
      {
        title: pick(locale, "Levensduur", "Lifespan"),
        body: pick(locale, "Met passende specs en updates gaan de meeste apparaten 4–6 jaar mee.", "With fitting specs and updates, most devices last 4–6 years."),
      },
      {
        title: pick(locale, "Onderhoud", "Maintenance"),
        body: pick(locale, "Houd software bij, vermijd extreme hitte, en gebruik een goede oplader.", "Keep software updated, avoid extreme heat, use a proper charger."),
      },
      {
        title: pick(locale, "Garantie & service", "Warranty & service"),
        body: pick(locale, "Check garantiejaar en retailer-service via de Buy Box — Verified™ helpt.", "Check warranty years and retailer service via Buy Box — Verified™ helps."),
      },
      {
        title: pick(locale, "Reparatie", "Repair"),
        body: pick(locale, "Vraag of batterij/scherm servicebaar is als je langer wilt meegaan.", "Ask if battery/screen are serviceable if you want longer life."),
      },
      {
        title: pick(locale, "Duurzaamheid", "Sustainability"),
        body: pick(locale, "Juist dimensioneren (niet overspecs) is vaak duurzamer dan ‘het duurste’.", "Right-sizing (not overspec) is often greener than ‘the most expensive’."),
      },
    ],
    comparisonHeading: pick(
      locale,
      "Welke uitvoering past bij welk gebruik?",
      "Which setup fits which use?"
    ),
    comparisonRows: [
      {
        scenario: pick(locale, "Student", "Student"),
        pick: pick(locale, "Licht + batterij + 16 GB", "Light + battery + 16 GB"),
        why: pick(locale, "Meenemen en studeren zonder overladen specs.", "Carry and study without overspec."),
      },
      {
        scenario: pick(locale, "Kantoor / werk", "Office / work"),
        pick: pick(locale, "Schermcomfort + toetsenbord + USB-C dock", "Screen comfort + keyboard + USB-C dock"),
        why: pick(locale, "Lange dagen: comfort wint van raw power.", "Long days: comfort beats raw power."),
      },
      {
        scenario: pick(locale, "Creatief / pro", "Creative / pro"),
        pick: pick(locale, "Sterke CPU + 32 GB + koelgedrag", "Strong CPU + 32 GB + thermals"),
        why: pick(locale, "Wekelijks zwaar werk moet soepel blijven.", "Weekly heavy work must stay smooth."),
      },
      {
        scenario: pick(locale, "Reizen", "Travel"),
        pick: pick(locale, "Ultralight + USB-C + batterij", "Ultralight + USB-C + battery"),
        why: pick(locale, "Gewicht en laden onderweg zijn kritiek.", "Weight and charging on the road are critical."),
      },
      {
        scenario: pick(locale, "Budget", "Budget"),
        pick: pick(locale, "Basis CPU, genoeg opslag, skip premium display", "Basic CPU, enough storage, skip premium display"),
        why: pick(locale, "Betaal voor wat je dagelijks raakt.", "Pay for what you touch daily."),
      },
      {
        scenario: pick(locale, "Prijs-kwaliteit", "Best value"),
        pick: pick(locale, "Middenklasse + Verified™ + sterke Buy Box", "Mid-range + Verified™ + strong Buy Box"),
        why: pick(locale, "Hier zit meestal de sweet spot.", "This is usually the sweet spot."),
      },
    ],
  }
}

function gardenExtras(locale: StorefrontLocale): ReturnType<typeof electronicsExtras> {
  return {
    topLists: [
      {
        id: "best",
        emoji: "🏆",
        title: pick(locale, "Beste keuze", "Best pick"),
        subtitle: pick(locale, "Betrouwbaar voor de meeste tuinen", "Reliable for most gardens"),
        strategy: "best",
        filterIds: [],
        sort: "rating",
      },
      {
        id: "value",
        emoji: "💰",
        title: pick(locale, "Beste prijs-kwaliteit", "Best value"),
        subtitle: pick(locale, "Sterke middenklasse", "Strong mid-range"),
        strategy: "value",
        filterIds: [],
        sort: "popularity",
      },
      {
        id: "premium",
        emoji: "⭐",
        title: pick(locale, "Beste premium / pro", "Best premium / pro"),
        subtitle: pick(locale, "Intensief of professioneel", "Intensive or professional"),
        strategy: "premium",
        filterIds: [],
        sort: "price-desc",
      },
      {
        id: "battery",
        emoji: "🔋",
        title: pick(locale, "Beste accu", "Best battery"),
        subtitle: pick(locale, "Vrij bewegen zonder snoer", "Move freely without a cord"),
        strategy: "value",
        filterIds: ["bat_yes"],
        sort: "rating",
      },
      {
        id: "electric",
        emoji: "🔌",
        title: pick(locale, "Beste elektrisch", "Best corded electric"),
        subtitle: pick(locale, "Constante kracht bij stroom", "Constant power near an outlet"),
        strategy: "rating",
        filterIds: ["el_yes"],
        sort: "rating",
      },
      {
        id: "family",
        emoji: "👨‍👩‍👧",
        title: pick(locale, "Beste voor gezinnen", "Best for families"),
        subtitle: pick(locale, "Wekelijks, veilig, Verified™", "Weekly, safe, Verified™"),
        strategy: "verified",
        filterIds: ["tt_mower"],
        sort: "rating",
      },
    ],
    buyingQuestions: [
      {
        id: "q_power",
        question: pick(locale, "Accu of elektrisch?", "Battery or electric?"),
        answer: pick(
          locale,
          "Accu voor vrijheid en middelgrote klussen. Elektrisch (snoer) voor lange sessies dicht bij stroom.",
          "Battery for freedom and mid jobs. Corded for long sessions near power."
        ),
        focusAttr: "accu",
      },
      {
        id: "q_force",
        question: pick(locale, "Welke kracht heb ik nodig?", "How much power do I need?"),
        answer: pick(
          locale,
          "Baseer op oppervlakte en vegetatie. Te veel kracht = zwaar en duur; te weinig = frustratie. Middenklasse dekt de meeste tuinen.",
          "Base on area and vegetation. Too much power = heavy/costly; too little = frustration. Mid-range covers most gardens."
        ),
      },
      {
        id: "q_pro",
        question: pick(locale, "Wanneer kies ik professioneel?", "When should I choose professional?"),
        answer: pick(
          locale,
          "Bij dagelijks/zwaar gebruik of als slijtdelen en service cruciaal zijn. Voor een gemiddelde gezinstuin is pro meestal overkill.",
          "For daily/heavy use or when parts and service are critical. For a typical family garden, pro is usually overkill."
        ),
      },
      {
        id: "q_cheap",
        question: pick(locale, "Wanneer is goedkoop genoeg?", "When is cheap enough?"),
        answer: pick(
          locale,
          "Bij lichte, incidentele klussen. Wekelijks of groot oppervlak: goedkoop kost later tijd en vervanging.",
          "For light, occasional jobs. Weekly or large area: cheap costs time and replacements later."
        ),
      },
    ],
    attributesHeading: pick(locale, "Belangrijkste eigenschappen", "Key attributes"),
    attributes: [
      {
        id: "attr_bat",
        match: "accu",
        title: pick(locale, "Accu", "Battery"),
        what: pick(locale, "Vrijheid zonder snoer; runtime bepaalt sessielengte.", "Freedom without a cord; runtime sets session length."),
        whenImportant: pick(locale, "Middelgrote tuinen, veel heen-en-weer lopen.", "Mid gardens, lots of walking around."),
        whenNot: pick(locale, "Urenlang op één plek met stopcontact vlakbij.", "Hours in one spot with an outlet nearby."),
        commonMistake: pick(locale, "Geen reserve-accu terwijl je lange sessies plant.", "No spare battery while planning long sessions."),
        recommended: pick(locale, "Kies runtime naar oppervlakte; overweeg platform-accu’s.", "Match runtime to area; consider platform batteries."),
        examples: pick(locale, "Klein: 1 accu. Middel: reserve. Pro: platform.", "Small: 1 pack. Mid: spare. Pro: platform."),
      },
      {
        id: "attr_el",
        match: "elektrisch",
        title: pick(locale, "Elektrisch (snoer)", "Corded electric"),
        what: pick(locale, "Constante kracht zonder laadtijd.", "Constant power without charge time."),
        whenImportant: pick(locale, "Lange sessies, zwaar werk dicht bij stroom.", "Long sessions, heavy work near power."),
        whenNot: pick(locale, "Grote percelen zonder handige stroompunten.", "Large plots without handy outlets."),
        commonMistake: pick(locale, "Snoer onderschatten op een obstakelrijke tuin.", "Underestimating the cord on an obstacle-heavy garden."),
        recommended: pick(locale, "Sterk bij vast gebruikspatroon nabij stopcontact.", "Strong for fixed patterns near an outlet."),
        examples: pick(locale, "Heg bij huis: elektrisch. Verre border: accu.", "Hedge by house: corded. Far border: battery."),
      },
      {
        id: "attr_width",
        match: "maaibreedte",
        title: pick(locale, "Maaibreedte / capaciteit", "Cutting width / capacity"),
        what: pick(locale, "Bepaalt hoe snel je klaar bent.", "Determines how fast you finish."),
        whenImportant: pick(locale, "Grotere gazons of frequente beurten.", "Larger lawns or frequent cuts."),
        whenNot: pick(locale, "Mini-tuin of sterk versnipperd terrein.", "Tiny garden or highly fragmented terrain."),
        commonMistake: pick(locale, "Te breed kopen voor een krappe, obstakelrijke tuin.", "Buying too wide for a tight, obstacle-heavy garden."),
        recommended: pick(locale, "Match capaciteit aan echt oppervlak, niet marketing.", "Match capacity to real area, not marketing."),
        examples: pick(locale, "Klein: compact. Groot: bredere capaciteit.", "Small: compact. Large: wider capacity."),
      },
      {
        id: "attr_weight",
        match: "gewicht",
        title: pick(locale, "Gewicht", "Weight"),
        what: pick(locale, "Bepaalt vermoeidheid tijdens de klus.", "Sets fatigue during the job."),
        whenImportant: pick(locale, "Lange sessies, hellingen, tillen in schuur.", "Long sessions, slopes, lifting into storage."),
        whenNot: pick(locale, "Zeer korte klussen met stevige gebruiker.", "Very short jobs with a strong user."),
        commonMistake: pick(locale, "Alleen naar pk’s kijken en gewicht negeren.", "Looking only at power and ignoring weight."),
        recommended: pick(locale, "Test tillen; comfort wint op wekelijkse klussen.", "Test lifting; comfort wins on weekly jobs."),
        examples: pick(locale, "Wekelijks: lichter. Incidenteel zwaar werk: oké zwaarder.", "Weekly: lighter. Occasional heavy: heavier ok."),
      },
    ],
    whenNotHeading: pick(locale, "Koop dit NIET als…", "Don’t buy this if…"),
    whenNot: [
      pick(locale, "Je een pro-machine koopt voor een patio-tuin.", "You’re buying a pro machine for a patio garden."),
      pick(locale, "Je wekelijks maait met het allergoedkoopste speelgoed-niveau.", "You mow weekly with the cheapest toy-grade tool."),
      pick(locale, "Je accu kiest zonder runtime te checken voor jouw oppervlak.", "You pick battery without checking runtime for your area."),
      pick(locale, "Je onderhoud en slijtdelen negeert.", "You ignore maintenance and wear parts."),
    ],
    saveMoneyHeading: pick(locale, "Bespaar geld", "Save money"),
    saveMoney: [
      pick(locale, "Deel één accu-platform over meerdere tools i.p.v. losse systemen.", "Share one battery platform across tools instead of separate systems."),
      pick(locale, "Middenklasse dekt de meeste gezinstuinen — pro is vaak overkill.", "Mid-range covers most family gardens — pro is often overkill."),
      pick(locale, "Goedkoop loont alleen bij incidenteel licht werk.", "Cheap only pays for occasional light work."),
      pick(locale, "Vergelijk Buy Box + onderdelenbeschikbaarheid, niet alleen prijs.", "Compare Buy Box + parts availability, not price alone."),
    ],
    lifespanHeading: pick(locale, "Levensduur & onderhoud", "Lifespan & care"),
    lifespan: [
      {
        title: pick(locale, "Onderhoud", "Maintenance"),
        body: pick(locale, "Reinig na gebruik, droog opbergen, slijtdelen tijdig vervangen.", "Clean after use, store dry, replace wear parts in time."),
      },
      {
        title: pick(locale, "Accu-zorg", "Battery care"),
        body: pick(locale, "Niet leeg/heet wegleggen; volg laadadvies van de producent.", "Don’t store empty/hot; follow producer charging advice."),
      },
      {
        title: pick(locale, "Garantie & service", "Warranty & service"),
        body: pick(locale, "Check Verified™, garantie en of messen/filters verkrijgbaar blijven.", "Check Verified™, warranty and whether blades/filters stay available."),
      },
      {
        title: pick(locale, "Duurzaamheid", "Sustainability"),
        body: pick(locale, "Juiste maat + onderhoud verlengt levensduur meer dan ‘het zwaarste model’.", "Right size + care extends life more than ‘the heaviest model’."),
      },
    ],
    comparisonHeading: pick(locale, "Welke uitvoering past bij welk gebruik?", "Which setup fits which use?"),
    comparisonRows: [
      {
        scenario: pick(locale, "Kleine tuin", "Small garden"),
        pick: pick(locale, "Compact accu of licht elektrisch", "Compact battery or light corded"),
        why: pick(locale, "Korte klussen, weinig opslag.", "Short jobs, little storage."),
      },
      {
        scenario: pick(locale, "Middel / gezin", "Mid / family"),
        pick: pick(locale, "Middenklasse + reserve-accu", "Mid-range + spare battery"),
        why: pick(locale, "Wekelijks zonder pro-kosten.", "Weekly without pro cost."),
      },
      {
        scenario: pick(locale, "Groot / intensief", "Large / intensive"),
        pick: pick(locale, "Pro of high-capacity", "Pro or high-capacity"),
        why: pick(locale, "Lange sessies en slijtage.", "Long sessions and wear."),
      },
      {
        scenario: pick(locale, "Budget", "Budget"),
        pick: pick(locale, "Basis elektrisch of lichte accu", "Basic corded or light battery"),
        why: pick(locale, "Incidenteel licht werk.", "Occasional light work."),
      },
    ],
  }
}

function defaultExtras(
  locale: StorefrontLocale,
  label: string
): ReturnType<typeof electronicsExtras> {
  return {
    topLists: [
      {
        id: "best",
        emoji: "🏆",
        title: pick(locale, "Beste keuze", "Best pick"),
        subtitle: pick(locale, "Hoogste totaalscore", "Highest overall score"),
        strategy: "best",
        filterIds: [],
        sort: "rating",
      },
      {
        id: "value",
        emoji: "💰",
        title: pick(locale, "Beste prijs-kwaliteit", "Best value"),
        subtitle: pick(locale, "Balans prijs & kwaliteit", "Balance of price & quality"),
        strategy: "value",
        filterIds: [],
        sort: "popularity",
      },
      {
        id: "premium",
        emoji: "⭐",
        title: pick(locale, "Beste premium", "Best premium"),
        subtitle: pick(locale, "Als je topkwaliteit nodig hebt", "When you need top quality"),
        strategy: "premium",
        filterIds: [],
        sort: "price-desc",
      },
      {
        id: "budget",
        emoji: "🎒",
        title: pick(locale, "Beste budget", "Best budget"),
        subtitle: pick(locale, "Slim zonder overspecs", "Smart without overspec"),
        strategy: "budget",
        filterIds: [],
        sort: "price-asc",
      },
      {
        id: "family",
        emoji: "👨‍👩‍👧",
        title: pick(locale, "Beste voor gezinnen", "Best for families"),
        subtitle: pick(locale, "Verified™ & betrouwbaar", "Verified™ & reliable"),
        strategy: "verified",
        filterIds: [],
        sort: "rating",
      },
      {
        id: "business",
        emoji: "🏢",
        title: pick(locale, "Beste zakelijk", "Best for business"),
        subtitle: pick(locale, "Stabiel voor intensief gebruik", "Stable for intensive use"),
        strategy: "rating",
        filterIds: [],
        sort: "rating",
      },
    ],
    buyingQuestions: [
      {
        id: "q_fit",
        question: pick(locale, `Welke ${label.toLowerCase()} past bij mij?`, `Which ${label.toLowerCase()} fits me?`),
        answer: pick(
          locale,
          "Beschrijf je situatie (wie, hoe vaak, waar). Kies het type dat die zin dekt — pas daarna specs en prijs.",
          "Describe your situation (who, how often, where). Pick the type that covers that sentence — then specs and price."
        ),
      },
      {
        id: "q_premium",
        question: pick(locale, "Wanneer loont premium?", "When is premium worth it?"),
        answer: pick(
          locale,
          "Als je extras wekelijks gebruikt of duurzaamheid/service cruciaal is. Anders is sterke middenklasse slimmer.",
          "If you’ll use extras weekly or durability/service is critical. Otherwise strong mid-range is smarter."
        ),
      },
      {
        id: "q_budget",
        question: pick(locale, "Wanneer is budget genoeg?", "When is budget enough?"),
        answer: pick(
          locale,
          "Bij licht of incidenteel gebruik. Zodra je wekelijks leunt op het product, betaal je goedkoop later terug.",
          "For light or occasional use. Once you rely on it weekly, cheap costs you later."
        ),
      },
      {
        id: "q_verified",
        question: pick(locale, "Waarom Verified™ checken?", "Why check Verified™?"),
        answer: pick(
          locale,
          "Verified™ helpt herkomst en claims betrouwbaarder te maken — naast garantie en retailer-service via de Buy Box.",
          "Verified™ helps make origin and claims more reliable — alongside warranty and retailer service via Buy Box."
        ),
      },
    ],
    attributesHeading: pick(locale, "Belangrijkste eigenschappen", "Key attributes"),
    attributes: [],
    whenNotHeading: pick(locale, "Koop dit NIET als…", "Don’t buy this if…"),
    whenNot: [
      pick(locale, "Je features koopt die je nooit aanzet.", "You buy features you’ll never enable."),
      pick(locale, "Je alleen op prijs kiest zonder garantie/Verified™.", "You choose on price alone without warranty/Verified™."),
      pick(locale, "Je premium koopt zonder intensief gebruik.", "You buy premium without intensive use."),
      pick(locale, "Je onderhoud niet wilt doen dat het model vereist.", "You won’t do the maintenance the model requires."),
    ],
    saveMoneyHeading: pick(locale, "Bespaar geld", "Save money"),
    saveMoney: [
      pick(locale, "Koop must-haves, skip nice-to-haves die stilstaan.", "Buy must-haves, skip idle nice-to-haves."),
      pick(locale, "Premium alleen bij wekelijks voordeel.", "Premium only with weekly benefit."),
      pick(locale, "Vergelijk totale Buy Box-deal, niet stickerprijs.", "Compare total Buy Box deal, not sticker price."),
      pick(locale, "Middenklasse is vaak de slimste totale keuze.", "Mid-range is often the smartest overall choice."),
    ],
    lifespanHeading: pick(locale, "Levensduur & onderhoud", "Lifespan & care"),
    lifespan: [
      {
        title: pick(locale, "Levensduur", "Lifespan"),
        body: pick(locale, "Juiste specs + onderhoud verlengen gebruiksjaren meer dan overspecs.", "Right specs + care extend years more than overspec."),
      },
      {
        title: pick(locale, "Garantie & service", "Warranty & service"),
        body: pick(locale, "Check Verified™, garantie en retailer-service in de Buy Box.", "Check Verified™, warranty and retailer service in the Buy Box."),
      },
      {
        title: pick(locale, "Onderhoud", "Maintenance"),
        body: pick(locale, "Reken schoonmaak/filters/onderdelen mee vóór je koopt.", "Factor cleaning/filters/parts before you buy."),
      },
      {
        title: pick(locale, "Duurzaamheid", "Sustainability"),
        body: pick(locale, "Niet te groot kopen is vaak duurzamer én goedkoper.", "Not buying too big is often greener and cheaper."),
      },
    ],
    comparisonHeading: pick(locale, "Welke uitvoering past bij welk gebruik?", "Which setup fits which use?"),
    comparisonRows: [
      {
        scenario: pick(locale, "Dagelijks", "Daily"),
        pick: pick(locale, "Middenklasse, eenvoudig", "Mid-range, simple"),
        why: pick(locale, "Betrouwbaarheid wint.", "Reliability wins."),
      },
      {
        scenario: pick(locale, "Intensief", "Intensive"),
        pick: pick(locale, "Robuust + service", "Robust + service"),
        why: pick(locale, "Frequent gebruik eist duurzaamheid.", "Frequent use needs durability."),
      },
      {
        scenario: pick(locale, "Budget", "Budget"),
        pick: pick(locale, "Must-haves only", "Must-haves only"),
        why: pick(locale, "Geen stilstaande extras.", "No idle extras."),
      },
      {
        scenario: pick(locale, "Premium", "Premium"),
        pick: pick(locale, "Alleen bij wekelijks voordeel", "Only with weekly benefit"),
        why: pick(locale, "Anders is middenklasse slimmer.", "Otherwise mid-range is smarter."),
      },
    ],
  }
}

const EXTRA_TIPS = (locale: StorefrontLocale) => [
  pick(locale, "Let op accessoires die je écht nodig hebt — niet de bundel-ruis.", "Mind accessories you truly need — not bundle noise."),
  pick(locale, "Check energieverbruik als je het product vaak lang gebruikt.", "Check energy use if you’ll run it often/long."),
  pick(locale, "Koop geen functies die je nooit aanzet.", "Don’t buy features you’ll never enable."),
  pick(locale, "Vergelijk totale deal: prijs + verzending + service.", "Compare total deal: price + shipping + service."),
]

const EXTRA_MISTAKES = (locale: StorefrontLocale) => [
  pick(locale, "Reviews negeren over echt dagelijks gebruik.", "Ignoring reviews about real daily use."),
  pick(locale, "Geen plan voor onderhoud of onderdelen.", "No plan for maintenance or parts."),
  pick(locale, "Te groot/te klein kopen zonder je situatie te meten.", "Buying too big/small without measuring your situation."),
  pick(locale, "Alleen naar één ‘hero-spec’ kijken.", "Looking at only one ‘hero spec’."),
]

/** Merge specialist base + interactive ultimate extras. */
export function getUltimateGuide(
  slug: string,
  label: string,
  locale: StorefrontLocale
): UltimateGuide {
  const base = getSpecialistGuide(slug, label, locale)
  const extras =
    base.family === "electronics"
      ? electronicsExtras(locale, label)
      : base.family === "garden"
        ? gardenExtras(locale)
        : defaultExtras(locale, label)

  const expertTips = [...base.expertTips]
  for (const tip of EXTRA_TIPS(locale)) {
    if (expertTips.length >= 10) break
    if (!expertTips.includes(tip)) expertTips.push(tip)
  }

  const mistakes = [...base.mistakes]
  for (const m of EXTRA_MISTAKES(locale)) {
    if (mistakes.length >= 8) break
    if (!mistakes.includes(m)) mistakes.push(m)
  }

  // Prefer interactive Q&A; keep FAQ aligned
  const faq = extras.buyingQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.answer,
  }))

  return {
    ...base,
    expertTips,
    mistakes,
    lookSteps:
      base.family === "electronics"
        ? [
            {
              title: pick(locale, "Gebruik", "Use"),
              body: pick(
                locale,
                "Waar gebruik je het voor?",
                "What will you use it for?"
              ),
            },
            {
              title: pick(locale, "Eigenschappen", "Attributes"),
              body: pick(
                locale,
                "Kies de 2–3 must-have eigenschappen.",
                "Pick the 2–3 must-have attributes."
              ),
            },
            {
              title: pick(locale, "Filters", "Filters"),
              body: pick(
                locale,
                "Pas filters of een toplijst toe.",
                "Apply filters or a top list."
              ),
            },
            {
              title: pick(locale, "Verified™", "Verified™"),
              body: pick(
                locale,
                "Controleer Verified™ en garantie.",
                "Check Verified™ and warranty."
              ),
            },
            {
              title: pick(locale, "Beste deal", "Best deal"),
              body: pick(
                locale,
                "Kies de beste totale Buy Box-deal.",
                "Choose the best total Buy Box deal."
              ),
            },
          ]
        : base.lookSteps,
    questions: extras.buyingQuestions.map((q) => q.question),
    faq,
    topListsHeading: pick(locale, "Toplijsten", "Top lists"),
    topLists: extras.topLists,
    buyingQuestions: extras.buyingQuestions,
    attributesHeading: extras.attributesHeading,
    attributes: extras.attributes,
    whenNotHeading: extras.whenNotHeading,
    whenNot: extras.whenNot,
    saveMoneyHeading: extras.saveMoneyHeading,
    saveMoney: extras.saveMoney,
    lifespanHeading: extras.lifespanHeading,
    lifespan: extras.lifespan,
    comparisonHeading: extras.comparisonHeading,
    comparisonRows: extras.comparisonRows,
    personaCta: pick(locale, "Toon Top 3", "Show Top 3"),
    top3Heading: pick(locale, "Top 3 aanbevolen", "Top 3 recommended"),
    applyFiltersLabel: pick(locale, "Filters toegepast", "Filters applied"),
    showProductsLabel: pick(locale, "Bekijk producten", "View products"),
  }
}

export function findAttributeKnowledge(
  guide: UltimateGuide,
  topic: string
): AttributeKnowledge | null {
  const key = topic.toLowerCase()
  return (
    guide.attributes.find(
      (a) => key.includes(a.match) || a.match.includes(key) || a.title.toLowerCase() === key
    ) ?? null
  )
}

export function personaStrategy(personaId: string): GuidePickStrategy {
  if (personaId === "budget" || personaId === "student") return "budget"
  if (personaId === "premium" || personaId === "pro") return "premium"
  if (personaId === "value") return "value"
  if (personaId === "family") return "verified"
  return "best"
}
