/**
 * Presentation-only specialist copy for category buying guides.
 * Does not change AI generation, CMS schema, or APIs — curates what shoppers see.
 */

import type { StorefrontLocale } from "../i18n/locales"

export type BuyingPersona = {
  id: string
  title: string
  recommended: string
  why: string
  watch: string
}

export type SpecialistGuide = {
  family: string
  questionsHeading: string
  questions: string[]
  personasHeading: string
  personas: BuyingPersona[]
  expertHeading: string
  expertTips: string[]
  mistakesHeading: string
  mistakes: string[]
  lookHeading: string
  lookSteps: { title: string; body: string }[]
  checklistHeading: string
  checklist: string[]
  topicBlurbs: Record<string, string>
  faq: { id: string; question: string; answer: string }[]
  relatedHeading: string
}

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

function electronics(locale: StorefrontLocale, label: string): SpecialistGuide {
  return {
    family: "electronics",
    questionsHeading: pick(
      locale,
      "Echte koopvragen",
      "Real buying questions"
    ),
    questions: [
      pick(locale, `Welke ${label.toLowerCase()} past bij mijn gebruik?`, `Which ${label.toLowerCase()} fits my use?`),
      pick(locale, "Hoeveel geheugen heb ik echt nodig?", "How much memory do I actually need?"),
      pick(locale, "Wanneer is batterijduur belangrijker dan raw power?", "When does battery matter more than raw power?"),
      pick(locale, "Wanneer heb ik juist géén dure uitvoering nodig?", "When do I not need the expensive option?"),
    ],
    personasHeading: pick(
      locale,
      "Welk product past bij mij?",
      "Which product fits me?"
    ),
    personas: [
      {
        id: "daily",
        title: pick(locale, "Voor dagelijks gebruik", "For daily use"),
        recommended: pick(
          locale,
          "Gebalanceerd model: voldoende snelheid, 16 GB geheugen, goede batterij.",
          "Balanced model: enough speed, 16 GB memory, solid battery."
        ),
        why: pick(
          locale,
          "Je wilt betrouwbaar werken, streamen en browsen zonder overspecs te betalen.",
          "You want reliable work, streaming and browsing without overpaying for overspec."
        ),
        watch: pick(
          locale,
          "Let op schermkwaliteit en toetsenbordcomfort als je er uren op zit.",
          "Watch screen quality and keyboard comfort if you sit on it for hours."
        ),
      },
      {
        id: "student",
        title: pick(locale, "Voor studenten", "For students"),
        recommended: pick(
          locale,
          "Licht model met sterke batterij en USB-C laden.",
          "Light model with strong battery and USB-C charging."
        ),
        why: pick(
          locale,
          "Je sleept het mee naar college en werkt in bibliotheken.",
          "You carry it to campus and work in libraries."
        ),
        watch: pick(
          locale,
          "Kies niet blind voor meer cores — gewicht en batterij winnen vaker.",
          "Don’t chase cores blindly — weight and battery win more often."
        ),
      },
      {
        id: "family",
        title: pick(locale, "Voor gezinnen", "For families"),
        recommended: pick(
          locale,
          "Robuuste middenklasse met voldoende opslag en eenvoudige updates.",
          "Robust mid-range with enough storage and simple updates."
        ),
        why: pick(
          locale,
          "Meerdere gebruikers, huiswerk, streaming en lange levensduur.",
          "Multiple users, homework, streaming and long lifespan."
        ),
        watch: pick(
          locale,
          "Controleer Verified™ en garantie — service telt bij gedeeld gebruik.",
          "Check Verified™ and warranty — service matters with shared use."
        ),
      },
      {
        id: "pro",
        title: pick(locale, "Voor professioneel / intensief gebruik", "For professional / intensive use"),
        recommended: pick(
          locale,
          "Krachtige processor, 32 GB+ geheugen, goed koelgedrag.",
          "Powerful CPU, 32 GB+ memory, solid thermals."
        ),
        why: pick(
          locale,
          "Video, design of zware multitasking mag niet vastlopen.",
          "Video, design or heavy multitasking must not stall."
        ),
        watch: pick(
          locale,
          "Koop alleen premium als je de power wekelijks gebruikt — anders verspil je budget.",
          "Buy premium only if you use the power weekly — otherwise you waste budget."
        ),
      },
      {
        id: "budget",
        title: pick(locale, "Voor klein budget", "On a tight budget"),
        recommended: pick(
          locale,
          "Instapmodel met 8–16 GB geheugen; bespaar op merknaam, niet op opslag.",
          "Entry model with 8–16 GB memory; save on brand, not on storage."
        ),
        why: pick(
          locale,
          "Basiswerk moet soepel blijven zonder onnodige features.",
          "Basics must stay smooth without unnecessary features."
        ),
        watch: pick(
          locale,
          "Vermijd de allerlaagste prijs als batterij of opslag duidelijk tekortschiet.",
          "Avoid the absolute lowest price if battery or storage is clearly weak."
        ),
      },
      {
        id: "value",
        title: pick(locale, "Beste prijs-kwaliteit", "Best value"),
        recommended: pick(
          locale,
          "Middenklasse met goede reviews, Verified™ en sterke Buy Box-deal.",
          "Mid-range with solid reviews, Verified™ and a strong Buy Box deal."
        ),
        why: pick(
          locale,
          "Hier zit meestal de sweet spot tussen prestatie, batterij en prijs.",
          "This is usually the sweet spot of performance, battery and price."
        ),
        watch: pick(
          locale,
          "Vergelijk totale deal (prijs + verzending + service), niet alleen de stickerprijs.",
          "Compare total deal (price + shipping + service), not sticker price alone."
        ),
      },
    ],
    expertHeading: pick(locale, "Expertadvies", "Expert advice"),
    expertTips: [
      pick(locale, "Bepaal eerst waarvoor je het gebruikt — pas daarna specs.", "Decide use-case first — then compare specs."),
      pick(locale, "Vergelijk geheugen en batterij vóór je naar merk of design kijkt.", "Compare memory and battery before brand or design."),
      pick(locale, "Controleer altijd Verified™ en productieland.", "Always check Verified™ and production country."),
      pick(locale, "Kijk naar de Buy Box-deal, niet alleen de laagste prijs.", "Look at the Buy Box deal, not only the lowest price."),
      pick(locale, "USB-C en oplaadgemak zijn vaker doorslaggevend dan een snellere CPU.", "USB-C and charging convenience often beat a faster CPU."),
      pick(locale, "Koop geen premium ‘voor later’ als je dat gebruik nu niet hebt.", "Don’t buy premium ‘for later’ if you don’t need it now."),
    ],
    mistakesHeading: pick(locale, "Veelgemaakte fouten", "Common mistakes"),
    mistakes: [
      pick(locale, "Meer geheugen of cores kopen dan je werkelijk gebruikt.", "Buying more memory or cores than you actually use."),
      pick(locale, "Alleen op prijs sorteren en de Buy Box negeren.", "Sorting by price only and ignoring the Buy Box."),
      pick(locale, "Processor belangrijker maken dan batterij, gewicht of schermcomfort.", "Treating CPU as more important than battery, weight or screen comfort."),
      pick(locale, "Verified™ en garantie overslaan om een paar euro te sparen.", "Skipping Verified™ and warranty to save a few euros."),
    ],
    lookHeading: pick(locale, "Waar moet je op letten?", "What should you check?"),
    lookSteps: [
      {
        title: pick(locale, "1. Gebruik", "1. Use case"),
        body: pick(locale, "Studie, kantoor, creatief of onderweg?", "Study, office, creative or on the go?"),
      },
      {
        title: pick(locale, "2. Essentials", "2. Essentials"),
        body: pick(locale, "Geheugen, opslag, batterij — dit bepaalt of het soepel blijft.", "Memory, storage, battery — this decides if it stays smooth."),
      },
      {
        title: pick(locale, "3. Comfort", "3. Comfort"),
        body: pick(locale, "Scherm, gewicht en aansluitingen voor jouw dagelijks ritme.", "Screen, weight and ports for your daily rhythm."),
      },
      {
        title: pick(locale, "4. Deal & vertrouwen", "4. Deal & trust"),
        body: pick(locale, "Buy Box, Verified™, garantie en retailer-service.", "Buy Box, Verified™, warranty and retailer service."),
      },
    ],
    checklistHeading: pick(locale, "Checklist vóór je koopt", "Checklist before you buy"),
    checklist: [
      pick(locale, "Gebruikssituatie helder", "Use case clear"),
      pick(locale, "Geheugen & opslag passend", "Memory & storage fit"),
      pick(locale, "Batterij gecontroleerd", "Battery checked"),
      pick(locale, "Verified™ + garantie ok", "Verified™ + warranty ok"),
      pick(locale, "Buy Box-deal vergeleken", "Buy Box deal compared"),
    ],
    topicBlurbs: {
      processor: pick(locale, "Bepaalt snelheid bij intensief werk — overkill voor mail en browse.", "Sets speed for intensive work — overkill for mail and browsing."),
      geheugen: pick(locale, "Meer geheugen = soepeler multitasken; 16 GB is vaak genoeg.", "More memory = smoother multitasking; 16 GB is often enough."),
      scherm: pick(locale, "Belangrijk bij lang werken; kies helderheid en formaat naar gebruik.", "Matters for long sessions; pick brightness and size for your use."),
      batterij: pick(locale, "Kritisch als je vaak onderweg bent of weinig stopcontacten hebt.", "Critical if you’re often on the go or short on outlets."),
      gewicht: pick(locale, "Telt als je het dagelijks meeneemt — lichter wint sneller dan sneller.", "Matters if you carry it daily — lighter often beats faster."),
      draadloos: pick(locale, "Handig voor accessoires; zelden de hoofdreden om te kiezen.", "Handy for accessories; rarely the main reason to choose."),
      bluetooth: pick(locale, "Handig voor accessoires; zelden de hoofdreden om te kiezen.", "Handy for accessories; rarely the main reason to choose."),
      "usb-c": pick(locale, "Belangrijk voor laden en docking — check of één kabel genoeg is.", "Important for charging and docking — check if one cable is enough."),
    },
    faq: [
      {
        id: "faq_use",
        question: pick(locale, "Welke laptop past bij mij?", "Which laptop fits me?"),
        answer: pick(
          locale,
          "Start bij je gebruik: student of onderweg → licht + batterij; kantoor → scherm en toetsenbord; creatief → processor + geheugen. Koop pas specs nadat je situaties hebt vastgelegd.",
          "Start with use: student or travel → light + battery; office → screen and keyboard; creative → CPU + memory. Only then compare specs."
        ),
      },
      {
        id: "faq_ram",
        question: pick(locale, "Hoeveel geheugen heb ik nodig?", "How much memory do I need?"),
        answer: pick(
          locale,
          "8 GB volstaat voor licht gebruik. 16 GB is de sweet spot voor de meeste mensen. 32 GB+ alleen als je zwaar multitaskt of professioneel bewerkt.",
          "8 GB is fine for light use. 16 GB is the sweet spot for most people. 32 GB+ only for heavy multitasking or pro editing."
        ),
      },
      {
        id: "faq_battery",
        question: pick(locale, "Wanneer is batterijduur echt belangrijk?", "When does battery life really matter?"),
        answer: pick(
          locale,
          "Als je het product meeneemt, weinig laadtijd hebt of geen dockingstation gebruikt. Thuis aan de stekker mag batterij minder zwaar wegen.",
          "If you carry it, have little charge time, or don’t use a dock. At a desk on power, battery can weigh less."
        ),
      },
      {
        id: "faq_cheap",
        question: pick(locale, "Wanneer heb ik geen dure uitvoering nodig?", "When don’t I need an expensive model?"),
        answer: pick(
          locale,
          "Als je vooral browsen, Office, video’s en lichte apps doet. Betaal dan voor comfort en betrouwbaarheid — niet voor topsnelheid die je niet gebruikt.",
          "If you mainly browse, use Office, watch video and light apps. Pay for comfort and reliability — not unused top speed."
        ),
      },
    ],
    relatedHeading: pick(locale, "Gerelateerde categorieën", "Related categories"),
  }
}

