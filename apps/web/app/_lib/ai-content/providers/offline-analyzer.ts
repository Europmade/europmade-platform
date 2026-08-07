/**
 * Offline analyzer provider — unique, signal-driven content without external LLM.
 * Swap for OpenAI/Claude/Gemini via registry when EU ADR unlocks (ADR-0036).
 */

import { L, type LocalizedString } from "../../i18n/locales"
import type {
  AiFaqItem,
  AiGeneratedContentPayload,
  AiGenerateRequest,
  AiGenerateResult,
  AiInternalLink,
  AiRelatedRef,
} from "../types"
import type { AiContentProvider } from "./types"
import {
  buildDiscoveryCards,
  buildRichBuyGuideSections,
} from "./offline-rich"
import {
  buildDiscoveryRails,
  buildEditorialBlocks,
  buildImportanceRows,
  buildProductCloudInsights,
  buildTopicVisuals,
} from "./offline-editorial"

function joinList(items: string[], locale: "nl" | "en" | "de" | "fr"): string {
  if (items.length === 0) {
    return locale === "nl"
      ? "Europese makers"
      : locale === "de"
        ? "europäische Hersteller"
        : locale === "fr"
          ? "fabricants européens"
          : "European makers"
  }
  if (items.length === 1) return items[0]!
  const head = items.slice(0, -1).join(", ")
  const and =
    locale === "nl" ? "en" : locale === "de" ? "und" : locale === "fr" ? "et" : "and"
  return `${head} ${and} ${items[items.length - 1]}`
}

function topicsPhrase(topics: string[], locale: "nl" | "en" | "de" | "fr"): string {
  const t = topics.slice(0, 5)
  if (t.length === 0) return locale === "nl" ? "kwaliteit en herkomst" : "quality and origin"
  return joinList(t, locale)
}

