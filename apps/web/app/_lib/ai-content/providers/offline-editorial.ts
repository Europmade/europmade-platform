/**
 * Category-specific editorial blocks, discovery rails, Product Cloud insights.
 * Signal-driven offline generation — never page load.
 */

import { L, type LocalizedString } from "../../i18n/locales"
import { CATEGORY_PRODUCT_KIND } from "../../product-mockup"
import type {
  AiContentAnalysisContext,
  AiDiscoveryCard,
  AiDiscoveryRail,
  AiEditorialBlock,
  AiImportanceRow,
  AiProductCloudInsight,
  AiTopicVisual,
} from "../types"
import {
  brandRefs,
  buildDiscoveryCards,
  categoryRefs,
  producerRefs,
  productRefs,
} from "./offline-rich"

function LS(nl: string, en: string, de: string, fr: string): LocalizedString {
  return L(nl, en, de, fr)
}

const TOPIC_IMAGE: Record<string, string> = {
  processor: "laptop",
  geheugen: "laptop",
  scherm: "laptop",
  batterij: "headphones",
  gewicht: "backpack",
  draadloos: "headphones",
  bluetooth: "headphones",
  "usb-c": "accessory",
  energieklasse: "lamp",
  maaibreedte: "garden",
  accu: "garden",
  oppervlakte: "garden",
  elektrisch: "garden",
  materiaal: "chair",
  kleur: "fashion",
  maat: "fashion",
  pasvorm: "fashion",
  biologisch: "food",
  zuigkracht: "vacuum",
  lichtsterkte: "lamp",
}

function topicImage(topic: string, categorySlug: string): string {
  const key = topic.toLowerCase()
  return TOPIC_IMAGE[key] ?? CATEGORY_PRODUCT_KIND[categorySlug] ?? "coffee"
}

export function buildTopicVisuals(
  ctx: AiContentAnalysisContext
): AiTopicVisual[] {
  return ctx.focusTopics.slice(0, 6).map((topic, i) => {
    const score = Math.max(2, 5 - (i % 4))
    return {
      id: `tv_${i}_${topic}`,
      topic: LS(
        topic.charAt(0).toUpperCase() + topic.slice(1),
        topic.charAt(0).toUpperCase() + topic.slice(1),
        topic.charAt(0).toUpperCase() + topic.slice(1),
        topic.charAt(0).toUpperCase() + topic.slice(1)
      ),
      imageKind: topicImage(topic, ctx.entityId),
      imageSrc: null,
      caption: LS(
        `Let op ${topic} bij ${ctx.label}`,
        `Watch ${topic} for ${ctx.label}`,
        `Achten Sie auf ${topic} bei ${ctx.label}`,
        `Surveillez ${topic} pour ${ctx.label}`
      ),
      importance: score,
    }
  })
}

export function buildImportanceRows(
  ctx: AiContentAnalysisContext
): AiImportanceRow[] {
  return ctx.focusTopics.slice(0, 5).map((topic, i) => {
    const score = Math.max(2, 5 - i)
    return {
      id: `imp_${i}`,
      label: LS(
        topic.charAt(0).toUpperCase() + topic.slice(1),
        topic.charAt(0).toUpperCase() + topic.slice(1),
        topic.charAt(0).toUpperCase() + topic.slice(1),
        topic.charAt(0).toUpperCase() + topic.slice(1)
      ),
      score,
      barPercent: score * 20,
    }
  })
}