function garden(locale: StorefrontLocale, label: string): SpecialistGuide {
  return {
    family: "garden",
    questionsHeading: pick(locale, "Echte koopvragen", "Real buying questions"),
    questions: [
      pick(locale, "Accu of elektrisch (snoer)?", "Battery or corded electric?"),
      pick(locale, "Welke kracht heb ik nodig voor mijn tuin?", "How much power do I need for my garden?"),
      pick(locale, "Wanneer kies ik professioneel?", "When should I choose professional grade?"),
      pick(locale, "Wanneer is een goedkoop model genoeg?", "When is a cheap model enough?"),
    ],
    personasHeading: pick(locale, "Welk product past bij mij?", "Which product fits me?"),
    personas: [
      {
        id: "small",
        title: pick(locale, "Kleine tuin / incidenteel", "Small garden / occasional"),
        recommended: pick(locale, "Compact accu-model of licht elektrisch.", "Compact battery or light corded."),
        why: pick(locale, "Korte klussen, weinig opslagruimte, eenvoudig onderhoud.", "Short jobs, little storage, simple care."),
        watch: pick(locale, "Check maaibreedte/oppervlakte en laadtijd van de accu.", "Check cutting width/area and battery charge time."),
      },
      {
        id: "family",
        title: pick(locale, "Gezin met middelgrote tuin", "Family, mid-size garden"),
        recommended: pick(locale, "Robuuste middenklasse met reserve-accu of stevige kabelvrijheid.", "Solid mid-range with spare battery or good cordless runtime."),
        why: pick(locale, "Wekelijks gebruik, verschillende taken, betrouwbaarheid.", "Weekly use, varied tasks, reliability."),
        watch: pick(locale, "Vermijd te licht speelgoed-niveau én te zware pro-machines.", "Avoid toy-grade and overly heavy pro machines."),
      },
      {
        id: "pro",
        title: pick(locale, "Intensief / professioneel", "Intensive / professional"),
        recommended: pick(locale, "Pro-lijn: vermogen, slijtdelen en servicebaar ontwerp.", "Pro line: power, wear parts and serviceable design."),
        why: pick(locale, "Lange sessies en zware belasting vragen echte kracht.", "Long sessions and heavy load need real power."),
        watch: pick(locale, "Reken onderhoud, gewicht en geluid mee — niet alleen pk’s.", "Factor maintenance, weight and noise — not just power."),
      },
      {
        id: "budget",
        title: pick(locale, "Klein budget", "Tight budget"),
        recommended: pick(locale, "Eenvoudig elektrisch of basis-accu voor lichte taken.", "Simple corded or basic battery for light tasks."),
        why: pick(locale, "Je gebruikt het een paar keer per seizoen.", "You use it a few times per season."),
        watch: pick(locale, "Goedkoop is oké bij licht werk — niet bij grote gazons of heggen.", "Cheap is fine for light work — not large lawns or hedges."),
      },
      {
        id: "value",
        title: pick(locale, "Beste prijs-kwaliteit", "Best value"),
        recommended: pick(locale, "Sterke middenklasse met Verified™ en goede onderdelenbeschikbaarheid.", "Strong mid-range with Verified™ and parts availability."),
        why: pick(locale, "Lange levensduur wint van een eenmalige lage prijs.", "Lifespan beats a one-time low price."),
        watch: pick(locale, "Vergelijk accu-platformen: één systeem voor meerdere tools spaart geld.", "Compare battery platforms: one system for multiple tools saves money."),
      },
      {
        id: "premium",
        title: pick(locale, "Premium keuze", "Premium choice"),
        recommended: pick(locale, "Topmodel wanneer comfort, stilte of pro-resultaat telt.", "Top model when comfort, quiet or pro finish matters."),
        why: pick(locale, "Je werkt er vaak mee of stelt hoge eisen aan resultaat.", "You use it often or demand a high finish."),
        watch: pick(locale, "Premium loont alleen als je de extra’s écht gebruikt.", "Premium pays off only if you actually use the extras."),
      },
    ],
    expertHeading: pick(locale, "Expertadvies", "Expert advice"),
    expertTips: [
      pick(locale, "Kies eerst oppervlakte en taak — daarna accu of snoer.", "Pick area and task first — then battery or cord."),
      pick(locale, "Accu-platformen delen bespaart meer dan één ‘sterke’ machine.", "Shared battery platforms save more than one ‘strong’ machine."),
      pick(locale, "Controleer Verified™, garantie en beschikbaarheid van slijtdelen.", "Check Verified™, warranty and wear-part availability."),
      pick(locale, "Gewicht en trilling bepalen of je het een uur volhoudt.", "Weight and vibration decide if you last an hour."),
      pick(locale, "Professioneel kopen zonder pro-gebruik is geld weggooien.", "Buying pro without pro use wastes money."),
    ],
    mistakesHeading: pick(locale, "Veelgemaakte fouten", "Common mistakes"),
    mistakes: [
      pick(locale, "Te zwaar of te krachtig kopen voor een kleine tuin.", "Buying too heavy or powerful for a small garden."),
      pick(locale, "Alleen naar vermogen kijken en onderhoud vergeten.", "Looking only at power and forgetting maintenance."),
      pick(locale, "Accu zonder reserve kiezen terwijl je lange sessies plant.", "Choosing a battery with no spare while planning long sessions."),
      pick(locale, "Goedkoopste model voor intensief wekelijks gebruik.", "Cheapest model for intensive weekly use."),
    ],
    lookHeading: pick(locale, "Waar moet je op letten?", "What should you check?"),
    lookSteps: [
      {
        title: pick(locale, "1. Oppervlakte & taak", "1. Area & task"),
        body: pick(locale, `Past de machine bij jouw ${label.toLowerCase()}-klus?`, `Does the machine match your ${label.toLowerCase()} job?`),
      },
      {
        title: pick(locale, "2. Energie", "2. Power source"),
        body: pick(locale, "Accu-vrijheid vs. constante kracht met snoer.", "Battery freedom vs constant corded power."),
      },
      {
        title: pick(locale, "3. Comfort", "3. Comfort"),
        body: pick(locale, "Gewicht, geluid, trilling, opbergmaat.", "Weight, noise, vibration, storage size."),
      },
      {
        title: pick(locale, "4. Vertrouwen", "4. Trust"),
        body: pick(locale, "Verified™, garantie, onderdelen, Buy Box-deal.", "Verified™, warranty, parts, Buy Box deal."),
      },
    ],
    checklistHeading: pick(locale, "Checklist vóór je koopt", "Checklist before you buy"),
    checklist: [
      pick(locale, "Oppervlakte/taak bepaald", "Area/task defined"),
      pick(locale, "Accu of snoer gekozen", "Battery or cord chosen"),
      pick(locale, "Gewicht oké voor jou", "Weight ok for you"),
      pick(locale, "Verified™ + garantie", "Verified™ + warranty"),
      pick(locale, "Deal vergeleken", "Deal compared"),
    ],
    topicBlurbs: {
      accu: pick(locale, "Vrijheid zonder snoer — check runtime en laadtijd.", "Freedom without a cord — check runtime and charge time."),
      elektrisch: pick(locale, "Constante kracht; handig bij langere sessies dicht bij stroom.", "Constant power; great for longer sessions near an outlet."),
      maaibreedte: pick(locale, "Bepaalt hoe snel je klaar bent op grotere oppervlakken.", "Determines how fast you finish larger areas."),
      oppervlakte: pick(locale, "Kies capaciteit naar je echte tuinoppervlak, niet naar marketing.", "Match capacity to real garden size, not marketing."),
      energieklasse: pick(locale, "Lager verbruik spaart op lange sessies — relevant bij vast gebruik.", "Lower use saves on long sessions — relevant for frequent use."),
      gewicht: pick(locale, "Zwaarder = sneller vermoeid; test of je het comfortabel tilt.", "Heavier = tire faster; check if you can lift it comfortably."),
    },
    faq: [
      {
        id: "faq_battery",
        question: pick(locale, "Accu of elektrisch?", "Battery or electric?"),
        answer: pick(
          locale,
          "Accu als je vrij wilt bewegen en korte tot middelgrote klussen doet. Elektrisch (snoer) als je lange sessies doet en altijd stroom in de buurt hebt.",
          "Battery if you want freedom on short to mid jobs. Corded if you do long sessions and always have power nearby."
        ),
      },
      {
        id: "faq_power",
        question: pick(locale, "Welke kracht heb ik nodig?", "How much power do I need?"),
        answer: pick(
          locale,
          "Baseer op oppervlakte en vegetatie. Te veel kracht maakt zwaar en duur; te weinig maakt het werk frustrerend. Middenklasse dekt de meeste tuinen.",
          "Base it on area and vegetation. Too much power is heavy and costly; too little is frustrating. Mid-range covers most gardens."
        ),
      },
      {
        id: "faq_pro",
        question: pick(locale, "Wanneer kies ik professioneel?", "When should I choose professional?"),
        answer: pick(
          locale,
          "Bij dagelijks of zwaar gebruik, lange sessies of als slijtdelen en service cruciaal zijn. Voor een gemiddelde gezinstuin is pro meestal overkill.",
          "For daily/heavy use, long sessions, or when parts and service are critical. For a typical family garden, pro is usually overkill."
        ),
      },
      {
        id: "faq_cheap",
        question: pick(locale, "Wanneer is goedkoop genoeg?", "When is cheap enough?"),
        answer: pick(
          locale,
          "Bij lichte, incidentele klussen. Zodra je wekelijks werkt of een groot oppervlak hebt, betaal je goedkoop later terug in tijd en vervanging.",
          "For light, occasional jobs. Once you work weekly or have a large area, cheap costs you later in time and replacements."
        ),
      },
    ],
    relatedHeading: pick(locale, "Gerelateerde categorieën", "Related categories"),
  }
}