function buildFaq(
  label: string,
  topics: string[],
  brands: string[],
  countries: string[],
  verifiedRatio: number
): AiFaqItem[] {
  const brandEx = brands[0] ?? "Europese merken"
  const countryEx = countries[0] ?? "Nederland"
  const topicA = topics[0] ?? "kwaliteit"
  const topicB = topics[1] ?? "herkomst"
  const topicC = topics[2] ?? "duurzaamheid"
  const topicD = topics[3] ?? "garantie"
  const topicE = topics[4] ?? "onderhoud"

  const items: Omit<AiFaqItem, "id">[] = [
    {
      question: L(
        `Wat betekent Verified™ bij ${label}?`,
        `What does Verified™ mean for ${label}?`,
        `Was bedeutet Verified™ bei ${label}?`,
        `Que signifie Verified™ pour ${label} ?`
      ),
      answer: L(
        `Verified™ betekent dat productinformatie en herkomst voor ${label} zijn gecontroleerd. Op dit moment is ongeveer ${Math.round(verifiedRatio * 100)}% van het getoonde aanbod Verified™.`,
        `Verified™ means product information and origin for ${label} are checked. About ${Math.round(verifiedRatio * 100)}% of the shown assortment is Verified™.`,
        `Verified™ bedeutet, dass Produktinformationen und Herkunft für ${label} geprüft wurden. Etwa ${Math.round(verifiedRatio * 100)}% des gezeigten Sortiments sind Verified™.`,
        `Verified™ signifie que les informations produit et l’origine pour ${label} sont contrôlées. Environ ${Math.round(verifiedRatio * 100)}% de l’assortiment affiché est Verified™.`
      ),
      snippetAnswer: L(
        "Gecontroleerde productinformatie en herkomst volgens EuropMade-criteria.",
        "Checked product information and origin per EuropMade criteria.",
        "Geprüfte Produktinformationen und Herkunft nach EuropMade-Kriterien.",
        "Informations produit et origine contrôlées selon les critères EuropMade."
      ),
    },
    {
      question: L(
        `Waar moet je op letten bij ${label}?`,
        `What should you look for when buying ${label}?`,
        `Worauf sollten Sie bei ${label} achten?`,
        `Que faut-il vérifier pour ${label} ?`
      ),
      answer: L(
        `Vergelijk vooral ${topicA}, ${topicB} en ${topicC}. Kijk daarnaast naar productieland, Verified™-status en totale aanbieding (prijs, levertijd, reviews) — nooit alleen naar de laagste prijs.`,
        `Compare especially ${topicA}, ${topicB} and ${topicC}. Also check production country, Verified™ status and the total offer (price, delivery, reviews) — never price alone.`,
        `Vergleichen Sie vor allem ${topicA}, ${topicB} und ${topicC}. Prüfen Sie auch Herkunftsland, Verified™-Status und das Gesamtangebot.`,
        `Comparez surtout ${topicA}, ${topicB} et ${topicC}. Vérifiez aussi le pays de production, le statut Verified™ et l’offre totale.`
      ),
    },
    {
      question: L(
        `Welke merken zijn relevant voor ${label}?`,
        `Which brands matter for ${label}?`,
        `Welche Marken sind für ${label} relevant?`,
        `Quelles marques comptent pour ${label} ?`
      ),
      answer: L(
        brands.length
          ? `In dit aanbod zie je onder meer ${joinList(brands.slice(0, 4), "nl")}. Vergelijk merken op ${topicA} en service — niet op advertenties.`
          : `EuropMade toont officiële merken en retailers voor ${label}. Vergelijk op specificaties en service.`,
        brands.length
          ? `This assortment includes ${joinList(brands.slice(0, 4), "en")}. Compare brands on ${topicA} and service — never ads.`
          : `EuropMade lists official brands and retailers for ${label}. Compare on specs and service.`,
        brands.length
          ? `In diesem Sortiment finden Sie u. a. ${joinList(brands.slice(0, 4), "de")}.`
          : `EuropMade zeigt offizielle Marken und Händler für ${label}.`,
        brands.length
          ? `Cet assortiment inclut notamment ${joinList(brands.slice(0, 4), "fr")}.`
          : `EuropMade présente des marques et détaillants officiels pour ${label}.`
      ),
    },
    {
      question: L(
        `Uit welke landen komt ${label} op EuropMade?`,
        `Which countries produce ${label} on EuropMade?`,
        `Aus welchen Ländern stammt ${label} auf EuropMade?`,
        `De quels pays vient ${label} sur EuropMade ?`
      ),
      answer: L(
        countries.length
          ? `Productie komt onder meer uit ${joinList(countries.slice(0, 5), "nl")}. Filter op productieland om Europese herkomst te prioriteren.`
          : `Alle producten op EuropMade komen van Europese producenten of officiële retailers.`,
        countries.length
          ? `Production includes ${joinList(countries.slice(0, 5), "en")}. Filter by country to prioritise European origin.`
          : `All EuropMade products come from European producers or official retailers.`,
        countries.length
          ? `Die Produktion stammt u. a. aus ${joinList(countries.slice(0, 5), "de")}.`
          : `Alle Produkte auf EuropMade stammen von europäischen Produzenten oder offiziellen Händlern.`,
        countries.length
          ? `La production vient notamment de ${joinList(countries.slice(0, 5), "fr")}.`
          : `Tous les produits EuropMade viennent de producteurs européens ou de détaillants officiels.`
      ),
      snippetAnswer: L(
        countries.length ? `O.a. ${countryEx} en andere EU-landen.` : "Europese herkomst.",
        countries.length ? `E.g. ${countryEx} and other EU countries.` : "European origin.",
        countries.length ? `U. a. ${countryEx} und weitere EU-Länder.` : "Europäische Herkunft.",
        countries.length ? `P. ex. ${countryEx} et d’autres pays UE.` : "Origine européenne."
      ),
    },
    {
      question: L(
        `Hoe vergelijk je aanbieders voor ${label}?`,
        `How do you compare sellers for ${label}?`,
        `Wie vergleichen Sie Anbieter für ${label}?`,
        `Comment comparer les vendeurs pour ${label} ?`
      ),
      answer: L(
        `Op de productpagina zie je alle officiële aanbieders. De Buy Box kiest de beste totale aanbieding voor jou — nooit gesponsord door commissie of advertenties.`,
        `On the product page you see all official sellers. The Buy Box picks the best total offer for you — never sponsored by commission or ads.`,
        `Auf der Produktseite sehen Sie alle offiziellen Anbieter. Die Buy Box wählt das beste Gesamtangebot — nie gesponsert.`,
        `Sur la page produit, vous voyez tous les vendeurs officiels. La Buy Box choisit la meilleure offre totale — jamais sponsorisée.`
      ),
    },
    {
      question: L(
        `Waarom Europees geproduceerde ${label}?`,
        `Why choose European-made ${label}?`,
        `Warum europäisch produzierte ${label}?`,
        `Pourquoi choisir des ${label} fabriqués en Europe ?`
      ),
      answer: L(
        `Europese productie houdt waarde, innovatie en werkgelegenheid dichterbij, met duidelijkere herkomst en vaak strengere productnormen. Kijk naar ${topicB} en productielandfilters.`,
        `European production keeps value, innovation and jobs closer, with clearer origin and often stricter standards. Check ${topicB} and country filters.`,
        `Europäische Produktion hält Wertschöpfung und Arbeitsplätze näher, mit klarerer Herkunft.`,
        `La production européenne garde la valeur et l’emploi plus proches, avec une origine plus claire.`
      ),
    },
    {
      question: L(
        `Hoe zit het met garantie en onderhoud bij ${label}?`,
        `What about warranty and care for ${label}?`,
        `Wie stehen Garantie und Pflege bei ${label}?`,
        `Quid de la garantie et de l’entretien pour ${label} ?`
      ),
      answer: L(
        `Controleer garantievoorwaarden per aanbieder op de productpagina. Voor ${topicE} volgen merken zoals ${brandEx} vaak EU-richtlijnen — lees de productcloudinformatie vóór aankoop.`,
        `Check warranty terms per seller on the product page. For ${topicE}, brands like ${brandEx} typically follow EU guidance — read Product Cloud info before buying.`,
        `Prüfen Sie die Garantiebedingungen je Anbieter. Für ${topicE} folgen Marken wie ${brandEx} oft EU-Vorgaben.`,
        `Vérifiez la garantie par vendeur. Pour ${topicE}, des marques comme ${brandEx} suivent souvent les règles UE.`
      ),
    },
    {
      question: L(
        `Voor wie is welk type ${label} geschikt?`,
        `Who is each type of ${label} for?`,
        `Für wen eignet sich welcher Typ ${label}?`,
        `Pour qui convient chaque type de ${label} ?`
      ),
      answer: L(
        `Kies op gebruik: intensive gebruikers prioriteren ${topicA} en ${topicD}; occasionele kopers wegen comfort en prijs-kwaliteit zwaarder. Gebruik filters op ${topicC} om te verfijnen.`,
        `Choose by use: intensive users prioritise ${topicA} and ${topicD}; occasional buyers weigh comfort and value. Use ${topicC} filters to refine.`,
        `Wählen Sie nach Nutzung: Intensivnutzer priorisieren ${topicA} und ${topicD}.`,
        `Choisissez selon l’usage : les utilisateurs intensifs priorisent ${topicA} et ${topicD}.`
      ),
    },
  ]

  return items.map((item, i) => ({
    ...item,
    id: `faq_ai_${i + 1}`,
  }))
}