export function buildProductCloudInsights(
  ctx: AiContentAnalysisContext
): AiProductCloudInsight[] {
  const avgRating =
    ctx.products.length > 0
      ? (
          ctx.products.reduce((s, p) => s + p.rating, 0) / ctx.products.length
        ).toFixed(1)
      : "—"
  const topBrand = ctx.brands[0] ?? "—"
  const insights: AiProductCloudInsight[] = [
    {
      id: "pc_producers",
      key: "producer_count",
      label: LS("Producenten", "Producers", "Produzenten", "Producteurs"),
      value: LS(
        String(ctx.producers.length || ctx.productCount),
        String(ctx.producers.length || ctx.productCount),
        String(ctx.producers.length || ctx.productCount),
        String(ctx.producers.length || ctx.productCount)
      ),
      unit: null,
      source: "signal-estimate",
    },
    {
      id: "pc_countries",
      key: "eu_countries",
      label: LS("EU-landen", "EU countries", "EU-Länder", "Pays UE"),
      value: LS(
        String(Math.max(ctx.productionCountries.length, 1)),
        String(Math.max(ctx.productionCountries.length, 1)),
        String(Math.max(ctx.productionCountries.length, 1)),
        String(Math.max(ctx.productionCountries.length, 1))
      ),
      unit: null,
      source: "signal-estimate",
    },
    {
      id: "pc_rating",
      key: "avg_rating",
      label: LS(
        "Gem. beoordeling",
        "Avg. rating",
        "Ø Bewertung",
        "Note moy."
      ),
      value: LS(avgRating, avgRating, avgRating, avgRating),
      unit: LS("/ 5", "/ 5", "/ 5", "/ 5"),
      source: "signal-estimate",
    },
    {
      id: "pc_brand",
      key: "top_brand",
      label: LS(
        "Meest gezien merk",
        "Most seen brand",
        "Häufigste Marke",
        "Marque la plus vue"
      ),
      value: LS(topBrand, topBrand, topBrand, topBrand),
      unit: null,
      source: "signal-estimate",
    },
    {
      id: "pc_verified",
      key: "verified_share",
      label: LS("Verified™ aandeel", "Verified™ share", "Verified™-Anteil", "Part Verified™"),
      value: LS(
        `${Math.round(ctx.verifiedRatio * 100)}%`,
        `${Math.round(ctx.verifiedRatio * 100)}%`,
        `${Math.round(ctx.verifiedRatio * 100)}%`,
        `${Math.round(ctx.verifiedRatio * 100)}%`
      ),
      unit: null,
      source: "signal-estimate",
    },
  ]

  const topic = ctx.focusTopics[0]
  if (topic) {
    insights.push({
      id: "pc_focus",
      key: `focus_${topic}`,
      label: LS(
        `Meest relevant: ${topic}`,
        `Most relevant: ${topic}`,
        `Relevantestes: ${topic}`,
        `Le plus pertinent : ${topic}`
      ),
      value: LS("Hoog", "High", "Hoch", "Élevé"),
      unit: null,
      source: "product-cloud",
    })
  }

  return insights
}

function railKindsForCategory(slug: string): {
  kind: AiDiscoveryRail["kind"]
  layout: AiDiscoveryRail["layout"]
  title: LocalizedString
}[] {
  const base = [
    {
      kind: "maybe_interesting" as const,
      layout: "image_cards" as const,
      title: LS(
        "Misschien interessant",
        "You may also like",
        "Vielleicht interessant",
        "Peut aussi vous plaire"
      ),
    },
    {
      kind: "popular_brands" as const,
      layout: "logo_row" as const,
      title: LS(
        "Populaire merken",
        "Popular brands",
        "Beliebte Marken",
        "Marques populaires"
      ),
    },
    {
      kind: "new_producers" as const,
      layout: "logo_row" as const,
      title: LS(
        "Nieuwe producenten",
        "New producers",
        "Neue Produzenten",
        "Nouveaux producteurs"
      ),
    },
    {
      kind: "bought_together" as const,
      layout: "product_cards" as const,
      title: LS(
        "Vaak samen gekocht",
        "Frequently bought together",
        "Häufig zusammen gekauft",
        "Souvent achetés ensemble"
      ),
    },
  ]

  if (slug === "elektronica" || slug === "kantoor") {
    return [
      ...base,
      {
        kind: "compare_category",
        layout: "category_banners",
        title: LS(
          "Vergelijk deze categorie",
          "Compare this category",
          "Diese Kategorie vergleichen",
          "Comparer cette catégorie"
        ),
      },
      {
        kind: "accessories",
        layout: "image_cards",
        title: LS("Accessoires", "Accessories", "Zubehör", "Accessoires"),
      },
    ]
  }
  if (slug === "mode" || slug === "schoenen") {
    return [
      base[0]!,
      base[1]!,
      {
        kind: "materials",
        layout: "image_cards",
        title: LS("Materialen & pasvorm", "Materials & fit", "Material & Passform", "Matières & coupe"),
      },
      {
        kind: "new_collections",
        layout: "category_banners",
        title: LS("Nieuwe collecties", "New collections", "Neue Kollektionen", "Nouvelles collections"),
      },
      base[3]!,
    ]
  }
  if (slug === "tuin" || slug === "outdoor") {
    return [
      base[0]!,
      {
        kind: "season",
        layout: "category_banners",
        title: LS("Seizoen & toepassingen", "Season & uses", "Saison & Einsatz", "Saison & usages"),
      },
      {
        kind: "applications",
        layout: "image_cards",
        title: LS("Machines & accessoires", "Machines & accessories", "Maschinen & Zubehör", "Machines & accessoires"),
      },
      base[2]!,
      base[3]!,
    ]
  }
  return [
    ...base,
    {
      kind: "alternatives",
      layout: "image_cards",
      title: LS("Alternatieven", "Alternatives", "Alternativen", "Alternatives"),
    },
    {
      kind: "most_viewed",
      layout: "product_cards",
      title: LS("Meest bekeken", "Most viewed", "Meistgesehen", "Les plus vus"),
    },
  ]
}