function fashion(locale: StorefrontLocale, label: string): SpecialistGuide {
  return {
    family: "fashion",
    questionsHeading: pick(locale, "Echte koopvragen", "Real buying questions"),
    questions: [
      pick(
        locale,
        `Welke ${label.toLowerCase()} past bij mijn lichaam en gebruik?`,
        `Which ${label.toLowerCase()} fits my body and use?`
      ),
      pick(locale, "Welk materiaal past bij seizoen en onderhoud?", "Which material fits season and care?"),
      pick(locale, "Wanneer koop ik premium stof?", "When should I buy premium fabric?"),
      pick(locale, "Hoe voorkom ik verkeerde maat?", "How do I avoid the wrong size?"),
    ],
    personasHeading: pick(locale, "Welk product past bij mij?", "Which product fits me?"),
    personas: [
      {
        id: "daily",
        title: pick(locale, "Voor dagelijks dragen", "For everyday wear"),
        recommended: pick(locale, "Comfortabele pasvorm, ademend materiaal, makkelijk onderhoud.", "Comfortable fit, breathable fabric, easy care."),
        why: pick(locale, "Je wilt er vaak in staan zonder gedoe.", "You want to wear it often without fuss."),
        watch: pick(locale, "Check wasvoorschrift en echte productiemaat.", "Check wash care and true production sizing."),
      },
      {
        id: "work",
        title: pick(locale, "Voor werk / kantoor", "For work / office"),
        recommended: pick(locale, "Nette snit, kreukarme stof, all-day comfort.", "Clean cut, wrinkle-resistant fabric, all-day comfort."),
        why: pick(locale, "Uiterlijk en comfort moeten de hele dag meegaan.", "Look and comfort must last all day."),
        watch: pick(locale, "Kies geen showpiece-stof die je niet onderhoudt.", "Don’t pick showpiece fabric you won’t maintain."),
      },
      {
        id: "budget",
        title: pick(locale, "Klein budget", "Tight budget"),
        recommended: pick(locale, "Basisstukken in neutrale kleuren, goede pasvorm boven logo.", "Basics in neutrals; fit over logo."),
        why: pick(locale, "Herhaalbare looks zonder snelle slijtage-impuls.", "Repeatable looks without fast-wear impulse."),
        watch: pick(locale, "Te goedkoop in pasvorm is duurder dan één goed basisstuk.", "Too-cheap fit costs more than one solid basic."),
      },
      {
        id: "premium",
        title: pick(locale, "Premium keuze", "Premium choice"),
        recommended: pick(locale, "Sterke materialen, afwerking en Europese productie.", "Strong materials, finish and European production."),
        why: pick(locale, "Je draagt het vaak en wil langere levensduur.", "You wear it often and want longer life."),
        watch: pick(locale, "Premium loont bij gebruiksfrequentie — niet bij eenmalige outfits.", "Premium pays with frequent use — not one-off outfits."),
      },
      {
        id: "family",
        title: pick(locale, "Voor gezinnen", "For families"),
        recommended: pick(locale, "Slijtvast, wasbaar, ruime maattabel.", "Durable, washable, clear size chart."),
        why: pick(locale, "Kinderspel en wasbeurten eisen robuustheid.", "Play and washing demand robustness."),
        watch: pick(locale, "Controleer Verified™ en retourbeleid bij maatkeuze.", "Check Verified™ and returns when sizing."),
      },
      {
        id: "value",
        title: pick(locale, "Beste prijs-kwaliteit", "Best value"),
        recommended: pick(locale, "Goede stof + pasvorm + eerlijke prijs via Buy Box.", "Good fabric + fit + fair Buy Box price."),
        why: pick(locale, "Hier zit meestal de balans tussen comfort en kosten.", "This is usually the comfort/cost balance."),
        watch: pick(locale, "Vergelijk materiaal en reviews, niet alleen korting.", "Compare material and reviews, not only discounts."),
      },
    ],
    expertHeading: pick(locale, "Expertadvies", "Expert advice"),
    expertTips: [
      pick(locale, "Pasvorm eerst, daarna kleur en merk.", "Fit first, then colour and brand."),
      pick(locale, "Lees materiaalsamenstelling — dat bepaalt comfort en onderhoud.", "Read fabric composition — it drives comfort and care."),
      pick(locale, "Check maattabel van de producent, niet alleen het label ‘M’.", "Check the producer size chart, not just an ‘M’ label."),
      pick(locale, "Verified™ helpt bij betrouwbare herkomst en claims.", "Verified™ helps with reliable origin and claims."),
      pick(locale, "Koop premium alleen als je het stuk vaak draagt.", "Buy premium only if you’ll wear it often."),
    ],
    mistakesHeading: pick(locale, "Veelgemaakte fouten", "Common mistakes"),
    mistakes: [
      pick(locale, "Alleen op prijs of merk kiezen zonder pasvorm te checken.", "Choosing on price or brand only without checking fit."),
      pick(locale, "Verkeerde stof voor seizoen of onderhoud.", "Wrong fabric for season or care."),
      pick(locale, "Maattabel negeren en blind bestellen.", "Ignoring the size chart and ordering blindly."),
      pick(locale, "Te veel trendy stukken, te weinig goede basics.", "Too many trendy pieces, too few solid basics."),
    ],
    lookHeading: pick(locale, "Waar moet je op letten?", "What should you check?"),
    lookSteps: [
      {
        title: pick(locale, "1. Gebruik", "1. Use"),
        body: pick(locale, "Dagelijks, werk, sport of gelegenheid?", "Daily, work, sport or occasion?"),
      },
      {
        title: pick(locale, "2. Pasvorm & maat", "2. Fit & size"),
        body: pick(locale, "Maattabel + reviews over uitvalmaat.", "Size chart + reviews on true-to-size."),
      },
      {
        title: pick(locale, "3. Materiaal", "3. Material"),
        body: pick(locale, "Comfort, seizoen, wasgedrag.", "Comfort, season, wash behaviour."),
      },
      {
        title: pick(locale, "4. Vertrouwen", "4. Trust"),
        body: pick(locale, "Verified™, herkomst, Buy Box-deal.", "Verified™, origin, Buy Box deal."),
      },
    ],
    checklistHeading: pick(locale, "Checklist vóór je koopt", "Checklist before you buy"),
    checklist: [
      pick(locale, "Gebruik helder", "Use clear"),
      pick(locale, "Maat gecontroleerd", "Size checked"),
      pick(locale, "Materiaal oké", "Material ok"),
      pick(locale, "Verified™ gecheckt", "Verified™ checked"),
      pick(locale, "Deal vergeleken", "Deal compared"),
    ],
    topicBlurbs: {
      materiaal: pick(locale, "Bepaalt comfort, ademend vermogen en onderhoud.", "Drives comfort, breathability and care."),
      pasvorm: pick(locale, "Belangrijker dan merk — check snit en maattabel.", "More important than brand — check cut and size chart."),
      maat: pick(locale, "Verschilt per producent; vertrouw de centimeters.", "Varies by producer; trust the centimetres."),
      kleur: pick(locale, "Kies kleuren die je combineert — niet alleen wat opvalt.", "Pick colours you’ll combine — not only what pops."),
    },
    faq: [
      {
        id: "faq_fit",
        question: pick(locale, "Hoe kies ik de juiste pasvorm?", "How do I choose the right fit?"),
        answer: pick(
          locale,
          "Gebruik de maattabel van de producent en lees of het model small/large uitvalt. Pasvorm bepaalt comfort meer dan het merk.",
          "Use the producer size chart and check if the model runs small/large. Fit drives comfort more than brand."
        ),
      },
      {
        id: "faq_material",
        question: pick(locale, "Welk materiaal moet ik kiezen?", "Which material should I choose?"),
        answer: pick(
          locale,
          "Dagelijks: ademend en wasbaar. Werk: kreukarm. Premium: duurzame stof die je vaak draagt. Koop nooit stof die je niet wilt onderhouden.",
          "Daily: breathable and washable. Work: wrinkle-resistant. Premium: durable fabric you’ll wear often. Never buy fabric you won’t care for."
        ),
      },
      {
        id: "faq_premium",
        question: pick(locale, "Wanneer loont premium?", "When is premium worth it?"),
        answer: pick(
          locale,
          "Als je het stuk wekelijks draagt en afwerking/levensduur telt. Voor eenmalige looks is middenklasse meestal slimmer.",
          "If you’ll wear it weekly and finish/lifespan matter. For one-off looks, mid-range is usually smarter."
        ),
      },
      {
        id: "faq_size",
        question: pick(locale, "Hoe voorkom ik een verkeerde maat?", "How do I avoid the wrong size?"),
        answer: pick(
          locale,
          "Meet jezelf, vergelijk met de cm-tabel, en check retourvoorwaarden. ‘M’ verschilt per merk — centimeters niet.",
          "Measure yourself, compare to the cm chart, and check returns. ‘M’ varies by brand — centimetres don’t."
        ),
      },
    ],
    relatedHeading: pick(locale, "Gerelateerde categorieën", "Related categories"),
  }
}