function relatedRefs(
  slugs: string[],
  labels: string[],
  prefix: string
): AiRelatedRef[] {
  return slugs.map((slug, i) => ({
    id: `${prefix}_${slug}`,
    slug,
    label: L(
      labels[i] ?? slug,
      labels[i] ?? slug,
      labels[i] ?? slug,
      labels[i] ?? slug
    ),
    href: `/categorie/${slug}`,
  }))
}

function brandRefs(brands: string[]): AiRelatedRef[] {
  return brands.slice(0, 6).map((b) => {
    const slug = b.toLowerCase().replace(/\s+/g, "-")
    return {
      id: `brand_${slug}`,
      slug,
      label: L(b, b, b, b),
      href: `/zoeken?merk=${encodeURIComponent(b)}`,
    }
  })
}

function producerRefs(producers: string[]): AiRelatedRef[] {
  return producers.slice(0, 6).map((p) => {
    const slug = p.toLowerCase().replace(/\s+/g, "-")
    return {
      id: `producer_${slug}`,
      slug,
      label: L(p, p, p, p),
      href: `/partner/${slug}`,
    }
  })
}

function internalLinks(
  label: string,
  related: AiRelatedRef[],
  brands: AiRelatedRef[],
  producers: AiRelatedRef[]
): AiInternalLink[] {
  const links: AiInternalLink[] = []
  related.slice(0, 3).forEach((r, i) => {
    links.push({
      id: `il_cat_${i}`,
      kind: i === 0 ? "see_also" : i === 1 ? "you_may_like" : "goes_well_with",
      label: L(
        i === 0 ? `Bekijk ook ${r.label.nl}` : i === 1 ? `Misschien ook interessant: ${r.label.nl}` : `Past goed bij ${r.label.nl}`,
        i === 0 ? `Also see ${r.label.en}` : i === 1 ? `You may also like ${r.label.en}` : `Goes well with ${r.label.en}`,
        i === 0 ? `Auch ansehen: ${r.label.de}` : i === 1 ? `Vielleicht auch interessant: ${r.label.de}` : `Passt gut zu ${r.label.de}`,
        i === 0 ? `Voir aussi ${r.label.fr}` : i === 1 ? `Peut aussi vous plaire : ${r.label.fr}` : `Va bien avec ${r.label.fr}`
      ),
      href: r.href,
      targetType: "category",
      targetId: r.slug,
    })
  })
  brands.slice(0, 2).forEach((b, i) => {
    links.push({
      id: `il_brand_${i}`,
      kind: "often_combined",
      label: L(
        `Vaak gecombineerd met ${b.label.nl}`,
        `Often combined with ${b.label.en}`,
        `Oft kombiniert mit ${b.label.de}`,
        `Souvent associé à ${b.label.fr}`
      ),
      href: b.href,
      targetType: "brand",
      targetId: b.slug,
    })
  })
  producers.slice(0, 2).forEach((p, i) => {
    links.push({
      id: `il_prod_${i}`,
      kind: "see_also",
      label: L(
        `Bekijk producent ${p.label.nl}`,
        `View producer ${p.label.en}`,
        `Produzent ansehen: ${p.label.de}`,
        `Voir le producteur ${p.label.fr}`
      ),
      href: p.href,
      targetType: "producer",
      targetId: p.slug,
    })
  })
  if (links.length === 0) {
    links.push({
      id: "il_fallback",
      kind: "see_also",
      label: L(
        `Ontdek meer Europese ${label}`,
        `Discover more European ${label}`,
        `Mehr europäische ${label} entdecken`,
        `Découvrir plus de ${label} européens`
      ),
      href: "/categorie",
      targetType: "category",
      targetId: "root",
    })
  }
  return links
}