export function buildDiscoveryRails(
  ctx: AiContentAnalysisContext
): AiDiscoveryRail[] {
  const allCards = buildDiscoveryCards(ctx)
  const cats = categoryRefs(ctx.relatedCategorySlugs, ctx.relatedCategoryLabels)
  const brands = brandRefs(ctx.brands)
  const producers = producerRefs(ctx.producers, ctx.productionCountries)
  const products = productRefs(ctx)

  return railKindsForCategory(ctx.entityId).map((spec, idx) => {
    let cards: AiDiscoveryCard[] = []
    switch (spec.kind) {
      case "popular_brands":
        cards = brands.slice(0, 4).map((b) => ({
          id: `rail_brand_${b.slug}`,
          type: "brand" as const,
          title: b.label,
          href: b.href,
          logoKey: b.logoKey,
          productCount: b.productCount,
          badge: LS("Merk", "Brand", "Marke", "Marque"),
        }))
        break
      case "new_producers":
        cards = producers.slice(0, 4).map((p) => ({
          id: `rail_prod_${p.slug}`,
          type: "producer" as const,
          title: p.label,
          subtitle: p.countryLabel,
          href: p.href,
          logoKey: p.logoKey,
          countryLabel: p.countryLabel,
          productCount: p.productCount,
        }))
        break
      case "bought_together":
      case "most_viewed":
        cards = products.slice(0, 4).map((p) => ({
          id: `rail_p_${p.id}`,
          type: "product" as const,
          title: p.label,
          href: p.href,
          imageKind: p.imageKind,
          badge:
            spec.kind === "bought_together"
              ? LS("Samen", "Together", "Zusammen", "Ensemble")
              : LS("Populair", "Popular", "Beliebt", "Populaire"),
        }))
        break
      case "compare_category":
      case "new_collections":
      case "season":
      case "alternatives":
      case "maybe_interesting":
      case "accessories":
      case "materials":
      case "applications": {
        const source =
          cats.length > 0
            ? cats.slice(0, 4)
            : allCards
                .filter(
                  (c) => c.type === "category" || c.type === "collection"
                )
                .slice(0, 4)
        cards = source.map((c, i) => {
          if ("type" in c && typeof c.type === "string") {
            return {
              ...(c as AiDiscoveryCard),
              type:
                spec.layout === "category_banners"
                  ? ("banner" as const)
                  : (c as AiDiscoveryCard).type,
            }
          }
          const cat = c as (typeof cats)[number]
          return {
            id: `rail_cat_${cat.slug}_${i}`,
            type:
              spec.layout === "category_banners"
                ? ("banner" as const)
                : ("category" as const),
            title: cat.label,
            href: cat.href,
            imageKind: cat.imageKind,
            productCount: cat.productCount,
            badge: LS("Categorie", "Category", "Kategorie", "Catégorie"),
          }
        })
        break
      }
    }

    return {
      id: `rail_${spec.kind}_${idx}`,
      kind: spec.kind,
      layout: spec.layout,
      title: spec.title,
      subtitle: null,
      cards,
    }
  })
}

