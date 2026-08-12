/**
 * Signal-driven rich buy-guide + discovery payloads (offline analyzer helpers).
 */

import { L, type LocalizedString } from "../../i18n/locales"
import { RELATED_CATEGORY_COUNT_HINTS } from "../../cms/category-cms"
import { CATEGORY_PRODUCT_KIND } from "../../product-mockup"
import type {
  AiBuyGuideSection,
  AiContentAnalysisContext,
  AiDiscoveryCard,
  AiInternalLink,
  AiRelatedRef,
} from "../types"

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

function LS(nl: string, en: string, de: string, fr: string): LocalizedString {
  return L(nl, en, de, fr)
}

function brandRefs(brands: string[]): AiRelatedRef[] {
  return brands.slice(0, 6).map((b) => {
    const slug = b.toLowerCase().replace(/\s+/g, "-")
    return {
      id: `brand_${slug}`,
      slug,
      label: LS(b, b, b, b),
      href: `/zoeken?merk=${encodeURIComponent(b)}`,
      logoKey: slug.includes("verde") ? "verdetech" : "atelier",
      productCount: 12 + (slug.length % 40),
    }
  })
}

function producerRefs(
  producers: string[],
  countries: string[]
): AiRelatedRef[] {
  return producers.slice(0, 6).map((p, i) => {
    const slug = p.toLowerCase().replace(/\s+/g, "-")
    const country = countries[i % Math.max(countries.length, 1)] ?? "Europa"
    return {
      id: `producer_${slug}`,
      slug,
      label: LS(p, p, p, p),
      href: `/merk/${slug}`,
      logoKey: slug.includes("verde") || slug.includes("tuin") ? "verdetech" : "atelier",
      countryLabel: LS(country, country, country, country),
      productCount: 8 + (slug.length % 30),
    }
  })
}

function categoryRefs(slugs: string[], labels: string[]): AiRelatedRef[] {
  return slugs.map((slug, i) => ({
    id: `rel_${slug}`,
    slug,
    label: LS(
      labels[i] ?? slug,
      labels[i] ?? slug,
      labels[i] ?? slug,
      labels[i] ?? slug
    ),
    href: `/categorie/${slug}`,
    imageKind: CATEGORY_PRODUCT_KIND[slug] ?? "coffee",
    productCount: RELATED_CATEGORY_COUNT_HINTS[slug] ?? 120 + (slug.length * 37) % 400,
  }))
}

function productRefs(ctx: AiContentAnalysisContext): AiRelatedRef[] {
  return ctx.products.slice(0, 4).map((p, i) => {
    const slug = p.title.toLowerCase().replace(/\s+/g, "-").slice(0, 40)
    return {
      id: `prod_${i}_${slug}`,
      slug,
      label: LS(p.title, p.title, p.title, p.title),
      href: `/product/${slug}`,
      imageKind: CATEGORY_PRODUCT_KIND[ctx.entityId] ?? "coffee",
      productCount: null,
    }
  })
}