function home(locale: StorefrontLocale, label: string): SpecialistGuide {
  return {
    family: "home",
    questionsHeading: pick(locale, "Echte koopvragen", "Real buying questions"),
    questions: [
      pick(locale, `Welke ${label.toLowerCase()} past bij mijn woning?`, `Which ${label.toLowerCase()} fits my home?`),
      pick(locale, "Hoeveel onderhoud past bij mijn ritme?", "How much maintenance fits my routine?"),
      pick(locale, "Wanneer heb ik extra functies echt nodig?", "When do I really need extra features?"),
      pick(locale, "Wanneer is een eenvoudiger model beter?", "When is a simpler model better?"),
    ],
    personasHeading: pick(locale, "Welk product past bij mij?", "Which product fits me?"),
    personas: [
      {
        id: "daily",
        title: pick(locale, "Voor dagelijks gebruik", "For daily use"),
        recommended: pick(locale, "Betrouwbare middenklasse met eenvoudige bediening.", "Reliable mid-range with simple controls."),
        why: pick(locale, "Je wilt resultaat zonder leerproces.", "You want results without a learning curve."),
        watch: pick(locale, "Vermijd feature-lijsten die je nooit aanzet.", "Avoid feature lists you’ll never switch on."),
      },
      {
        id: "pets",
        title: pick(locale, "Voor huisdieren / intensief", "For pets / intensive"),
        recommended: pick(locale, "Sterke kernprestatie, makkelijk te legen/reinigen.", "Strong core performance, easy to empty/clean."),
        why: pick(locale, "Haar, stof en frequent gebruik eisen robuustheid.", "Hair, dust and frequent use need robustness."),
        watch: pick(locale, "Onderhoudstijd meerekenen — anders blijft het staan.", "Factor cleaning time — or it stays unused."),
      },
      {
        id: "large",
        title: pick(locale, "Voor grote woningen", "For large homes"),
        recommended: pick(locale, "Hogere capaciteit, langere runtime, minder bijvullen.", "Higher capacity, longer runtime, less emptying."),
        why: pick(locale, "Oppervlakte bepaalt of je tussendoor moet stoppen.", "Floor area decides if you stop mid-job."),
        watch: pick(locale, "Te klein model op groot oppervlak kost meer tijd dan je denkt.", "Too-small model on large floors costs more time than you think."),
      },
      {
        id: "budget",
        title: pick(locale, "Klein budget", "Tight budget"),
        recommended: pick(locale, "Eenvoudig model dat de hoofdfunctie goed doet.", "Simple model that does the main job well."),
        why: pick(locale, "Extra standen zijn leuk, kernresultaat telt.", "Extra modes are nice; core result counts."),
        watch: pick(locale, "Goedkoop zonder filterservice of onderdelen is duurkoop.", "Cheap without filter service or parts is costly."),
      },
      {
        id: "value",
        title: pick(locale, "Beste prijs-kwaliteit", "Best value"),
        recommended: pick(locale, "Goede reviews, Verified™, sterke Buy Box.", "Solid reviews, Verified™, strong Buy Box."),
        why: pick(locale, "Hier zit meestal de balans tussen resultaat en kosten.", "This usually balances result and cost."),
        watch: pick(locale, "Vergelijk totale deal en onderhoud, niet alleen de prijs.", "Compare total deal and upkeep, not price alone."),
      },
      {
        id: "premium",
        title: pick(locale, "Premium keuze", "Premium choice"),
        recommended: pick(locale, "Automatisering of comfortfeatures die je wekelijks gebruikt.", "Automation or comfort features you’ll use weekly."),
        why: pick(locale, "Tijdswinst of resultaat moet aantoonbaar zijn.", "Time saved or result must be tangible."),
        watch: pick(locale, "Koop geen leegstation/extra’s ‘voor later’ zonder behoefte.", "Don’t buy empty stations/extras ‘for later’ without need."),
      },
    ],
    expertHeading: pick(locale, "Expertadvies", "Expert advice"),
    expertTips: [
      pick(locale, "Start bij woningtype en vloer — pas daarna features.", "Start with home type and floors — then features."),
      pick(locale, "Onderhoud bepaalt of je het blijft gebruiken.", "Maintenance decides whether you’ll keep using it."),
      pick(locale, "Controleer Verified™, filters/onderdelen en garantie.", "Check Verified™, filters/parts and warranty."),
      pick(locale, "Extra functies alleen kopen als je ze wekelijks nodig hebt.", "Buy extras only if you’ll need them weekly."),
      pick(locale, "Vergelijk Buy Box-deals inclusief service.", "Compare Buy Box deals including service."),
    ],
    mistakesHeading: pick(locale, "Veelgemaakte fouten", "Common mistakes"),
    mistakes: [
      pick(locale, "Alleen naar één specificatie kijken (bijv. zuigkracht).", "Looking at only one spec (e.g. suction)."),
      pick(locale, "Onderhoud en filters onderschatten.", "Underestimating maintenance and filters."),
      pick(locale, "Te veel functies kopen die je nooit aanzet.", "Buying too many features you’ll never enable."),
      pick(locale, "Model kiezen dat niet bij vloer of woninggrootte past.", "Choosing a model that doesn’t match floors or home size."),
    ],
    lookHeading: pick(locale, "Waar moet je op letten?", "What should you check?"),
    lookSteps: [
      {
        title: pick(locale, "1. Woning & vloer", "1. Home & floors"),
        body: pick(locale, "Tapijt, hard, drempels, oppervlakte.", "Carpet, hard floors, thresholds, area."),
      },
      {
        title: pick(locale, "2. Gebruiksfrequentie", "2. Frequency"),
        body: pick(locale, "Dagelijks, wekelijks of incidenteel?", "Daily, weekly or occasional?"),
      },
      {
        title: pick(locale, "3. Onderhoud", "3. Maintenance"),
        body: pick(locale, "Legen, filters, dweilen, onderdelen.", "Emptying, filters, mopping, parts."),
      },
      {
        title: pick(locale, "4. Deal", "4. Deal"),
        body: pick(locale, "Buy Box, Verified™, garantie.", "Buy Box, Verified™, warranty."),
      },
    ],
    checklistHeading: pick(locale, "Checklist vóór je koopt", "Checklist before you buy"),
    checklist: [
      pick(locale, "Woning/vloer bepaald", "Home/floors defined"),
      pick(locale, "Onderhoud acceptabel", "Maintenance acceptable"),
      pick(locale, "Features echt nodig", "Features truly needed"),
      pick(locale, "Verified™ ok", "Verified™ ok"),
      pick(locale, "Deal vergeleken", "Deal compared"),
    ],
    topicBlurbs: {
      zuigkracht: pick(locale, "Telt op tapijt en bij huisdieren — niet de enige metriek.", "Matters on carpet and with pets — not the only metric."),
      batterij: pick(locale, "Runtime moet bij je woninggrootte passen.", "Runtime must match your home size."),
      gewicht: pick(locale, "Belangrijk als je trappen of tillen hebt.", "Important if you have stairs or lifting."),
      materiaal: pick(locale, "Slijtage en reinigbaarheid van contactdelen.", "Wear and cleanability of contact parts."),
    },
    faq: [
      {
        id: "faq_need",
        question: pick(locale, "Heb ik alle extra functies nodig?", "Do I need all the extra features?"),
        answer: pick(
          locale,
          "Nee. Koop alleen wat je wekelijks gebruikt. Een sterke basisfunctie met weinig onderhoud wint vaak van een feature-rijk model dat blijft staan.",
          "No. Buy only what you’ll use weekly. A strong basic with low upkeep often beats a feature-rich model that sits unused."
        ),
      },
      {
        id: "faq_maint",
        question: pick(locale, "Hoeveel onderhoud kost dit?", "How much maintenance does this take?"),
        answer: pick(
          locale,
          "Reken legen, filters en eventueel dweilen mee. Als je daar geen tijd voor hebt, kies een eenvoudiger model — anders koop je frustratie.",
          "Factor emptying, filters and optional mopping. If you lack time, pick a simpler model — otherwise you buy frustration."
        ),
      },
      {
        id: "faq_size",
        question: pick(locale, "Welk model past bij een grote woning?", "Which model fits a large home?"),
        answer: pick(
          locale,
          "Kies capaciteit en runtime naar oppervlakte. Te klein betekent vaker onderbreken — dat kost meer tijd dan een iets groter model.",
          "Match capacity and runtime to floor area. Too small means more interruptions — that costs more time than a slightly larger model."
        ),
      },
      {
        id: "faq_pets",
        question: pick(locale, "Wat past bij huisdieren?", "What fits with pets?"),
        answer: pick(
          locale,
          "Prioriteer kernprestatie op haren/stof, makkelijk legen en filters. Fancy modi zijn optioneel; schoonmaakgemak niet.",
          "Prioritise core performance on hair/dust, easy emptying and filters. Fancy modes are optional; cleanability isn’t."
        ),
      },
    ],
    relatedHeading: pick(locale, "Gerelateerde categorieën", "Related categories"),
  }
}