export function buildEditorialBlocks(
  ctx: AiContentAnalysisContext,
  extras: {
    benefits: LocalizedString[]
    drawbacks: LocalizedString[]
    comparison: LocalizedString
    maintenance: LocalizedString
    sustainability: LocalizedString
    buyingAdvice: LocalizedString
    whatToLookFor: LocalizedString
    intro: LocalizedString
  }
): AiEditorialBlock[] {
  const label = ctx.label
  const t0 = ctx.focusTopics[0] ?? "kwaliteit"
  const topics = buildTopicVisuals(ctx)
  const importance = buildImportanceRows(ctx)
  const cats = categoryRefs(ctx.relatedCategorySlugs, ctx.relatedCategoryLabels)
  const brands = brandRefs(ctx.brands)

  const linkCat = cats[0]
  const linkBrand = brands[0]

  return [
    {
      id: "ed_intro",
      kind: "intro",
      icon: "list",
      heading: LS(`Koopgids ${label}`, `${label} buying guide`, `Kaufguide ${label}`, `Guide d’achat ${label}`),
      intro: extras.intro,
      paragraphs: [
        extras.intro,
        LS(
          `Deze gids is opgebouwd uit losse contentblokken — gebaseerd op het actuele aanbod en signalen zoals ${t0}.`,
          `This guide is built from separate content blocks — grounded in live assortment signals such as ${t0}.`,
          `Dieser Guide besteht aus einzelnen Content-Blöcken — basierend auf Signalen wie ${t0}.`,
          `Ce guide est composé de blocs distincts — basés sur des signaux comme ${t0}.`
        ),
      ],
      richParagraphs: linkCat
        ? [
            LS(
              `Bekijk ook onze {{link:rel_cat}} of vergelijk eerst {{link:rel_brand}}.`,
              `Also see our {{link:rel_cat}} or compare {{link:rel_brand}} first.`,
              `Sehen Sie auch {{link:rel_cat}} oder vergleichen Sie zuerst {{link:rel_brand}}.`,
              `Voir aussi {{link:rel_cat}} ou comparez d’abord {{link:rel_brand}}.`
            ),
          ]
        : [],
      links: [
        ...(linkCat
          ? [
              {
                id: "rel_cat",
                label: linkCat.label,
                href: linkCat.href,
              },
            ]
          : []),
        ...(linkBrand
          ? [
              {
                id: "rel_brand",
                label: linkBrand.label,
                href: linkBrand.href,
              },
            ]
          : []),
      ],
    },
    {
      id: "ed_features",
      kind: "key_features",
      icon: "check",
      heading: LS(
        "Belangrijkste eigenschappen",
        "Key features",
        "Wichtigste Eigenschaften",
        "Caractéristiques clés"
      ),
      bullets: ctx.focusTopics.slice(0, 6).map((topic) =>
        LS(
          `${topic.charAt(0).toUpperCase()}${topic.slice(1)} als besliscriterium`,
          `${topic.charAt(0).toUpperCase()}${topic.slice(1)} as decision criterion`,
          `${topic.charAt(0).toUpperCase()}${topic.slice(1)} als Kriterium`,
          `${topic.charAt(0).toUpperCase()}${topic.slice(1)} comme critère`
        )
      ),
    },
    {
      id: "ed_importance",
      kind: "importance",
      icon: "star",
      heading: LS("Belangrijkheid", "Importance", "Wichtigkeit", "Importance"),
      intro: LS(
        "AI-inschatting op basis van filters en productsignalen (Product Cloud later).",
        "AI estimate from filters and product signals (Product Cloud later).",
        "KI-Schätzung aus Filtern und Produktsignalen.",
        "Estimation IA à partir des filtres et signaux produit."
      ),
      importanceRows: importance,
    },
    {
      id: "ed_topics",
      kind: "topic_visual",
      icon: "compare",
      heading: LS(
        "Visuele eigenschappen",
        "Visual attributes",
        "Visuelle Eigenschaften",
        "Attributs visuels"
      ),
      topicVisuals: topics,
    },
    {
      id: "ed_look",
      kind: "look_for",
      icon: "list",
      heading: LS(
        "Waar moet je op letten?",
        "What should you look for?",
        "Worauf achten?",
        "Points de vigilance"
      ),
      intro: extras.whatToLookFor,
      paragraphs: [extras.whatToLookFor],
      bullets: ctx.focusTopics.slice(0, 4).map((t) =>
        LS(`Check ${t}`, `Check ${t}`, `${t} prüfen`, `Vérifier ${t}`)
      ),
      callouts: [
        {
          id: "warn_look",
          kind: "warning",
          title: LS("Let op", "Note", "Hinweis", "Attention"),
          body: LS(
            "Laagste prijs is niet automatisch de beste totale deal.",
            "Lowest price is not automatically the best total deal.",
            "Der niedrigste Preis ist nicht automatisch das beste Angebot.",
            "Le prix le plus bas n’est pas automatiquement la meilleure offre."
          ),
        },
      ],
    },
    {
      id: "ed_tip",
      kind: "expert_tip",
      icon: "star",
      heading: LS("Expert Tip", "Expert tip", "Experten-Tipp", "Conseil d’expert"),
      callouts: [
        {
          id: "tip_expert",
          kind: "tip",
          title: LS("Expert", "Expert", "Experte", "Expert"),
          body: LS(
            `Filter eerst op ${t0}, daarna op productieland en Verified™ — houd je shortlist klein.`,
            `Filter on ${t0} first, then country and Verified™ — keep your shortlist small.`,
            `Zuerst nach ${t0} filtern, dann Herkunft und Verified™.`,
            `Filtrez d’abord sur ${t0}, puis pays et Verified™.`
          ),
        },
      ],
    },
    {
      id: "ed_mistakes",
      kind: "common_mistakes",
      icon: "shield",
      heading: LS(
        "Veelgemaakte fouten",
        "Common mistakes",
        "Häufige Fehler",
        "Erreurs fréquentes"
      ),
      bullets: [
        LS(
          `Alleen op merk kiezen zonder ${t0} te vergelijken.`,
          `Choosing brand only without comparing ${t0}.`,
          `Nur Marke wählen ohne ${t0} zu vergleichen.`,
          `Choisir la marque sans comparer ${t0}.`
        ),
        LS(
          "Buy Box negeren en alleen op prijs sorteren.",
          "Ignoring the Buy Box and sorting by price only.",
          "Buy Box ignorieren und nur nach Preis sortieren.",
          "Ignorer la Buy Box et trier uniquement par prix."
        ),
      ],
    },
    {
      id: "ed_compare",
      kind: "comparison",
      icon: "compare",
      heading: LS("Vergelijking", "Comparison", "Vergleich", "Comparaison"),
      intro: extras.comparison,
      comparisonRows: [
        {
          label: LS(t0, t0, t0, t0),
          optionA: LS("Hoog / premium", "High / premium", "Hoch / Premium", "Élevé / premium"),
          optionB: LS("Balans", "Balanced", "Ausgewogen", "Équilibré"),
        },
        {
          label: LS("Gebruik", "Use", "Nutzung", "Usage"),
          optionA: LS("Intensief", "Intensive", "Intensiv", "Intensif"),
          optionB: LS("Dagelijks", "Daily", "Alltag", "Quotidien"),
        },
      ],
    },
    {
      id: "ed_check",
      kind: "checklist",
      icon: "check",
      heading: LS("Checklist", "Checklist", "Checkliste", "Checklist"),
      checklist: [
        LS("Gebruik vastgelegd", "Use case set", "Nutzung geklärt", "Usage défini"),
        LS(`${t0} vergeleken`, `${t0} compared`, `${t0} verglichen`, `${t0} comparé`),
        LS("Verified™ gecheckt", "Verified™ checked", "Verified™ geprüft", "Verified™ vérifié"),
        LS("Retailers vergeleken", "Retailers compared", "Händler verglichen", "Détaillants comparés"),
      ],
    },
    {
      id: "ed_advice",
      kind: "advice",
      icon: "star",
      heading: LS("Koopadvies", "Buying advice", "Kaufberatung", "Conseils d’achat"),
      paragraphs: [extras.buyingAdvice],
    },
    {
      id: "ed_benefits",
      kind: "benefits",
      icon: "check",
      heading: LS("Voordelen", "Benefits", "Vorteile", "Avantages"),
      bullets: extras.benefits,
    },
    {
      id: "ed_drawbacks",
      kind: "drawbacks",
      icon: "shield",
      heading: LS("Nadelen", "Drawbacks", "Nachteile", "Inconvénients"),
      bullets: extras.drawbacks,
    },
    {
      id: "ed_suitable",
      kind: "suitable_for",
      icon: "eu",
      heading: LS(
        "Voor wie geschikt",
        "Who it’s for",
        "Für wen geeignet",
        "Pour qui"
      ),
      bullets: [
        LS(
          `Wie ${t0} en Europese herkomst serieus neemt.`,
          `Anyone who takes ${t0} and European origin seriously.`,
          `Wer ${t0} und europäische Herkunft ernst nimmt.`,
          `Ceux qui prennent ${t0} et l’origine européenne au sérieux.`
        ),
        LS(
          "Kopers die retailers willen vergelijken zonder gesponsorde ranking.",
          "Buyers who want to compare retailers without sponsored ranking.",
          "Käufer, die Händler ohne gesponsertes Ranking vergleichen wollen.",
          "Acheteurs qui veulent comparer sans classement sponsorisé."
        ),
      ],
    },
    {
      id: "ed_less",
      kind: "less_suitable_for",
      icon: "list",
      heading: LS(
        "Voor wie minder geschikt",
        "Who it’s less for",
        "Weniger geeignet für",
        "Moins adapté pour"
      ),
      bullets: [
        LS(
          "Wie alleen de laagste prijs wil zonder specificaties te lezen.",
          "Anyone who only wants the lowest price without reading specs.",
          "Wer nur den niedrigsten Preis will ohne Specs zu lesen.",
          "Ceux qui veulent seulement le prix le plus bas sans lire les specs."
        ),
      ],
    },
    {
      id: "ed_maint",
      kind: "maintenance",
      icon: "care",
      heading: LS("Onderhoud", "Maintenance", "Pflege", "Entretien"),
      paragraphs: [extras.maintenance],
    },
    {
      id: "ed_sust",
      kind: "sustainability",
      icon: "leaf",
      heading: LS("Duurzaamheid", "Sustainability", "Nachhaltigkeit", "Durabilité"),
      paragraphs: [extras.sustainability],
    },
    {
      id: "ed_links",
      kind: "internal_links",
      icon: "list",
      heading: LS("Meer lezen", "Read more", "Weiterlesen", "En savoir plus"),
      links: [
        ...cats.slice(0, 3).map((c) => ({
          id: c.id,
          label: c.label,
          href: c.href,
        })),
        ...brands.slice(0, 2).map((b) => ({
          id: b.id,
          label: b.label,
          href: b.href,
        })),
      ],
      richParagraphs: [
        LS(
          "Meer over Verified™ en Europese productie vind je via de gerelateerde categorieën en merken hieronder.",
          "More about Verified™ and European production via related categories and brands below.",
          "Mehr zu Verified™ und europäischer Produktion über verwandte Kategorien und Marken.",
          "Plus sur Verified™ et la production européenne via les catégories et marques ci-dessous."
        ),
      ],
    },
    {
      id: "ed_summary",
      kind: "summary",
      icon: "check",
      heading: LS("Samenvatting", "Summary", "Zusammenfassung", "Résumé"),
      paragraphs: [
        LS(
          `Kort: vergelijk ${label} op ${t0}, herkomst en Verified™; kies daarna de beste totale aanbieding.`,
          `In short: compare ${label} on ${t0}, origin and Verified™; then pick the best total offer.`,
          `Kurz: vergleichen Sie ${label} nach ${t0}, Herkunft und Verified™.`,
          `En bref : comparez ${label} sur ${t0}, origine et Verified™.`
        ),
      ],
    },
  ]
}