export function buildDiscoveryCards(
  ctx: AiContentAnalysisContext
): AiDiscoveryCard[] {
  const cats = categoryRefs(ctx.relatedCategorySlugs, ctx.relatedCategoryLabels)
  const brands = brandRefs(ctx.brands)
  const producers = producerRefs(ctx.producers, ctx.productionCountries)
  const products = productRefs(ctx)
  const cards: AiDiscoveryCard[] = []

  cats.slice(0, 3).forEach((c) => {
    cards.push({
      id: `disc_cat_${c.slug}`,
      type: "category",
      title: c.label,
      subtitle: LS(
        `${c.productCount ?? 0} producten`,
        `${c.productCount ?? 0} products`,
        `${c.productCount ?? 0} Produkte`,
        `${c.productCount ?? 0} produits`
      ),
      href: c.href,
      imageKind: c.imageKind,
      productCount: c.productCount,
    })
  })

  brands.slice(0, 3).forEach((b) => {
    cards.push({
      id: `disc_brand_${b.slug}`,
      type: "brand",
      title: b.label,
      subtitle: LS(
        `${b.productCount ?? 0} producten`,
        `${b.productCount ?? 0} products`,
        `${b.productCount ?? 0} Produkte`,
        `${b.productCount ?? 0} produits`
      ),
      href: b.href,
      logoKey: b.logoKey,
      productCount: b.productCount,
      badge: LS("Merk", "Brand", "Marke", "Marque"),
    })
  })

  producers.slice(0, 3).forEach((p) => {
    cards.push({
      id: `disc_producer_${p.slug}`,
      type: "producer",
      title: p.label,
      subtitle: p.countryLabel,
      href: p.href,
      logoKey: p.logoKey,
      countryLabel: p.countryLabel,
      productCount: p.productCount,
      badge: LS("Producent", "Producer", "Produzent", "Producteur"),
    })
  })

  cards.push({
    id: `disc_collection_${ctx.entityId}`,
    type: "collection",
    title: LS(
      `Collectie ${ctx.label}`,
      `${ctx.label} collection`,
      `Kollektion ${ctx.label}`,
      `Collection ${ctx.label}`
    ),
    subtitle: LS(
      "Seizoensselectie van Europese makers",
      "Seasonal selection of European makers",
      "Saisonale Auswahl europäischer Hersteller",
      "Sélection saisonnière de fabricants européens"
    ),
    href: `/zoeken?collectie=${ctx.entityId}`,
    imageKind: CATEGORY_PRODUCT_KIND[ctx.entityId] ?? "coffee",
    badge: LS("Collectie", "Collection", "Kollektion", "Collection"),
  })

  products.slice(0, 2).forEach((p) => {
    cards.push({
      id: `disc_combo_${p.id}`,
      type: "combination",
      title: p.label,
      subtitle: LS(
        "Vaak gekocht met",
        "Frequently bought with",
        "Häufig gekauft mit",
        "Souvent acheté avec"
      ),
      href: p.href,
      imageKind: p.imageKind,
      badge: LS("Combinatie", "Combo", "Kombination", "Combinaison"),
    })
  })

  cards.push({
    id: `disc_next_${ctx.entityId}`,
    type: "next_step",
    title: LS(
      "Vergelijk Verified™ aanbieders",
      "Compare Verified™ sellers",
      "Verified™-Anbieter vergleichen",
      "Comparer les vendeurs Verified™"
    ),
    subtitle: LS(
      "Beste totale aanbieding — nooit gesponsord",
      "Best total offer — never sponsored",
      "Bestes Gesamtangebot — nie gesponsert",
      "Meilleure offre totale — jamais sponsorisée"
    ),
    href: `/zoeken?categorie=${ctx.entityId}`,
    imageKind: CATEGORY_PRODUCT_KIND[ctx.entityId] ?? "coffee",
    badge: LS("Volgende stap", "Next step", "Nächster Schritt", "Étape suivante"),
  })

  return cards
}