function generic(locale: StorefrontLocale, label: string): SpecialistGuide {
  return {
    family: "generic",
    questionsHeading: pick(locale, "Echte koopvragen", "Real buying questions"),
    questions: [
      pick(locale, `Welke ${label.toLowerCase()} past bij mijn situatie?`, `Which ${label.toLowerCase()} fits my situation?`),
      pick(locale, "Welke eigenschappen zijn essentieel — en welke niet?", "Which attributes are essential — and which aren’t?"),
      pick(locale, "Wanneer loont premium?", "When is premium worth it?"),
      pick(locale, "Welke fouten moet ik vermijden?", "Which mistakes should I avoid?"),
    ],
    personasHeading: pick(locale, "Welk product past bij mij?", "Which product fits me?"),
    personas: [
      {
        id: "daily",
        title: pick(locale, "Voor dagelijks gebruik", "For daily use"),
        recommended: pick(locale, "Gebalanceerde middenklasse die de hoofdfunctie goed doet.", "Balanced mid-range that does the main job well."),
        why: pick(locale, "Betrouwbaarheid wint van zeldzame extras.", "Reliability beats rare extras."),
        watch: pick(locale, "Koop geen specs die je situatie niet vraagt.", "Don’t buy specs your situation doesn’t need."),
      },
      {
        id: "intensive",
        title: pick(locale, "Voor intensief gebruik", "For intensive use"),
        recommended: pick(locale, "Robuust model met sterke kernspecs en service.", "Robust model with strong core specs and service."),
        why: pick(locale, "Frequent gebruik eist duurzaamheid.", "Frequent use demands durability."),
        watch: pick(locale, "Check garantie, onderdelen en Verified™.", "Check warranty, parts and Verified™."),
      },
      {
        id: "budget",
        title: pick(locale, "Klein budget", "Tight budget"),
        recommended: pick(locale, "Eenvoudig model met de must-haves.", "Simple model with the must-haves."),
        why: pick(locale, "Focus op wat je écht gebruikt.", "Focus on what you’ll actually use."),
        watch: pick(locale, "Vermijd de allerlaagste prijs als kwaliteit of service ontbreekt.", "Avoid the absolute lowest price if quality or service is missing."),
      },
      {
        id: "value",
        title: pick(locale, "Beste prijs-kwaliteit", "Best value"),
        recommended: pick(locale, "Sterke reviews + Buy Box-deal + Verified™.", "Strong reviews + Buy Box deal + Verified™."),
        why: pick(locale, "Totale deal telt, niet alleen de stickerprijs.", "Total deal matters, not sticker price alone."),
        watch: pick(locale, "Vergelijk retailers op service, niet alleen prijs.", "Compare retailers on service, not only price."),
      },
      {
        id: "premium",
        title: pick(locale, "Premium keuze", "Premium choice"),
        recommended: pick(locale, "Premium wanneer je de extras wekelijks gebruikt.", "Premium when you’ll use the extras weekly."),
        why: pick(locale, "Investering moet zich terugverdienen in gebruik.", "Investment must pay back in use."),
        watch: pick(locale, "Premium ‘voor later’ is zelden slim.", "Premium ‘for later’ is rarely smart."),
      },
      {
        id: "family",
        title: pick(locale, "Voor gezinnen", "For families"),
        recommended: pick(locale, "Veilig, duurzaam, eenvoudig te delen/onderhouden.", "Safe, durable, easy to share/maintain."),
        why: pick(locale, "Gedeeld gebruik vraagt robuustheid.", "Shared use needs robustness."),
        watch: pick(locale, "Kijk naar garantie en Verified™.", "Look at warranty and Verified™."),
      },
    ],
    expertHeading: pick(locale, "Expertadvies", "Expert advice"),
    expertTips: [
      pick(locale, "Bepaal eerst je situatie — daarna pas specificaties.", "Define your situation first — then specs."),
      pick(locale, "Scheid must-haves van nice-to-haves.", "Separate must-haves from nice-to-haves."),
      pick(locale, "Controleer Verified™ en herkomst.", "Check Verified™ and origin."),
      pick(locale, "Vergelijk de Buy Box-deal, niet alleen prijs.", "Compare the Buy Box deal, not only price."),
      pick(locale, "Denk aan onderhoud en levensduur.", "Think about maintenance and lifespan."),
    ],
    mistakesHeading: pick(locale, "Veelgemaakte fouten", "Common mistakes"),
    mistakes: [
      pick(locale, "Alleen op prijs kiezen.", "Choosing on price alone."),
      pick(locale, "Eén specificatie overwaarderen.", "Overvaluing a single specification."),
      pick(locale, "Onderhoud en service vergeten.", "Forgetting maintenance and service."),
      pick(locale, "Premium kopen zonder intensief gebruik.", "Buying premium without intensive use."),
    ],
    lookHeading: pick(locale, "Waar moet je op letten?", "What should you check?"),
    lookSteps: [
      {
        title: pick(locale, "1. Situatie", "1. Situation"),
        body: pick(locale, "Wie gebruikt het, hoe vaak, waar?", "Who uses it, how often, where?"),
      },
      {
        title: pick(locale, "2. Must-haves", "2. Must-haves"),
        body: pick(locale, "Welke 2–3 eigenschappen zijn echt nodig?", "Which 2–3 attributes are truly needed?"),
      },
      {
        title: pick(locale, "3. Total cost", "3. Total cost"),
        body: pick(locale, "Prijs + onderhoud + service.", "Price + upkeep + service."),
      },
      {
        title: pick(locale, "4. Vertrouwen", "4. Trust"),
        body: pick(locale, "Verified™, garantie, Buy Box.", "Verified™, warranty, Buy Box."),
      },
    ],
    checklistHeading: pick(locale, "Checklist vóór je koopt", "Checklist before you buy"),
    checklist: [
      pick(locale, "Situatie helder", "Situation clear"),
      pick(locale, "Must-haves vastgelegd", "Must-haves set"),
      pick(locale, "Verified™ gecheckt", "Verified™ checked"),
      pick(locale, "Deal vergeleken", "Deal compared"),
    ],
    topicBlurbs: {},
    faq: [
      {
        id: "faq_fit",
        question: pick(locale, `Welke ${label.toLowerCase()} past bij mij?`, `Which ${label.toLowerCase()} fits me?`),
        answer: pick(
          locale,
          "Beschrijf je situatie in één zin (wie, hoe vaak, waar). Kies daarna het type dat die zin dekt — pas daarna specs en prijs.",
          "Describe your situation in one sentence (who, how often, where). Then pick the type that covers that sentence — only then specs and price."
        ),
      },
      {
        id: "faq_premium",
        question: pick(locale, "Wanneer loont premium?", "When is premium worth it?"),
        answer: pick(
          locale,
          "Als je de extra’s wekelijks gebruikt of duurzaamheid/service cruciaal is. Anders is sterke middenklasse meestal slimmer.",
          "If you’ll use the extras weekly or durability/service is critical. Otherwise strong mid-range is usually smarter."
        ),
      },
      {
        id: "faq_price",
        question: pick(locale, "Mag ik op prijs kiezen?", "Can I choose on price?"),
        answer: pick(
          locale,
          "Prijs mag meewegen, maar vergelijk de totale deal: Verified™, garantie, verzending en retailer-service via de Buy Box.",
          "Price can matter, but compare the total deal: Verified™, warranty, shipping and retailer service via the Buy Box."
        ),
      },
      {
        id: "faq_mistakes",
        question: pick(locale, "Wat gaat er vaak mis?", "What often goes wrong?"),
        answer: pick(
          locale,
          "Mensen overwaarderen één spec, onderschatten onderhoud, en negeren Vertrouwen (Verified™/garantie). Begin bij gebruik.",
          "People overvalue one spec, underestimate upkeep, and ignore trust (Verified™/warranty). Start with use."
        ),
      },
    ],
    relatedHeading: pick(locale, "Gerelateerde categorieën", "Related categories"),
  }
}

/** Map category slug → specialist family guide (presentation layer). */
export function getSpecialistGuide(
  slug: string,
  label: string,
  locale: StorefrontLocale
): SpecialistGuide {
  if (slug === "tuin" || slug === "outdoor" || slug === "plant-bloem") {
    return garden(locale, label)
  }
  if (
    slug === "mode" ||
    slug === "schoenen" ||
    slug === "tassen-accessoires" ||
    slug === "juwelen-horloges"
  ) {
    return fashion(locale, label)
  }
  if (
    slug === "huishouden" ||
    slug === "wonen" ||
    slug === "keuken" ||
    slug === "badkamer" ||
    slug === "slaapkamer"
  ) {
    return home(locale, label)
  }
  return generic(locale, label)
}

void electronics

/** Short explanation for a topic label — presentation only. */
export function topicBlurbFor(
  guide: SpecialistGuide,
  topic: string
): string | null {
  const key = topic.toLowerCase()
  for (const [k, v] of Object.entries(guide.topicBlurbs)) {
    if (key.includes(k) || k.includes(key)) return v
  }
  return null
}
