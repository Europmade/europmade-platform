/**
 * UI chrome messages (NL/EN/DE/FR) — mock until full i18n pipeline.
 */

import {
  L,
  pickLocalized,
  type LocalizedString,
  type StorefrontLocale,
} from "./locales"

const M = {
  language: L("Taal", "Language", "Sprache", "Langue"),
  currency: L("Valuta", "Currency", "Währung", "Devise"),
  languageAndCurrency: L(
    "Taal en valuta",
    "Language and currency",
    "Sprache und Währung",
    "Langue et devise"
  ),
  advertisement: L("Advertentie", "Advertisement", "Anzeige", "Publicité"),
  adSlotAvailable: L(
    "Advertentieruimte beschikbaar",
    "Ad space available",
    "Werbefläche verfügbar",
    "Espace publicitaire disponible"
  ),
  adSlotHint: L(
    "Partners kunnen hier een campagne tonen met kop, omschrijving en call-to-action.",
    "Partners can show a campaign here with headline, copy and call-to-action.",
    "Partner können hier eine Kampagne mit Headline, Text und Call-to-Action zeigen.",
    "Les partenaires peuvent afficher ici une campagne avec titre, texte et appel à l’action."
  ),
  productsSuffix: L("producten", "products", "Produkte", "produits"),
  viewProducer: L(
    "Bekijk producent",
    "View producer",
    "Produzent ansehen",
    "Voir le producteur"
  ),
  position: L("Positie", "Position", "Position", "Position"),
  prevCampaigns: L(
    "Vorige campagnes",
    "Previous campaigns",
    "Vorherige Kampagnen",
    "Campagnes précédentes"
  ),
  nextCampaigns: L(
    "Volgende campagnes",
    "Next campaigns",
    "Nächste Kampagnen",
    "Campagnes suivantes"
  ),
  breadcrumbHome: L("Home", "Home", "Home", "Accueil"),
  breadcrumbCategories: L(
    "Categorieën",
    "Categories",
    "Kategorien",
    "Catégories"
  ),
  filters: L("Filters", "Filters", "Filter", "Filtres"),
  clearFilters: L(
    "Filters wissen",
    "Clear filters",
    "Filter zurücksetzen",
    "Effacer les filtres"
  ),
  verifiedOnly: L(
    "Alleen Verified™ producten",
    "Verified™ products only",
    "Nur Verified™-Produkte",
    "Produits Verified™ uniquement"
  ),
  madeIn: L(
    "Productieland",
    "Country of production",
    "Produktionsland",
    "Pays de production"
  ),
  madeInAll: L("Alle landen", "All countries", "Alle Länder", "Tous les pays"),
  sortLabel: L("Sorteren", "Sort", "Sortieren", "Trier"),
  sortPopularity: L(
    "Populariteit",
    "Popularity",
    "Beliebtheit",
    "Popularité"
  ),
  sortPriceAsc: L(
    "Prijs: laag → hoog",
    "Price: low → high",
    "Preis: niedrig → hoch",
    "Prix : bas → haut"
  ),
  sortPriceDesc: L(
    "Prijs: hoog → laag",
    "Price: high → low",
    "Preis: hoch → niedrig",
    "Prix : haut → bas"
  ),
  sortRating: L("Beoordeling", "Rating", "Bewertung", "Notes"),
  productsFound: L(
    "{count} producten gevonden",
    "{count} products found",
    "{count} Produkte gefunden",
    "{count} produits trouvés"
  ),
  productsCountOf: L(
    "{shown} van {total} producten",
    "{shown} of {total} products",
    "{shown} von {total} Produkten",
    "{shown} sur {total} produits"
  ),
  productsZero: L("0 producten", "0 products", "0 Produkte", "0 produit"),
  verifiedBadge: L("Verified™", "Verified™", "Verified™", "Verified™"),
  producers: L("producenten", "producers", "Produzenten", "producteurs"),
  retailers: L("retailers", "retailers", "Händler", "détaillants"),
  productionCountries: L(
    "productielanden",
    "production countries",
    "Produktionsländer",
    "pays de production"
  ),
  relatedCategories: L(
    "Gerelateerde categorieën",
    "Related categories",
    "Verwandte Kategorien",
    "Catégories associées"
  ),
  emptyCategoryTitle: L(
    "Nog geen producten in deze categorie",
    "No products in this category yet",
    "Noch keine Produkte in dieser Kategorie",
    "Pas encore de produits dans cette catégorie"
  ),
  emptyCategoryBody: L(
    "Deze categorie is klaar voor Europese makers. Zodra partners aanbod publiceren, verschijnt het hier.",
    "This category is ready for European makers. Products will appear here once partners publish offers.",
    "Diese Kategorie ist bereit für europäische Hersteller. Produkte erscheinen, sobald Partner Angebote veröffentlichen.",
    "Cette catégorie est prête pour les fabricants européens. Les produits apparaîtront lorsque les partenaires publieront des offres."
  ),
  ctaHome: L("Naar homepage", "Go to homepage", "Zur Startseite", "Vers l’accueil"),
  ctaBrowseCategories: L(
    "Bekijk andere categorieën",
    "Browse other categories",
    "Andere Kategorien ansehen",
    "Voir d’autres catégories"
  ),
  faqHeading: L(
    "Veelgestelde vragen",
    "Frequently asked questions",
    "Häufige Fragen",
    "Questions fréquentes"
  ),
  buyGuideHeading: L("Koopgids", "Buying guide", "Kaufguide", "Guide d’achat"),
  keyFeaturesHeading: L(
    "Belangrijkste eigenschappen",
    "Key features",
    "Wichtigste Eigenschaften",
    "Caractéristiques clés"
  ),
  whatToLookForHeading: L(
    "Waar moet je op letten",
    "What to look for",
    "Worauf Sie achten sollten",
    "Points de vigilance"
  ),
  buyingAdviceHeading: L("Koopadvies", "Buying advice", "Kaufberatung", "Conseils d’achat"),
  benefitsHeading: L("Voordelen", "Benefits", "Vorteile", "Avantages"),
  drawbacksHeading: L("Nadelen", "Drawbacks", "Nachteile", "Inconvénients"),
  productInsightsHeading: L(
    "Productinzichten",
    "Product insights",
    "Produkteinblicke",
    "Aperçus produit"
  ),
  internalLinksHeading: L(
    "Bekijk ook",
    "See also",
    "Auch ansehen",
    "Voir aussi"
  ),
  relatedBrandsHeading: L(
    "Gerelateerde merken",
    "Related brands",
    "Verwandte Marken",
    "Marques associées"
  ),
  relatedProducersHeading: L(
    "Gerelateerde producenten",
    "Related producers",
    "Verwandte Produzenten",
    "Producteurs associés"
  ),
  frequentlyCombinedHeading: L(
    "Veelgekozen combinaties",
    "Frequently combined",
    "Häufig kombiniert",
    "Souvent associés"
  ),
  noFilterResults: L(
    "Geen producten met deze filters. Pas je filters aan of wis ze.",
    "No products match these filters. Adjust or clear your filters.",
    "Keine Produkte mit diesen Filtern. Passen Sie die Filter an oder setzen Sie sie zurück.",
    "Aucun produit ne correspond à ces filtres. Ajustez ou effacez vos filtres."
  ),
} as const satisfies Record<string, LocalizedString>

export type StorefrontMessageKey = keyof typeof M

export function t(
  key: StorefrontMessageKey,
  locale: StorefrontLocale
): string {
  return pickLocalized(M[key], locale)
}