export function buildRichBuyGuideSections(
  ctx: AiContentAnalysisContext
): AiBuyGuideSection[] {
  const label = ctx.label
  const t0 = ctx.focusTopics[0] ?? "kwaliteit"
  const t1 = ctx.focusTopics[1] ?? "herkomst"
  const t2 = ctx.focusTopics[2] ?? "duurzaamheid"
  const t3 = ctx.focusTopics[3] ?? "garantie"
  const brands = brandRefs(ctx.brands)
  const producers = producerRefs(ctx.producers, ctx.productionCountries)
  const cats = categoryRefs(ctx.relatedCategorySlugs, ctx.relatedCategoryLabels)
  const products = productRefs(ctx)
  const brandList = joinList(ctx.brands.slice(0, 3), "nl")
  const countryList = joinList(ctx.productionCountries.slice(0, 3), "nl")

  const link = (
    id: string,
    href: string,
    labelLs: LocalizedString,
    targetType: AiInternalLink["targetType"],
    targetId: string
  ): AiInternalLink => ({
    id,
    kind: "see_also",
    label: labelLs,
    href,
    targetType,
    targetId,
  })

  return [
    {
      id: "look_for",
      icon: "list",
      heading: LS(
        "Waar moet je op letten?",
        "What should you look for?",
        "Worauf sollten Sie achten?",
        "Que faut-il vérifier ?"
      ),
      intro: LS(
        `Bij ${label} bepalen ${t0}, ${t1} en ${t2} of een product echt bij jouw gebruik past.`,
        `For ${label}, ${t0}, ${t1} and ${t2} decide whether a product fits your use.`,
        `Bei ${label} entscheiden ${t0}, ${t1} und ${t2} über die Passung.`,
        `Pour ${label}, ${t0}, ${t1} et ${t2} déterminent si le produit convient.`
      ),
      paragraphs: [
        LS(
          `Begin met je gebruiksscenario: intensief of occasioneel. Daarna filter je op ${t0} en ${t1}.`,
          `Start with your use case: intensive or occasional. Then filter on ${t0} and ${t1}.`,
          `Beginnen Sie mit dem Nutzungsszenario. Filtern Sie danach nach ${t0} und ${t1}.`,
          `Commencez par votre usage. Filtrez ensuite sur ${t0} et ${t1}.`
        ),
        LS(
          `Product Cloud-kenmerken (specificaties) en Commerce Cloud-prijzen zijn gescheiden — vergelijk eerst eigenschappen, dan de totale aanbieding.`,
          `Product Cloud attributes and Commerce Cloud prices are separate — compare specs first, then the total offer.`,
          `Product Cloud und Commerce Cloud bleiben getrennt — erst Eigenschaften, dann Gesamtangebot.`,
          `Product Cloud et Commerce Cloud restent séparés — d’abord les specs, puis l’offre totale.`
        ),
        LS(
          countryList
            ? `Herkomst telt: in dit aanbod zie je o.a. productie uit ${countryList}.`
            : `Herkomst telt: kies Europese productie waar mogelijk.`,
          countryList
            ? `Origin matters: this assortment includes production from ${joinList(ctx.productionCountries.slice(0, 3), "en")}.`
            : `Origin matters: prefer European production where possible.`,
          countryList
            ? `Herkunft zählt: u. a. Produktion aus ${joinList(ctx.productionCountries.slice(0, 3), "de")}.`
            : `Herkunft zählt: bevorzugen Sie europäische Produktion.`,
          countryList
            ? `L’origine compte : production p. ex. en ${joinList(ctx.productionCountries.slice(0, 3), "fr")}.`
            : `L’origine compte : privilégiez la production européenne.`
        ),
        LS(
          `Verified™ helpt om betrouwbare productinformatie te herkennen voordat je retailers vergelijkt.`,
          `Verified™ helps recognise trustworthy product information before comparing retailers.`,
          `Verified™ hilft, vertrauenswürdige Produktinfos zu erkennen.`,
          `Verified™ aide à reconnaître des infos produit fiables.`
        ),
      ],
      bullets: [
        LS(`Prioriteer ${t0}`, `Prioritise ${t0}`, `Priorisieren Sie ${t0}`, `Priorisez ${t0}`),
        LS(`Check ${t1} en productieland`, `Check ${t1} and country`, `Prüfen Sie ${t1}`, `Vérifiez ${t1}`),
        LS(`Vergelijk totale aanbieding`, `Compare total offer`, `Gesamtangebot vergleichen`, `Comparer l’offre totale`),
      ],
      tips: [
        LS(
          "Open meerdere productpagina’s naast elkaar om specificaties te spiegelen.",
          "Open several product pages side by side to mirror specs.",
          "Öffnen Sie mehrere Produktseiten parallel.",
          "Ouvrez plusieurs pages produit côte à côte."
        ),
      ],
      warnings: [
        LS(
          "Laagste prijs is niet automatisch de beste deal — levertijd en service wegen mee.",
          "Lowest price is not automatically the best deal — delivery and service matter.",
          "Der niedrigste Preis ist nicht automatisch das beste Angebot.",
          "Le prix le plus bas n’est pas automatiquement la meilleure offre."
        ),
      ],
      commonMistakes: [
        LS(
          `Alleen op merknaam kiezen zonder ${t0} te vergelijken.`,
          `Choosing by brand name only without comparing ${t0}.`,
          `Nur nach Marke wählen, ohne ${t0} zu vergleichen.`,
          `Choisir uniquement la marque sans comparer ${t0}.`
        ),
      ],
      advice: LS(
        `Maak een shortlist van 2–3 producten die ${t0} en ${t2} goed scoren, en kies daarna via de Buy Box.`,
        `Shortlist 2–3 products that score well on ${t0} and ${t2}, then pick via the Buy Box.`,
        `Erstellen Sie eine Shortlist von 2–3 Produkten und wählen Sie über die Buy Box.`,
        `Faites une shortlist de 2–3 produits, puis choisissez via la Buy Box.`
      ),
      callouts: [
        {
          id: "tip_look",
          kind: "tip",
          title: LS("Tip", "Tip", "Tipp", "Astuce"),
          body: LS(
            `Filter eerst op ${t0}, daarna op productieland — zo blijft de lijst overzichtelijk.`,
            `Filter on ${t0} first, then country — keeps the list readable.`,
            `Zuerst nach ${t0} filtern, dann Herkunftsland.`,
            `Filtrez d’abord sur ${t0}, puis le pays.`
          ),
        },
      ],
      checklist: [
        LS("Gebruik vastgelegd", "Use case set", "Nutzung geklärt", "Usage défini"),
        LS(`${t0} vergeleken`, `${t0} compared`, `${t0} verglichen`, `${t0} comparé`),
        LS("Verified™ gecheckt", "Verified™ checked", "Verified™ geprüft", "Verified™ vérifié"),
      ],
      comparisonRows: [
        {
          label: LS("Focus", "Focus", "Fokus", "Focus"),
          optionA: LS(`Hoog ${t0}`, `High ${t0}`, `Hohes ${t0}`, `Haut ${t0}`),
          optionB: LS("Balans prijs/kwaliteit", "Price/quality balance", "Preis/Leistung", "Rapport qualité/prix"),
        },
        {
          label: LS("Voor wie", "For whom", "Für wen", "Pour qui"),
          optionA: LS("Intensief gebruik", "Intensive use", "Intensivnutzung", "Usage intensif"),
          optionB: LS("Dagelijks / thuis", "Daily / home", "Alltag / Zuhause", "Quotidien / maison"),
        },
      ],
      relatedLinks: cats.slice(0, 2).map((c, i) =>
        link(`look_link_${i}`, c.href, c.label, "category", c.slug)
      ),
      relatedProducers: producers.slice(0, 2),
      relatedBrands: brands.slice(0, 2),
      relatedCategories: cats.slice(0, 2),
      relatedProducts: products.slice(0, 2),
      body: LS(
        `Let bij ${label} op ${t0}, ${t1} en ${t2}.`,
        `For ${label}, focus on ${t0}, ${t1} and ${t2}.`,
        `Bei ${label} auf ${t0}, ${t1} und ${t2} achten.`,
        `Pour ${label}, priorisez ${t0}, ${t1} et ${t2}.`
      ),
    },
    {
      id: "differences",
      icon: "compare",
      heading: LS(
        "Welke verschillen bestaan er?",
        "What differences exist?",
        "Welche Unterschiede gibt es?",
        "Quelles différences existent ?"
      ),
      intro: LS(
        brandList
          ? `Merken zoals ${brandList} verschillen vooral op ${t0} en service.`
          : `Verschillen zitten vooral in ${t0}, materialen en service.`,
        brandList
          ? `Brands such as ${joinList(ctx.brands.slice(0, 3), "en")} differ mainly on ${t0} and service.`
          : `Differences are mainly in ${t0}, materials and service.`,
        `Unterschiede liegen vor allem bei ${t0} und Service.`,
        `Les différences portent surtout sur ${t0} et le service.`
      ),
      paragraphs: [
        LS(
          `Instapmodellen optimaliseren vaak prijs; premiummodellen ${t0} en ${t3}.`,
          `Entry models often optimise price; premium models ${t0} and ${t3}.`,
          `Einstiegsmodelle optimieren Preis; Premiummodelle ${t0}.`,
          `Les modèles d’entrée optimisent le prix ; le premium mise sur ${t0}.`
        ),
        LS(
          `Lees Product Cloud-attributen vóór Commerce Cloud-prijzen — zo vergelijk je appels met appels.`,
          `Read Product Cloud attributes before Commerce Cloud prices — compare like with like.`,
          `Lesen Sie Product-Cloud-Attribute vor Commerce-Cloud-Preisen.`,
          `Lisez les attributs Product Cloud avant les prix Commerce Cloud.`
        ),
        LS(
          `Retailers kunnen op levertijd en service verschillen, ook bij hetzelfde product.`,
          `Retailers can differ on delivery and service even for the same product.`,
          `Händler können sich bei Lieferzeit und Service unterscheiden.`,
          `Les détaillants peuvent différer sur délai et service.`
        ),
      ],
      bullets: ctx.focusTopics.slice(0, 5).map((topic) =>
        LS(
          `${topic}: beslis-criterium`,
          `${topic}: decision criterion`,
          `${topic}: Entscheidungskriterium`,
          `${topic} : critère de décision`
        )
      ),
      tips: [
        LS(
          "Noteer per model één ‘must-have’ en één ‘nice-to-have’.",
          "Note one must-have and one nice-to-have per model.",
          "Notieren Sie ein Must-have und ein Nice-to-have.",
          "Notez un must-have et un nice-to-have par modèle."
        ),
      ],
      warnings: [],
      commonMistakes: [
        LS(
          "Specificaties van verschillende generaties door elkaar halen.",
          "Mixing specs from different generations.",
          "Spezifikationen verschiedener Generationen vermischen.",
          "Mélanger les specs de générations différentes."
        ),
      ],
      advice: LS(
        "Kies het model dat jouw top-2 criteria wint — niet het model met de langste featurelijst.",
        "Pick the model that wins your top-2 criteria — not the longest feature list.",
        "Wählen Sie das Modell, das Ihre Top-2-Kriterien gewinnt.",
        "Choisissez le modèle qui gagne vos 2 critères clés."
      ),
      callouts: [
        {
          id: "hl_diff",
          kind: "highlight",
          title: LS("Vergelijking", "Comparison", "Vergleich", "Comparaison"),
          body: LS(
            `Zet ${t0} en ${t1} naast elkaar in een checklist voordat je prijzen opent.`,
            `Put ${t0} and ${t1} side by side in a checklist before opening prices.`,
            `Stellen Sie ${t0} und ${t1} gegenüber, bevor Sie Preise öffnen.`,
            `Mettez ${t0} et ${t1} côte à côte avant d’ouvrir les prix.`
          ),
        },
      ],
      checklist: [
        LS("Modellen genoteerd", "Models listed", "Modelle notiert", "Modèles listés"),
        LS("Criteria gewogen", "Criteria weighed", "Kriterien gewichtet", "Critères pondérés"),
      ],
      comparisonRows: [
        {
          label: LS(t0, t0, t0, t0),
          optionA: LS("Hoog", "High", "Hoch", "Élevé"),
          optionB: LS("Voldoende", "Adequate", "Ausreichend", "Suffisant"),
        },
        {
          label: LS(t1, t1, t1, t1),
          optionA: LS("EU-prioriteit", "EU priority", "EU-Priorität", "Priorité UE"),
          optionB: LS("Flexibel", "Flexible", "Flexibel", "Flexible"),
        },
      ],
      relatedLinks: brands.slice(0, 2).map((b, i) =>
        link(`diff_brand_${i}`, b.href, b.label, "brand", b.slug)
      ),
      relatedProducers: producers.slice(0, 2),
      relatedBrands: brands.slice(0, 3),
      relatedCategories: cats.slice(0, 1),
      relatedProducts: products.slice(0, 2),
      body: LS(
        `Verschillen bij ${label} zitten vooral in ${t0} en service.`,
        `Differences in ${label} are mainly in ${t0} and service.`,
        `Unterschiede bei ${label} liegen bei ${t0} und Service.`,
        `Les différences pour ${label} portent sur ${t0} et le service.`
      ),
    },
    {
      id: "compare_sellers",
      icon: "star",
      heading: LS(
        "Hoe vergelijk je aanbieders?",
        "How do you compare sellers?",
        "Wie vergleichen Sie Anbieter?",
        "Comment comparer les vendeurs ?"
      ),
      intro: LS(
        "EuropMade verkoopt zelf niets. Officiële retailers concurreren op totale waarde.",
        "EuropMade never sells itself. Official retailers compete on total value.",
        "EuropMade verkauft selbst nichts. Offizielle Händler konkurrieren um Gesamtwert.",
        "EuropMade ne vend rien. Les détaillants officiels concurrent sur la valeur totale."
      ),
      paragraphs: [
        LS(
          "Op de productpagina zie je alle officiële aanbieders. De Buy Box kiest de beste totale aanbieding — nooit gesponsord.",
          "On the product page you see all official sellers. The Buy Box picks the best total offer — never sponsored.",
          "Auf der Produktseite sehen Sie alle offiziellen Anbieter. Die Buy Box ist nie gesponsert.",
          "Sur la page produit, tous les vendeurs officiels. La Buy Box n’est jamais sponsorisée."
        ),
        LS(
          "Weeg prijs, levertijd, reviews en Verified™ samen — niet één factor.",
          "Weigh price, delivery, reviews and Verified™ together — not a single factor.",
          "Gewichten Sie Preis, Lieferzeit, Reviews und Verified™ gemeinsam.",
          "Pesez prix, délai, avis et Verified™ ensemble."
        ),
        LS(
          "Productinformatie blijft in de Product Cloud; prijzen en voorraad in de Commerce Cloud.",
          "Product information stays in the Product Cloud; prices and stock in the Commerce Cloud.",
          "Produktinfos bleiben in der Product Cloud; Preise in der Commerce Cloud.",
          "Les infos produit restent dans la Product Cloud ; prix dans la Commerce Cloud."
        ),
      ],
      bullets: [
        LS("Buy Box = beste totale deal", "Buy Box = best total deal", "Buy Box = bestes Gesamtangebot", "Buy Box = meilleure offre totale"),
        LS("Nooit gesponsorde ranking", "Never sponsored ranking", "Nie gesponsertes Ranking", "Jamais de classement sponsorisé"),
      ],
      tips: [
        LS(
          "Bewaar je favoriete aanbieder pas nadat specificaties kloppen.",
          "Save a favourite seller only after specs match.",
          "Speichern Sie einen Favoriten erst nach Spec-Check.",
          "Enregistrez un vendeur favori seulement après les specs."
        ),
      ],
      warnings: [
        LS(
          "Negeer geen levertijd bij urgente aankopen.",
          "Don’t ignore delivery time for urgent purchases.",
          "Ignorieren Sie Lieferzeiten bei dringenden Käufen nicht.",
          "N’ignorez pas le délai pour un achat urgent."
        ),
      ],
      commonMistakes: [
        LS(
          "Alleen de Buy Box-winnaar bekijken zonder alternatieven te openen.",
          "Only viewing the Buy Box winner without opening alternatives.",
          "Nur den Buy-Box-Gewinner ansehen.",
          "Ne regarder que le gagnant Buy Box."
        ),
      ],
      advice: LS(
        "Vergelijk minstens twee retailers op totale kosten inclusief levertijd.",
        "Compare at least two retailers on total cost including delivery.",
        "Vergleichen Sie mindestens zwei Händler inkl. Lieferzeit.",
        "Comparez au moins deux détaillants frais et délai inclus."
      ),
      callouts: [
        {
          id: "info_bb",
          kind: "info",
          title: LS("Buy Box", "Buy Box", "Buy Box", "Buy Box"),
          body: LS(
            "De ranking volgt jouw voordeel — nooit commissie of advertenties.",
            "Ranking follows your benefit — never commission or ads.",
            "Das Ranking folgt Ihrem Vorteil — nie Provision oder Ads.",
            "Le classement suit votre intérêt — jamais commission ou pubs."
          ),
        },
      ],
      checklist: [
        LS("2+ retailers vergeleken", "2+ retailers compared", "2+ Händler verglichen", "2+ détaillants comparés"),
        LS("Levertijd meegenomen", "Delivery included", "Lieferzeit einbezogen", "Délai inclus"),
      ],
      comparisonRows: [],
      relatedLinks: producers.slice(0, 2).map((p, i) =>
        link(`sell_prod_${i}`, p.href, p.label, "producer", p.slug)
      ),
      relatedProducers: producers.slice(0, 3),
      relatedBrands: brands.slice(0, 1),
      relatedCategories: [],
      relatedProducts: products.slice(0, 2),
      body: LS(
        "Vergelijk officiële aanbieders op totale waarde via de Buy Box.",
        "Compare official sellers on total value via the Buy Box.",
        "Offizielle Anbieter über die Buy Box vergleichen.",
        "Comparez les vendeurs officiels via la Buy Box."
      ),
    },
    {
      id: "verified_eu",
      icon: "eu",
      heading: LS(
        "Waarom Verified™ en Europees?",
        "Why Verified™ and European?",
        "Warum Verified™ und europäisch?",
        "Pourquoi Verified™ et européen ?"
      ),
      intro: LS(
        `Duidelijke herkomst en gecontroleerde productinformatie maken ${label} betrouwbaarder.`,
        `Clear origin and checked product information make ${label} more trustworthy.`,
        `Klare Herkunft und geprüfte Infos machen ${label} vertrauenswürdiger.`,
        `Une origine claire et des infos contrôlées rendent ${label} plus fiable.`
      ),
      paragraphs: [
        LS(
          `Verified™ betekent dat productinformatie en herkomst zijn gecontroleerd (${Math.round(ctx.verifiedRatio * 100)}% van dit aanbod).`,
          `Verified™ means product information and origin are checked (${Math.round(ctx.verifiedRatio * 100)}% of this assortment).`,
          `Verified™ bedeutet geprüfte Infos (${Math.round(ctx.verifiedRatio * 100)}% dieses Sortiments).`,
          `Verified™ signifie infos contrôlées (${Math.round(ctx.verifiedRatio * 100)}% de cet assortiment).`
        ),
        LS(
          "Europese productie houdt waarde, innovatie en werk dichterbij.",
          "European production keeps value, innovation and jobs closer.",
          "Europäische Produktion hält Wertschöpfung näher.",
          "La production européenne garde la valeur plus proche."
        ),
        LS(
          `Bij ${label} combineer je ${t1} met productielandfilters voor een scherpere shortlist.`,
          `For ${label}, combine ${t1} with country filters for a sharper shortlist.`,
          `Bei ${label} kombinieren Sie ${t1} mit Herkunftsfiltern.`,
          `Pour ${label}, combinez ${t1} et filtres pays.`
        ),
      ],
      bullets: [
        LS("Navolgbare herkomst", "Traceable origin", "Nachvollziehbare Herkunft", "Origine traçable"),
        LS("Geen platformverkoper", "No platform seller", "Kein Plattformverkäufer", "Pas de vendeur plateforme"),
      ],
      tips: [
        LS(
          "Gebruik de productieland-select in de filters om EU-prioriteit te zetten.",
          "Use the production-country select in filters to prioritise the EU.",
          "Nutzen Sie die Herkunftsland-Auswahl in den Filtern.",
          "Utilisez le sélecteur pays de production dans les filtres."
        ),
      ],
      warnings: [],
      commonMistakes: [
        LS(
          "Verified™ verwarren met ‘goedkoopste’.",
          "Confusing Verified™ with ‘cheapest’.",
          "Verified™ mit ‚günstigste‘ verwechseln.",
          "Confondre Verified™ avec « le moins cher »."
        ),
      ],
      advice: LS(
        "Kies Verified™ waar beschikbaar, en check daarna pas de Buy Box.",
        "Prefer Verified™ where available, then check the Buy Box.",
        "Verified™ bevorzugen, dann Buy Box prüfen.",
        "Préférez Verified™ si disponible, puis la Buy Box."
      ),
      callouts: [
        {
          id: "warn_v",
          kind: "warning",
          title: LS("Let op", "Note", "Hinweis", "Attention"),
          body: LS(
            "Verified™ garandeert gecontroleerde info — geen automatische ‘beste prijs’.",
            "Verified™ guarantees checked info — not an automatic best price.",
            "Verified™ garantiert geprüfte Infos — nicht automatisch den besten Preis.",
            "Verified™ garantit des infos contrôlées — pas un meilleur prix automatique."
          ),
        },
      ],
      checklist: [
        LS("Verified™ gefilterd", "Verified™ filtered", "Verified™ gefiltert", "Verified™ filtré"),
        LS("Land gekozen", "Country chosen", "Land gewählt", "Pays choisi"),
      ],
      comparisonRows: [],
      relatedLinks: [],
      relatedProducers: producers.slice(0, 2),
      relatedBrands: brands.slice(0, 2),
      relatedCategories: cats.slice(0, 2),
      relatedProducts: [],
      body: LS(
        `Verified™ en Europese herkomst maken ${label} navolgbaarder.`,
        `Verified™ and European origin make ${label} more traceable.`,
        `Verified™ und europäische Herkunft machen ${label} nachvollziehbarer.`,
        `Verified™ et l’origine européenne rendent ${label} plus traçable.`
      ),
    },
    {
      id: "care",
      icon: "care",
      heading: LS(
        "Onderhoud, garantie en duurzaamheid",
        "Care, warranty and sustainability",
        "Pflege, Garantie und Nachhaltigkeit",
        "Entretien, garantie et durabilité"
      ),
      intro: LS(
        `Plan onderhoud rond ${t2} en controleer garantie per retailer.`,
        `Plan care around ${t2} and check warranty per retailer.`,
        `Planen Sie Pflege rund um ${t2} und prüfen Sie die Garantie.`,
        `Planifiez l’entretien autour de ${t2} et vérifiez la garantie.`
      ),
      paragraphs: [
        LS(
          `Duurzaam kiezen bij ${label} betekent: reparabel, langdurig en met duidelijke herkomst.`,
          `Sustainable ${label} means repairable, long-lasting and clear origin.`,
          `Nachhaltige ${label}: reparierbar, langlebig, klare Herkunft.`,
          `${label} durable : réparable, durable, origine claire.`
        ),
        LS(
          "Garantievoorwaarden staan per aanbieder op de productpagina — lees ze vóór aankoop.",
          "Warranty terms sit per seller on the product page — read before buying.",
          "Garantiebedingungen stehen je Anbieter auf der Produktseite.",
          "La garantie est par vendeur sur la page produit."
        ),
        LS(
          `Voor ${t3}: bewaar aankoopbewijs en productinformatie uit de Product Cloud.`,
          `For ${t3}: keep proof of purchase and Product Cloud information.`,
          `Für ${t3}: Kaufbeleg und Product-Cloud-Infos behalten.`,
          `Pour ${t3} : conservez preuve d’achat et infos Product Cloud.`
        ),
      ],
      bullets: [
        LS("Onderhoudsschema", "Care schedule", "Pflegeplan", "Planning d’entretien"),
        LS("Garantie per retailer", "Warranty per retailer", "Garantie je Händler", "Garantie par détaillant"),
        LS("Reparatie prefereren", "Prefer repair", "Reparatur bevorzugen", "Préférer la réparation"),
      ],
      tips: [
        LS(
          "Kies liever één duurzaam model dan twee wegwerpalternatieven.",
          "Prefer one durable model over two disposable alternatives.",
          "Lieber ein langlebiges Modell als zwei Wegwerfprodukte.",
          "Préférez un modèle durable à deux alternatives jetables."
        ),
      ],
      warnings: [
        LS(
          "Sla geen onderhoud over — dat verkort vaak de levensduur sneller dan intensief gebruik.",
          "Don’t skip care — it often shortens lifespan faster than heavy use.",
          "Pflege nicht auslassen — verkürzt die Lebensdauer oft stärker als Intensivnutzung.",
          "Ne sautez pas l’entretien — cela raccourcit souvent la durée de vie."
        ),
      ],
      commonMistakes: [
        LS(
          "Garantie claimen zonder productinformatie te bewaren.",
          "Claiming warranty without keeping product information.",
          "Garantie ohne Produktinfos reklamieren.",
          "Réclamer la garantie sans garder les infos produit."
        ),
      ],
      advice: LS(
        `Neem ${t2} mee in je shortlist — niet alleen als ‘extra’.`,
        `Include ${t2} in your shortlist — not only as a bonus.`,
        `Nehmen Sie ${t2} in die Shortlist auf.`,
        `Incluez ${t2} dans votre shortlist.`
      ),
      callouts: [
        {
          id: "tip_care",
          kind: "tip",
          title: LS("Duurzaamheid", "Sustainability", "Nachhaltigkeit", "Durabilité"),
          body: LS(
            "Langere levensduur + EU-herkomst = lagere impact per gebruiksjaar.",
            "Longer lifespan + EU origin = lower impact per year of use.",
            "Längere Lebensdauer + EU-Herkunft = geringere Wirkung pro Jahr.",
            "Durée de vie + origine UE = impact plus faible par année d’usage."
          ),
        },
      ],
      checklist: [
        LS("Onderhoud gepland", "Care planned", "Pflege geplant", "Entretien planifié"),
        LS("Garantie gelezen", "Warranty read", "Garantie gelesen", "Garantie lue"),
      ],
      comparisonRows: [],
      relatedLinks: cats.slice(0, 1).map((c, i) =>
        link(`care_cat_${i}`, c.href, c.label, "category", c.slug)
      ),
      relatedProducers: producers.slice(0, 1),
      relatedBrands: brands.slice(0, 1),
      relatedCategories: cats.slice(0, 2),
      relatedProducts: products.slice(0, 1),
      body: LS(
        `Onderhoud, garantie en ${t2} horen bij een bewuste ${label}-keuze.`,
        `Care, warranty and ${t2} belong to a deliberate ${label} choice.`,
        `Pflege, Garantie und ${t2} gehören zur ${label}-Entscheidung.`,
        `Entretien, garantie et ${t2} font partie d’un choix ${label} réfléchi.`
      ),
    },
  ]
}

export { brandRefs, producerRefs, categoryRefs, productRefs, joinList }