function buildPayload(request: AiGenerateRequest): AiGeneratedContentPayload {
  const ctx = request.context
  const label = ctx.label
  const topics = ctx.focusTopics
  const topicPhraseNl = topicsPhrase(topics, "nl")
  const topicPhraseEn = topicsPhrase(topics, "en")
  const topicPhraseDe = topicsPhrase(topics, "de")
  const topicPhraseFr = topicsPhrase(topics, "fr")
  const brandListNl = joinList(ctx.brands.slice(0, 4), "nl")
  const countryListNl = joinList(ctx.productionCountries.slice(0, 4), "nl")
  const sampleTitles = ctx.products
    .slice(0, 3)
    .map((p) => p.title)
    .join(", ")

  const related = relatedRefs(
    ctx.relatedCategorySlugs,
    ctx.relatedCategoryLabels,
    "rel"
  )
  const brands = brandRefs(ctx.brands)
  const producers = producerRefs(ctx.producers)
  const faq = buildFaq(
    label,
    topics,
    ctx.brands,
    ctx.productionCountries,
    ctx.verifiedRatio
  )
  const buyGuideSections = buildRichBuyGuideSections(ctx)
  const discoveryCards = buildDiscoveryCards(ctx)

  const seoTitle = L(
    `${label} kopen | Europese makers | EuropMade`,
    `Buy ${label} | European makers | EuropMade`,
    `${label} kaufen | Europäische Hersteller | EuropMade`,
    `Acheter ${label} | Fabricants européens | EuropMade`
  )
  const metaDescription = L(
    `Koop ${label} van Europese producenten en officiële retailers. Vergelijk op ${topicPhraseNl}, Verified™ en productieland — zonder gesponsorde Buy Box.`,
    `Shop ${label} from European producers and official retailers. Compare ${topicPhraseEn}, Verified™ and country of origin — never a sponsored Buy Box.`,
    `Kaufen Sie ${label} von europäischen Produzenten. Vergleichen Sie ${topicPhraseDe}, Verified™ und Herkunftsland.`,
    `Achetez ${label} auprès de producteurs européens. Comparez ${topicPhraseFr}, Verified™ et pays d’origine.`
  )
  const h1 = L(label, label, label, label)
  const intro = L(
    ctx.productCount > 0
      ? `Ontdek ${ctx.productCount} ${label.toLowerCase()}-producten van makers zoals ${brandListNl}. Let op ${topicPhraseNl}${countryListNl ? ` en productie in ${countryListNl}` : ""}. Vergelijk Verified™-aanbieders en houd waarde binnen Europa.`
      : `Ontdek ${label} van Europese producenten en officiële retailers. Filter op ${topicPhraseNl}, productieland en Verified™ — klaar voor aanbod van makers.`,
    ctx.productCount > 0
      ? `Explore ${ctx.productCount} ${label.toLowerCase()} products from makers such as ${joinList(ctx.brands.slice(0, 4), "en")}. Focus on ${topicPhraseEn}. Compare Verified™ sellers and keep value in Europe.`
      : `Discover ${label} from European producers and official retailers. Filter by ${topicPhraseEn}, country and Verified™.`,
    ctx.productCount > 0
      ? `Entdecken Sie ${ctx.productCount} ${label}-Produkte von Herstellern wie ${joinList(ctx.brands.slice(0, 4), "de")}. Achten Sie auf ${topicPhraseDe}.`
      : `Entdecken Sie ${label} von europäischen Produzenten. Filtern Sie nach ${topicPhraseDe}.`,
    ctx.productCount > 0
      ? `Découvrez ${ctx.productCount} produits ${label.toLowerCase()} de fabricants comme ${joinList(ctx.brands.slice(0, 4), "fr")}. Priorisez ${topicPhraseFr}.`
      : `Découvrez ${label} auprès de producteurs européens. Filtrez par ${topicPhraseFr}.`
  )

  const buyGuide = L(
    [
      `Koopgids ${label}`,
      ``,
      `Deze gids is gebaseerd op het actuele aanbod${sampleTitles ? ` (o.a. ${sampleTitles})` : ""} en de relevante eigenschappen ${topicPhraseNl}.`,
      ``,
      ...buyGuideSections.map(
        (s) => `## ${s.heading.nl}\n${s.body.nl}`
      ),
    ].join("\n"),
    [
      `Buying guide: ${label}`,
      ``,
      `This guide is grounded in the live assortment${sampleTitles ? ` (e.g. ${sampleTitles})` : ""} and attributes around ${topicPhraseEn}.`,
      ``,
      ...buyGuideSections.map(
        (s) => `## ${s.heading.en}\n${s.body.en}`
      ),
    ].join("\n"),
    [
      `Kaufguide ${label}`,
      ``,
      ...buyGuideSections.map(
        (s) => `## ${s.heading.de}\n${s.body.de}`
      ),
    ].join("\n"),
    [
      `Guide d’achat ${label}`,
      ``,
      ...buyGuideSections.map(
        (s) => `## ${s.heading.fr}\n${s.body.fr}`
      ),
    ].join("\n")
  )

  const keyFeatures = topics.slice(0, 6).map((topic) =>
    L(
      `${topic.charAt(0).toUpperCase()}${topic.slice(1)} als besliscriterium voor ${label}`,
      `${topic.charAt(0).toUpperCase()}${topic.slice(1)} as a decision criterion for ${label}`,
      `${topic.charAt(0).toUpperCase()}${topic.slice(1)} als Entscheidungskriterium für ${label}`,
      `${topic.charAt(0).toUpperCase()}${topic.slice(1)} comme critère pour ${label}`
    )
  )

  const whatToLookFor = L(
    `Let bij ${label} op ${topicPhraseNl}, productieland en of het product Verified™ is. Vergelijk daarna pas prijzen tussen officiële retailers.`,
    `For ${label}, prioritise ${topicPhraseEn}, production country and Verified™ status before comparing retailer prices.`,
    `Achten Sie bei ${label} auf ${topicPhraseDe}, Herkunftsland und Verified™.`,
    `Pour ${label}, priorisez ${topicPhraseFr}, le pays de production et Verified™.`
  )

  const buyingAdvice = L(
    `Kies ${label} die aansluit op jouw gebruik: intensive gebruikers maximaliseren ${topics[0] ?? "prestaties"}; anderen balanceren comfort en prijs. Gebruik filters en de Buy Box voor de beste totale deal.`,
    `Pick ${label} that match your use: intensive users maximise ${topics[0] ?? "performance"}; others balance comfort and price. Use filters and the Buy Box for the best total deal.`,
    `Wählen Sie ${label} passend zu Ihrer Nutzung und nutzen Sie Filter sowie Buy Box.`,
    `Choisissez des ${label} adaptés à votre usage et utilisez filtres et Buy Box.`
  )

  const benefits = [
    L(
      "Officiële Europese producenten en retailers — EuropMade verkoopt zelf nooit.",
      "Official European producers and retailers — EuropMade never sells itself.",
      "Offizielle europäische Produzenten und Händler — EuropMade verkauft nie selbst.",
      "Producteurs et détaillants européens officiels — EuropMade ne vend jamais elle-même."
    ),
    L(
      "Verified™ waar beschikbaar voor betrouwbare productinformatie.",
      "Verified™ where available for trustworthy product information.",
      "Verified™ wo verfügbar für vertrauenswürdige Produktinformationen.",
      "Verified™ si disponible pour des informations produit fiables."
    ),
    L(
      `Vergelijk op ${topicPhraseNl} én totale aanbieding — nooit gesponsorde ranking.`,
      `Compare on ${topicPhraseEn} and total offer — never sponsored ranking.`,
      `Vergleich nach ${topicPhraseDe} und Gesamtangebot — nie gesponserte Rankings.`,
      `Comparez ${topicPhraseFr} et l’offre totale — jamais de classement sponsorisé.`
    ),
  ]

  const drawbacks = [
    L(
      "Assortiment hangt af van aangesloten Europese partners — niet elk nicheproduct is meteen beschikbaar.",
      "Assortment depends on connected European partners — not every niche product is available immediately.",
      "Das Sortiment hängt von angeschlossenen Partnern ab.",
      "L’assortiment dépend des partenaires européens connectés."
    ),
    L(
      "Specificaties vergelijken vraagt iets meer aandacht dan alleen op prijs te sorteren.",
      "Comparing specs takes a little more attention than sorting by price alone.",
      "Spezifikationen vergleichen braucht etwas mehr Aufmerksamkeit.",
      "Comparer les specs demande un peu plus d’attention."
    ),
  ]

  const comparison = L(
    `Vergelijk ${label} op ${topicPhraseNl}, productieland en Verified™ voordat je retailers op prijs vergelijkt.`,
    `Compare ${label} on ${topicPhraseEn}, country and Verified™ before comparing retailers on price.`,
    `Vergleichen Sie ${label} nach ${topicPhraseDe}, Herkunft und Verified™.`,
    `Comparez ${label} sur ${topicPhraseFr}, pays et Verified™.`
  )

  const maintenance = L(
    `Plan onderhoud en garantie rond ${topics[2] ?? "duurzaamheid"}. Bewaar Product Cloud-informatie bij aankoop.`,
    `Plan care and warranty around ${topics[2] ?? "sustainability"}. Keep Product Cloud information at purchase.`,
    `Planen Sie Pflege und Garantie rund um ${topics[2] ?? "Nachhaltigkeit"}.`,
    `Planifiez entretien et garantie autour de ${topics[2] ?? "durabilité"}.`
  )

  const sustainability = L(
    `Kies reparabele ${label} met Europese herkomst om impact per gebruiksjaar te verlagen.`,
    `Choose repairable ${label} with European origin to lower impact per year of use.`,
    `Wählen Sie reparierbare ${label} mit europäischer Herkunft.`,
    `Choisissez des ${label} réparables d’origine européenne.`
  )

  const keywords = [
    L(`${label} kopen`, `buy ${label}`, `${label} kaufen`, `acheter ${label}`),
    L(
      `Europese ${label}`,
      `European ${label}`,
      `europäische ${label}`,
      `${label} européens`
    ),
    L("Verified producten", "Verified products", "Verified Produkte", "produits Verified"),
    ...topics.slice(0, 4).map((t) => L(t, t, t, t)),
  ]

  const longTailKeywords = [
    L(
      `beste ${label} Europese productie`,
      `best European-made ${label}`,
      `beste europäisch produzierte ${label}`,
      `meilleurs ${label} fabriqués en Europe`
    ),
    L(
      `${label} vergelijken Verified`,
      `compare Verified ${label}`,
      `${label} Verified vergleichen`,
      `comparer ${label} Verified`
    ),
    L(
      `${label} met ${topics[0] ?? "kwaliteit"}`,
      `${label} with ${topics[0] ?? "quality"}`,
      `${label} mit ${topics[0] ?? "Qualität"}`,
      `${label} avec ${topics[0] ?? "qualité"}`
    ),
  ]

  const featuredSnippetAnswers = faq
    .map((f) => f.snippetAnswer)
    .filter((x): x is LocalizedString => x != null)
    .slice(0, 4)

  const seoSummary = L(
    `${label} op EuropMade: Europese makers, filters op ${topicPhraseNl}, Verified™ en een koopgids zonder gesponsorde Buy Box.`,
    `${label} on EuropMade: European makers, filters for ${topicPhraseEn}, Verified™ and a buying guide without a sponsored Buy Box.`,
    `${label} auf EuropMade: europäische Hersteller, Filter für ${topicPhraseDe}, Verified™ und Kaufguide ohne gesponserte Buy Box.`,
    `${label} sur EuropMade : fabricants européens, filtres ${topicPhraseFr}, Verified™ et guide d’achat sans Buy Box sponsorisée.`
  )

  const canonicalPath = `/categorie/${ctx.entityId}`

  const suitableFor = [
    L(
      `Wie ${topics[0] ?? "kwaliteit"} en Europese herkomst serieus neemt.`,
      `Anyone who takes ${topics[0] ?? "quality"} and European origin seriously.`,
      `Wer ${topics[0] ?? "Qualität"} und europäische Herkunft ernst nimmt.`,
      `Ceux qui prennent ${topics[0] ?? "qualité"} et l’origine européenne au sérieux.`
    ),
  ]
  const lessSuitableFor = [
    L(
      "Wie alleen op laagste prijs wil kiezen zonder specificaties.",
      "Anyone who only wants the lowest price without specs.",
      "Wer nur den niedrigsten Preis ohne Specs will.",
      "Ceux qui veulent seulement le prix le plus bas sans specs."
    ),
  ]
  const expertAdvice = buyingAdvice

  const editorialBlocks = buildEditorialBlocks(ctx, {
    benefits,
    drawbacks,
    comparison,
    maintenance,
    sustainability,
    buyingAdvice,
    whatToLookFor,
    intro,
  })
  const discoveryRails = buildDiscoveryRails(ctx)
  const productCloudInsights = buildProductCloudInsights(ctx)
  const topicVisuals = buildTopicVisuals(ctx)
  const importanceRows = buildImportanceRows(ctx)

  return {
    seoTitle,
    metaDescription,
    h1,
    intro,
    buyGuide,
    buyGuideSections,
    editorialBlocks,
    keyFeatures,
    whatToLookFor,
    buyingAdvice,
    benefits,
    drawbacks,
    comparison,
    maintenance,
    sustainability,
    suitableFor,
    lessSuitableFor,
    expertAdvice,
    faq,
    internalLinks: internalLinks(label, related, brands, producers),
    discoveryCards,
    discoveryRails,
    productCloudInsights,
    topicVisuals,
    importanceRows,
    relatedCategories: related,
    relatedProducers: producers,
    relatedBrands: brands,
    frequentlyCombined: [...related.slice(0, 2), ...brands.slice(0, 2)],
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: label,
      description: metaDescription.nl,
      url: `https://europmade.eu${canonicalPath}`,
      isPartOf: { "@type": "WebSite", name: "EuropMade" },
      about: {
        "@type": "Thing",
        name: label,
        description: seoSummary.nl,
      },
      mainEntity: {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question.nl,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer.nl,
          },
        })),
      },
    },
    openGraph: {
      title: seoTitle,
      description: metaDescription,
      type: "website",
    },
    twitterCard: {
      card: "summary_large_image",
      title: seoTitle,
      description: metaDescription,
    },
    canonicalPath,
    altTexts: [
      L(
        `${label} van Europese producenten op EuropMade`,
        `${label} from European producers on EuropMade`,
        `${label} von europäischen Produzenten auf EuropMade`,
        `${label} de producteurs européens sur EuropMade`
      ),
      L(
        `Verified™ ${label} productfotografie`,
        `Verified™ ${label} product photography`,
        `Verified™ ${label} Produktfotografie`,
        `Photographie produit ${label} Verified™`
      ),
    ],
    breadcrumbSeo: [
      {
        name: L("Home", "Home", "Home", "Accueil"),
        path: "/",
      },
      {
        name: L("Categorieën", "Categories", "Kategorien", "Catégories"),
        path: "/categorie",
      },
      {
        name: h1,
        path: canonicalPath,
      },
    ],
    keywords,
    longTailKeywords,
    featuredSnippetAnswers,
    seoSummary,
  }
}

export const offlineAnalyzerProvider: AiContentProvider = {
  id: "offline-analyzer",
  label: "Offline analyzer (EU-safe interim)",
  isConfigured: () => true,
  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const base =
      request.translationsOnly && request.previous
        ? request.previous
        : buildPayload(request)
    // Translations-only keeps structure; analyzer already stores all locales.
    return {
      payload: base,
      providerId: "offline-analyzer",
      promptVersion: request.promptVersion,
    }
  },
}
