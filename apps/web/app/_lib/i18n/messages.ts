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
  viewBrand: L(
    "Bekijk merk",
    "View brand",
    "Marke ansehen",
    "Voir la marque"
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
  searchSortNameAsc: L(
    "Naam: A → Z",
    "Name: A → Z",
    "Name: A → Z",
    "Nom : A → Z"
  ),
  searchSortNameDesc: L(
    "Naam: Z → A",
    "Name: Z → A",
    "Name: Z → A",
    "Nom : Z → A"
  ),
  searchFilterCategory: L("Categorie", "Category", "Kategorie", "Catégorie"),
  searchFilterBrand: L("Merk", "Brand", "Marke", "Marque"),
  searchFilterManufacturer: L(
    "Producent",
    "Manufacturer",
    "Hersteller",
    "Fabricant"
  ),
  searchFilterCountry: L(
    "Land van productie",
    "Country of production",
    "Produktionsland",
    "Pays de production"
  ),
  searchPriceMin: L("Min. prijs", "Min. price", "Min. Preis", "Prix min."),
  searchPriceMax: L("Max. prijs", "Max. price", "Max. Preis", "Prix max."),
  searchResultsCount: L(
    "{count} producten gevonden",
    "{count} products found",
    "{count} Produkte gefunden",
    "{count} produits trouvés"
  ),
  searchResultsForCount: L(
    "{count} producten voor \"{query}\"",
    "{count} products for \"{query}\"",
    "{count} Produkte für \"{query}\"",
    "{count} produits pour \"{query}\""
  ),
  searchResultsTitle: L(
    "Zoekresultaten",
    "Search results",
    "Suchergebnisse",
    "Résultats de recherche"
  ),
  searchResultsTitleFor: L(
    "Zoekresultaten voor \"{query}\"",
    "Search results for \"{query}\"",
    "Suchergebnisse für \"{query}\"",
    "Résultats de recherche pour \"{query}\""
  ),
  productFinderTitle: L(
    "Product Finder",
    "Product Finder",
    "Produktfinder",
    "Product Finder"
  ),
  productFinderIntro: L(
    "Doorloop een paar stappen en vind passende producten in de catalogus.",
    "Answer a few steps to find matching products in the catalog.",
    "Beantworten Sie einige Schritte und finden Sie passende Produkte im Katalog.",
    "Répondez à quelques étapes pour trouver des produits adaptés dans le catalogue."
  ),
  productFinderAnyCategory: L(
    "Alle categorieën",
    "All categories",
    "Alle Kategorien",
    "Toutes les catégories"
  ),
  productFinderShowResults: L(
    "Toon resultaten",
    "Show results",
    "Ergebnisse anzeigen",
    "Afficher les résultats"
  ),
  productFinderRestart: L(
    "Opnieuw beginnen",
    "Start over",
    "Neu beginnen",
    "Recommencer"
  ),
  productFinderCountryPlaceholder: L(
    "Bijv. NL, DE of FR",
    "E.g. NL, DE or FR",
    "Z. B. NL, DE oder FR",
    "P. ex. NL, DE ou FR"
  ),
  productFinderMetaDescription: L(
    "Vind het juiste product via enkele eenvoudige stappen.",
    "Find the right product in a few simple steps.",
    "Finden Sie das passende Produkt in wenigen Schritten.",
    "Trouvez le bon produit en quelques étapes simples."
  ),
  productFinderQuestion_usage_area: L(
    "Waar ga je het product vooral gebruiken?",
    "Where will you mainly use the product?",
    "Wo werden Sie das Produkt hauptsächlich verwenden?",
    "Où utiliserez-vous principalement le produit ?"
  ),
  productFinderQuestion_search_term: L(
    "Waar ben je naar op zoek?",
    "What are you looking for?",
    "Wonach suchen Sie?",
    "Que recherchez-vous ?"
  ),
  productFinderQuestion_preferences: L(
    "Heb je voorkeuren voor herkomst of kwaliteit?",
    "Do you have preferences for origin or quality?",
    "Haben Sie Präferenzen für Herkunft oder Qualität?",
    "Avez-vous des préférences pour l'origine ou la qualité ?"
  ),
  productFinderOption_any_category: L(
    "Alle categorieën",
    "All categories",
    "Alle Kategorien",
    "Toutes les catégories"
  ),
  productFinderOption_category_tuin: L(
    "Tuin & buiten",
    "Garden & outdoor",
    "Garten & Outdoor",
    "Jardin & extérieur"
  ),
  productFinderOption_category_wonen: L(
    "Wonen & interieur",
    "Home & interior",
    "Wohnen & Interieur",
    "Maison & intérieur"
  ),
  productFinderOption_category_elektronica: L(
    "Elektronica",
    "Electronics",
    "Elektronik",
    "Électronique"
  ),
  productFinderOption_category_mode: L(
    "Mode & kleding",
    "Fashion & clothing",
    "Mode & Bekleidung",
    "Mode & vêtements"
  ),
  productFinderOption_category_sport: L(
    "Sport & fitness",
    "Sports & fitness",
    "Sport & Fitness",
    "Sport & fitness"
  ),
  productFinderOption_country_any: L(
    "Alle landen",
    "All countries",
    "Alle Länder",
    "Tous les pays"
  ),
  productFinderOption_country_nl: L(
    "Nederland",
    "Netherlands",
    "Niederlande",
    "Pays-Bas"
  ),
  productFinderOption_country_de: L(
    "Duitsland",
    "Germany",
    "Deutschland",
    "Allemagne"
  ),
  productFinderOption_country_fr: L(
    "Frankrijk",
    "France",
    "Frankreich",
    "France"
  ),
  productFinderStepProgress: L(
    "Stap {current} van {total}",
    "Step {current} of {total}",
    "Schritt {current} von {total}",
    "Étape {current} sur {total}"
  ),
  searchEmptyForQuery: L(
    "Geen resultaten voor \"{query}\"",
    "No results for \"{query}\"",
    "Keine Ergebnisse für \"{query}\"",
    "Aucun résultat pour \"{query}\""
  ),
  listingPendingTitle: L(
    "Binnenkort beschikbaar",
    "Available soon",
    "Bald verfügbar",
    "Bientôt disponible"
  ),
  listingPendingBody: L(
    "De productcatalogus wordt nog opgeleverd. Filters, sortering en productkaarten volgen zodra de listing live is.",
    "The product catalog is still being rolled out. Filters, sorting and product cards will appear when listing goes live.",
    "Der Produktkatalog wird noch ausgerollt. Filter, Sortierung und Produktkarten folgen, sobald das Listing live ist.",
    "Le catalogue produit est en cours de déploiement. Les filtres, le tri et les cartes produit suivront dès la mise en ligne."
  ),
  categoryEmptyForLabel: L(
    "Nog geen producten in {category}",
    "No products in {category} yet",
    "Noch keine Produkte in {category}",
    "Pas encore de produits dans {category}"
  ),
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
  // —— Header / nav ——
  navCategories: L("Categorieën", "Categories", "Kategorien", "Catégories"),
  navCategoriesMenu: L(
    "Categorieën ▾",
    "Categories ▾",
    "Kategorien ▾",
    "Catégories ▾"
  ),
  navAbout: L(
    "Over EuropMade",
    "About EuropMade",
    "Über EuropMade",
    "À propos d’EuropMade"
  ),
  navMain: L(
    "Hoofdnavigatie",
    "Main navigation",
    "Hauptnavigation",
    "Navigation principale"
  ),
  navMainCategories: L(
    "Hoofdcategorieën",
    "Main categories",
    "Hauptkategorien",
    "Catégories principales"
  ),
  navAllCategories: L(
    "Alle categorieën",
    "All categories",
    "Alle Kategorien",
    "Toutes les catégories"
  ),
  searchPlaceholder: L(
    "Zoek naar producten, merken, categorieën…",
    "Search products, brands, categories…",
    "Produkte, Marken, Kategorien suchen…",
    "Rechercher des produits, marques, catégories…"
  ),
  searchAria: L(
    "Producten zoeken",
    "Search products",
    "Produkte suchen",
    "Rechercher des produits"
  ),
  searchLabel: L("Zoeken", "Search", "Suchen", "Rechercher"),
  menu: L("Menu", "Menu", "Menü", "Menu"),
  cart: L("Winkelwagen", "Cart", "Warenkorb", "Panier"),
  cartWithCount: L(
    "Winkelwagen ({count} artikelen)",
    "Cart ({count} items)",
    "Warenkorb ({count} Artikel)",
    "Panier ({count} articles)"
  ),
  login: L("Inloggen", "Sign in", "Anmelden", "Connexion"),
  myAccount: L("Mijn account", "My account", "Mein Konto", "Mon compte"),
  orders: L("Bestellingen", "Orders", "Bestellungen", "Commandes"),
  logout: L("Uitloggen", "Sign out", "Abmelden", "Déconnexion"),
  settings: L("Instellingen", "Settings", "Einstellungen", "Paramètres"),
  // —— Footer ——
  footerColEuropMade: L("EuropMade", "EuropMade", "EuropMade", "EuropMade"),
  footerColCustomers: L("Klanten", "Customers", "Kunden", "Clients"),
  footerColPartners: L("Partners", "Partners", "Partner", "Partenaires"),
  footerColLegal: L("Juridisch", "Legal", "Rechtliches", "Mentions légales"),
  footerAbout: L("Over ons", "About us", "Über uns", "À propos"),
  footerContact: L("Contact", "Contact", "Kontakt", "Contact"),
  footerCareers: L("Werken bij", "Careers", "Karriere", "Carrières"),
  footerOrdering: L("Bestellen", "Ordering", "Bestellen", "Commander"),
  footerShipping: L("Verzenden", "Shipping", "Versand", "Livraison"),
  footerReturns: L("Retour", "Returns", "Retouren", "Retours"),
  footerSell: L(
    "Verkopen via EuropMade",
    "Sell on EuropMade",
    "Verkaufen über EuropMade",
    "Vendre via EuropMade"
  ),
  footerAffiliate: L(
    "Affiliateprogramma",
    "Affiliate programme",
    "Partnerprogramm",
    "Programme d’affiliation"
  ),
  footerPrivacy: L("Privacy", "Privacy", "Datenschutz", "Confidentialité"),
  footerCookies: L("Cookies", "Cookies", "Cookies", "Cookies"),
  footerTerms: L(
    "Algemene voorwaarden",
    "Terms & conditions",
    "AGB",
    "Conditions générales"
  ),
  // —— Shared product UI ——
  fromPrice: L("vanaf", "from", "ab", "à partir de"),
  sellersOne: L("1 aanbieder", "1 seller", "1 Anbieter", "1 vendeur"),
  sellersMany: L(
    "{count} aanbieders",
    "{count} sellers",
    "{count} Anbieter",
    "{count} vendeurs"
  ),
  noSellersYet: L(
    "Nog geen aanbieders",
    "No sellers yet",
    "Noch keine Anbieter",
    "Pas encore de vendeurs"
  ),
  viewProductCta: L(
    "Bekijk product",
    "View product",
    "Produkt ansehen",
    "Voir le produit"
  ),
  brand: L("Merk", "Brand", "Marke", "Marque"),
  brandLabel: L("Merk:", "Brand:", "Marke:", "Marque :"),
  producer: L("Producent", "Producer", "Produzent", "Producteur"),
  producerLabel: L(
    "Producent:",
    "Producer:",
    "Produzent:",
    "Producteur :"
  ),
  producerPageNotFound: L(
    "Producent niet gevonden — EuropMade",
    "Producer not found — EuropMade",
    "Produzent nicht gefunden — EuropMade",
    "Producteur introuvable — EuropMade"
  ),
  producerPageMeta: L(
    "{count} producten · Producentpagina",
    "{count} products · Producer page",
    "{count} Produkte · Produzentenseite",
    "{count} produits · Page producteur"
  ),
  producerProductsHeading: L(
    "Producten van deze producent",
    "Products from this producer",
    "Produkte dieses Produzenten",
    "Produits de ce producteur"
  ),
  producerCountryLabel: L(
    "Productieland",
    "Country of production",
    "Produktionsland",
    "Pays de production"
  ),
  producerVerifiedProducts: L(
    "{count} Verified™ producten",
    "{count} Verified™ products",
    "{count} Verified™-Produkte",
    "{count} produits Verified™"
  ),
  breadcrumbProducer: L("Producent", "Producer", "Produzent", "Producteur"),
  breadcrumbBrand: L("Merk", "Brand", "Marke", "Marque"),
  brandPageNotFound: L(
    "Merk niet gevonden — EuropMade",
    "Brand not found — EuropMade",
    "Marke nicht gefunden — EuropMade",
    "Marque introuvable — EuropMade"
  ),
  brandPageMeta: L(
    "{count} producten · Merkpagina",
    "{count} products · Brand page",
    "{count} Produkte · Markenseite",
    "{count} produits · Page marque"
  ),
  brandAboutHeading: L(
    "Over {name}",
    "About {name}",
    "Über {name}",
    "À propos de {name}"
  ),
  brandProductionHeading: L(
    "Waar worden onze producten gemaakt?",
    "Where are our products made?",
    "Wo werden unsere Produkte hergestellt?",
    "Où nos produits sont-ils fabriqués ?"
  ),
  brandProductsHeading: L(
    "Producten van {name}",
    "Products from {name}",
    "Produkte von {name}",
    "Produits de {name}"
  ),
  brandVerifiedProducts: L(
    "{count} Verified™ producten",
    "{count} Verified™ products",
    "{count} Verified™-Produkte",
    "{count} produits Verified™"
  ),
  brandWebsiteLabel: L(
    "Website",
    "Website",
    "Website",
    "Site web"
  ),
  sellerNavBrands: L(
    "Merken",
    "Brands",
    "Marken",
    "Marques"
  ),
  sellerBrandsTitle: L(
    "Mijn merken",
    "My brands",
    "Meine Marken",
    "Mes marques"
  ),
  sellerBrandsEmpty: L(
    "Nog geen merken om te beheren.",
    "No brands to manage yet.",
    "Noch keine Marken zu verwalten.",
    "Pas encore de marques à gérer."
  ),
  madeInEurope: L(
    "Gemaakt in Europa",
    "Made in Europe",
    "Hergestellt in Europa",
    "Fabriqué en Europe"
  ),
  madeInLabel: L("Gemaakt in", "Made in", "Hergestellt in", "Fabriqué en"),
  euOwnership: L("EU-eigendom", "EU ownership", "EU-Eigentum", "Propriété UE"),
  euVerified: L("EU Verified", "EU Verified", "EU Verified", "EU Verified"),
  color: L("Kleur", "Colour", "Farbe", "Couleur"),
  workArea: L("Werkgebied", "Coverage area", "Arbeitsbereich", "Zone de travail"),
  keyFeatures: L("Kenmerken", "Features", "Merkmale", "Caractéristiques"),
  addToCart: L(
    "In winkelwagen",
    "Add to cart",
    "In den Warenkorb",
    "Ajouter au panier"
  ),
  adding: L("Bezig…", "Adding…", "Wird hinzugefügt…", "Ajout…"),
  goToCart: L(
    "Naar winkelwagen",
    "Go to cart",
    "Zum Warenkorb",
    "Vers le panier"
  ),
  noOffer: L(
    "Geen aanbieding",
    "No offer",
    "Kein Angebot",
    "Aucune offre"
  ),
  viewProduct: L(
    "{title} bekijken",
    "View {title}",
    "{title} ansehen",
    "Voir {title}"
  ),
  // —— PDP ——
  tabDescription: L(
    "Omschrijving",
    "Description",
    "Beschreibung",
    "Description"
  ),
  tabSuitable: L(
    "Geschikt voor",
    "Suitable for",
    "Geeignet für",
    "Adapté à"
  ),
  tabSpecs: L(
    "Specificaties",
    "Specifications",
    "Technische Daten",
    "Spécifications"
  ),
  tabDownloads: L("Downloads", "Downloads", "Downloads", "Téléchargements"),
  tabProductReviews: L(
    "Productreviews",
    "Product reviews",
    "Produktbewertungen",
    "Avis produit"
  ),
  tabSellerReviews: L(
    "Verkopersreviews",
    "Seller reviews",
    "Händlerbewertungen",
    "Avis vendeurs"
  ),
  lowestPriceCompare: L(
    "Laagste prijs {price} · {count} aanbieders vergelijken ↓",
    "Lowest price {price} · compare {count} sellers ↓",
    "Niedrigster Preis {price} · {count} Anbieter vergleichen ↓",
    "Prix le plus bas {price} · comparer {count} vendeurs ↓"
  ),
  reviewsCount: L(
    "{count} reviews",
    "{count} reviews",
    "{count} Bewertungen",
    "{count} avis"
  ),
  offerer: L("Aanbieder", "Seller", "Anbieter", "Vendeur"),
  price: L("Prijs", "Price", "Preis", "Prix"),
  deliveryTime: L("Levertijd", "Delivery time", "Lieferzeit", "Délai de livraison"),
  shipping: L("Verzending", "Shipping", "Versand", "Livraison"),
  returns: L("Retour", "Returns", "Retouren", "Retours"),
  rating: L("Beoordeling", "Rating", "Bewertung", "Note"),
  stock: L("Voorraad", "Stock", "Lager", "Stock"),
  showMore: L("Meer tonen ▾", "Show more ▾", "Mehr anzeigen ▾", "Voir plus ▾"),
  showLess: L(
    "Minder tonen ▴",
    "Show less ▴",
    "Weniger anzeigen ▴",
    "Voir moins ▴"
  ),
  allSellers: L(
    "Alle aanbieders",
    "All sellers",
    "Alle Anbieter",
    "Tous les vendeurs"
  ),
  showThisSeller: L(
    "Deze aanbieder tonen",
    "Show this seller",
    "Diesen Anbieter anzeigen",
    "Afficher ce vendeur"
  ),
  autoSelectedOffer: L(
    "Automatisch geselecteerde aanbieding",
    "Automatically selected offer",
    "Automatisch ausgewähltes Angebot",
    "Offre sélectionnée automatiquement"
  ),
  whyThisSeller: L(
    "Waarom deze aanbieder?",
    "Why this seller?",
    "Warum dieser Anbieter?",
    "Pourquoi ce vendeur ?"
  ),
  freeShipping: L(
    "Gratis verzending",
    "Free shipping",
    "Kostenloser Versand",
    "Livraison gratuite"
  ),
  viewAllSellers: L(
    "Alle {count} aanbieders bekijken ▾",
    "View all {count} sellers ▾",
    "Alle {count} Anbieter ansehen ▾",
    "Voir les {count} vendeurs ▾"
  ),
  noActiveOffer: L(
    "Geen actieve aanbieding",
    "No active offer",
    "Kein aktives Angebot",
    "Aucune offre active"
  ),
  howOfferChosen: L(
    "Hoe wordt de aanbieding gekozen?",
    "How is the offer chosen?",
    "Wie wird das Angebot gewählt?",
    "Comment l’offre est-elle choisie ?"
  ),
  whoSellsProduct: L(
    "Wie verkoopt dit product?",
    "Who sells this product?",
    "Wer verkauft dieses Produkt?",
    "Qui vend ce produit ?"
  ),
  similarProducts: L(
    "Vergelijkbare producten",
    "Similar products",
    "Ähnliche Produkte",
    "Produits similaires"
  ),
  frequentlyBought: L(
    "Vaak samen gekocht",
    "Frequently bought together",
    "Wird oft zusammen gekauft",
    "Souvent achetés ensemble"
  ),
  othersAlsoViewed: L(
    "Anderen bekeken ook",
    "Others also viewed",
    "Andere sahen sich auch an",
    "Les autres ont aussi consulté"
  ),
  recentlyViewed: L(
    "Laatst bekeken",
    "Recently viewed",
    "Zuletzt angesehen",
    "Récemment consultés"
  ),
  inStock: L("Op voorraad", "In stock", "Auf Lager", "En stock"),
  addFailed: L(
    "Toevoegen mislukt. De aanbieding is mogelijk nog niet beschikbaar.",
    "Could not add. The offer may not be available yet.",
    "Hinzufügen fehlgeschlagen. Das Angebot ist möglicherweise noch nicht verfügbar.",
    "Ajout impossible. L’offre n’est peut-être pas encore disponible."
  ),
  noActiveCommerceOffer: L(
    "Er is geen actieve Commerce Cloud-aanbieding voor dit product.",
    "There is no active Commerce Cloud offer for this product.",
    "Es gibt kein aktives Commerce-Cloud-Angebot für dieses Produkt.",
    "Il n’y a pas d’offre Commerce Cloud active pour ce produit."
  ),
  trustSafePayment: L(
    "Veilig betalen",
    "Secure payment",
    "Sicher bezahlen",
    "Paiement sécurisé"
  ),
  trust30DayReturn: L(
    "30 dagen retour",
    "30-day returns",
    "30 Tage Rückgabe",
    "Retours sous 30 jours"
  ),
  trustMadeInEurope: L(
    "Geproduceerd in Europa",
    "Produced in Europe",
    "In Europa hergestellt",
    "Produit en Europe"
  ),
  trustVerifiedInfo: L(
    "Geverifieerde productinformatie",
    "Verified product information",
    "Verifizierte Produktinformationen",
    "Informations produit vérifiées"
  ),
  trustAria: L(
    "Vertrouwenskenmerken",
    "Trust features",
    "Vertrauensmerkmale",
    "Garanties de confiance"
  ),
  favoritesLater: L(
    "Favorieten volgen later",
    "Favourites coming later",
    "Favoriten folgen später",
    "Favoris bientôt disponibles"
  ),
  selected: L("Geselecteerd", "Selected", "Ausgewählt", "Sélectionné"),
  verifiedPurchase: L(
    "✓ Geverifieerde aankoop",
    "✓ Verified purchase",
    "✓ Verifizierter Kauf",
    "✓ Achat vérifié"
  ),
  addReview: L(
    "+ Review toevoegen",
    "+ Add review",
    "+ Bewertung hinzufügen",
    "+ Ajouter un avis"
  ),
  productReviewsAvg: L(
    "{stars} {rating} gemiddeld — {count} reviews, over het product zelf",
    "{stars} {rating} average — {count} reviews about the product",
    "{stars} {rating} durchschnittlich — {count} Bewertungen zum Produkt",
    "{stars} {rating} en moyenne — {count} avis sur le produit"
  ),
  sellerReviewsFor: L(
    "Reviews voor {retailer} — wisselen automatisch bij aanbiederskeuze",
    "Reviews for {retailer} — update when you change seller",
    "Bewertungen für {retailer} — wechseln automatisch bei Anbieterwahl",
    "Avis pour {retailer} — se mettent à jour selon le vendeur"
  ),
  noSellerSelected: L(
    "Nog geen aanbieder geselecteerd.",
    "No seller selected yet.",
    "Noch kein Anbieter ausgewählt.",
    "Aucun vendeur sélectionné."
  ),
  noSellerReviews: L(
    "Nog geen verkopersreviews voor deze aanbieder.",
    "No seller reviews for this seller yet.",
    "Noch keine Händlerbewertungen für diesen Anbieter.",
    "Pas encore d’avis vendeur pour ce vendeur."
  ),
  similarSubtitle: L(
    "Vergelijk vergelijkbare Europese producten.",
    "Compare similar European products.",
    "Vergleichen Sie ähnliche europäische Produkte.",
    "Comparez des produits européens similaires."
  ),
  frequentlySubtitle: L(
    "Klanten combineren deze producten regelmatig.",
    "Customers often combine these products.",
    "Kunden kombinieren diese Produkte häufig.",
    "Les clients associent souvent ces produits."
  ),
  othersSubtitle: L(
    "Populaire alternatieven die bezoekers bekeken.",
    "Popular alternatives visitors also viewed.",
    "Beliebte Alternativen, die Besucher angesehen haben.",
    "Alternatives populaires aussi consultées."
  ),
  allSellersCount: L(
    "Alle aanbieders ({count})",
    "All sellers ({count})",
    "Alle Anbieter ({count})",
    "Tous les vendeurs ({count})"
  ),
  prevProducts: L(
    "Vorige producten",
    "Previous products",
    "Vorherige Produkte",
    "Produits précédents"
  ),
  nextProducts: L(
    "Volgende producten",
    "Next products",
    "Nächste Produkte",
    "Produits suivants"
  ),
  catTuin: L("Tuin", "Garden", "Garten", "Jardin"),
  catElektronica: L(
    "Elektronica",
    "Electronics",
    "Elektronik",
    "Électronique"
  ),
  catMode: L("Mode", "Fashion", "Mode", "Mode"),
  catWonen: L("Wonen", "Home", "Wohnen", "Maison"),
  catSport: L("Sport", "Sports", "Sport", "Sport"),
  catVoeding: L("Voeding", "Food", "Lebensmittel", "Alimentation"),
  catKeuken: L("Keuken", "Kitchen", "Küche", "Cuisine"),
  catHuishouden: L(
    "Huishouden",
    "Household",
    "Haushalt",
    "Maison et ménage"
  ),
  catBeautyVerzorging: L(
    "Beauty & Verzorging",
    "Beauty & Care",
    "Beauty & Pflege",
    "Beauté & soins"
  ),
  catBabyKind: L(
    "Baby & Kind",
    "Baby & Kids",
    "Baby & Kind",
    "Bébé & enfant"
  ),
  catSpeelgoed: L("Speelgoed", "Toys", "Spielzeug", "Jouets"),
  catDieren: L("Dieren", "Pets", "Tiere", "Animaux"),
  catKlusGereedschap: L(
    "Klus & Gereedschap",
    "DIY & Tools",
    "Heimwerken & Werkzeug",
    "Bricolage & outils"
  ),
  catAutoMotor: L(
    "Auto & Motor",
    "Auto & Motorbike",
    "Auto & Motorrad",
    "Auto & moto"
  ),
  catKantoor: L("Kantoor", "Office", "Büro", "Bureau"),
  catBoekenMedia: L(
    "Boeken & Media",
    "Books & Media",
    "Bücher & Medien",
    "Livres & médias"
  ),
  catGezondheid: L("Gezondheid", "Health", "Gesundheit", "Santé"),
  catVerlichting: L("Verlichting", "Lighting", "Beleuchtung", "Éclairage"),
  catBadkamer: L("Badkamer", "Bathroom", "Badzimmer", "Salle de bain"),
  catSlaapkamer: L("Slaapkamer", "Bedroom", "Schlafzimmer", "Chambre"),
  catOutdoor: L("Outdoor", "Outdoor", "Outdoor", "Outdoor"),
  catDuurzaam: L("Duurzaam", "Sustainable", "Nachhaltig", "Durable"),
  catCadeaus: L("Cadeaus", "Gifts", "Geschenke", "Cadeaux"),
  catJuwelenHorloges: L(
    "Juwelen & Horloges",
    "Jewellery & Watches",
    "Schmuck & Uhren",
    "Bijoux & montres"
  ),
  catTassenAccessoires: L(
    "Tassen & Accessoires",
    "Bags & Accessories",
    "Taschen & Accessoires",
    "Sacs & accessoires"
  ),
  catSchoenen: L("Schoenen", "Shoes", "Schuhe", "Chaussures"),
  catPlantBloem: L(
    "Plant & Bloem",
    "Plants & Flowers",
    "Pflanzen & Blumen",
    "Plantes & fleurs"
  ),
  catFeestSeizoen: L(
    "Feest & Seizoen",
    "Party & Seasonal",
    "Feier & Saison",
    "Fête & saison"
  ),
  catAmbacht: L("Ambacht", "Craft", "Handwerk", "Artisanat"),
  catAlgemeen: L("Algemeen", "General", "Allgemein", "Général"),
  /** Spec / PDP UI labels */
  country: L("Land", "Country", "Land", "Pays"),
  identifier: L("Identifier", "Identifier", "Kennung", "Identifiant"),
  sizeStandard: L("Standaard", "Standard", "Standard", "Standard"),
  categoryWord: L("Categorie", "Category", "Kategorie", "Catégorie"),
  euMarketplaceLine: L(
    "Europese marketplace EuropMade",
    "European marketplace EuropMade",
    "Europäischer Marketplace EuropMade",
    "Marketplace européen EuropMade"
  ),
  buyBoxNotice: L(
    "Beste totale aanbieding op prijs, levertijd, score en voorraad.",
    "Best overall offer on price, delivery time, score and stock.",
    "Bestes Gesamtangebot nach Preis, Lieferzeit, Bewertung und Bestand.",
    "Meilleure offre globale sur prix, délai, note et stock."
  ),
  moreExplanation: L(
    "Meer uitleg",
    "More information",
    "Mehr Infos",
    "Plus d’infos"
  ),
  noCommerceOfferBody: L(
    "Dit product heeft momenteel geen Commerce Cloud-aanbieding. Je kunt het nog niet in de winkelwagen zetten.",
    "This product currently has no Commerce Cloud offer. You cannot add it to the cart yet.",
    "Dieses Produkt hat derzeit kein Commerce-Cloud-Angebot. Sie können es noch nicht in den Warenkorb legen.",
    "Ce produit n’a actuellement pas d’offre Commerce Cloud. Vous ne pouvez pas encore l’ajouter au panier."
  ),
  reportProductInfo: L(
    "⚑ Onjuistheid in deze productinformatie melden",
    "⚑ Report an inaccuracy in this product information",
    "⚑ Ungenauigkeit in diesen Produktinformationen melden",
    "⚑ Signaler une inexactitude dans ces informations produit"
  ),
  productInfoAria: L(
    "Productinformatie",
    "Product information",
    "Produktinformationen",
    "Informations produit"
  ),
  howOfferChosenAnswer: L(
    "De Buy Box rangschikt aanbiedingen server-side op totale klantwaarde (prijs, levertijd, reviews, voorraad, prestaties, retouren).",
    "The Buy Box ranks offers server-side on total customer value (price, delivery time, reviews, stock, performance, returns).",
    "Die Buy Box ordnet Angebote serverseitig nach Gesamtkundenwert (Preis, Lieferzeit, Bewertungen, Bestand, Leistung, Retouren).",
    "La Buy Box classe les offres côté serveur selon la valeur totale pour le client (prix, délai, avis, stock, performance, retours)."
  ),
  whoSellsProductAnswer: L(
    "Onafhankelijke retailers op EuropMade. EuropMade verkoopt zelf nooit producten.",
    "Independent retailers on EuropMade. EuropMade never sells products itself.",
    "Unabhängige Händler auf EuropMade. EuropMade verkauft selbst keine Produkte.",
    "Des détaillants indépendants sur EuropMade. EuropMade ne vend jamais de produits lui-même."
  ),
  noProductReviewsYet: L(
    "Nog geen productreviews.",
    "No product reviews yet.",
    "Noch keine Produktbewertungen.",
    "Pas encore d’avis produit."
  ),
  noReviewComment: L(
    "Geen toelichting.",
    "No comment.",
    "Keine Erläuterung.",
    "Sans commentaire."
  ),
  descriptionAvailableVia: L(
    "{title} is beschikbaar via onafhankelijke aanbieders op EuropMade.",
    "{title} is available via independent sellers on EuropMade.",
    "{title} ist über unabhängige Anbieter auf EuropMade verfügbar.",
    "{title} est disponible via des vendeurs indépendants sur EuropMade."
  ),
  descriptionBuyBoxAuto: L(
    "De Buy Box selecteert automatisch de beste totale aanbieding voor de klant.",
    "The Buy Box automatically selects the best overall offer for the customer.",
    "Die Buy Box wählt automatisch das beste Gesamtangebot für den Kunden.",
    "La Buy Box sélectionne automatiquement la meilleure offre globale pour le client."
  ),
  lowStock: L("Lage voorraad", "Low stock", "Geringer Bestand", "Stock faible"),
  outOfStock: L(
    "Niet op voorraad",
    "Out of stock",
    "Nicht auf Lager",
    "Rupture de stock"
  ),
  deliveryTomorrow: L(
    "Morgen in huis",
    "Arrives tomorrow",
    "Morgen geliefert",
    "Livré demain"
  ),
  deliveryOrderedToday: L(
    "Vandaag besteld, morgen geleverd",
    "Order today, delivered tomorrow",
    "Heute bestellt, morgen geliefert",
    "Commandé aujourd’hui, livré demain"
  ),
  delivery1to2BusinessDays: L(
    "1–2 werkdagen",
    "1–2 business days",
    "1–2 Werktage",
    "1–2 jours ouvrables"
  ),
  delivery2to4BusinessDays: L(
    "2–4 werkdagen",
    "2–4 business days",
    "2–4 Werktage",
    "2–4 jours ouvrables"
  ),
  delivery5to7BusinessDays: L(
    "5–7 werkdagen",
    "5–7 business days",
    "5–7 Werktage",
    "5–7 jours ouvrables"
  ),
  popularCategories: L(
    "Populaire categorieën",
    "Popular categories",
    "Beliebte Kategorien",
    "Catégories populaires"
  ),
  allCategories: L(
    "Alle categorieën",
    "All categories",
    "Alle Kategorien",
    "Toutes les catégories"
  ),
  categoriesIndexMeta: L(
    "{count} hoofdcategorieën — kies een categorie om verder te browsen",
    "{count} main categories — pick a category to browse",
    "{count} Hauptkategorien — wählen Sie eine Kategorie zum Stöbern",
    "{count} catégories principales — choisissez une catégorie"
  ),
  categoriesCatalogHint: L(
    "Productresultaten per categorie volgen zodra de catalogus live is.",
    "Product results per category will appear once the catalogue is live.",
    "Produktergebnisse pro Kategorie folgen, sobald der Katalog live ist.",
    "Les résultats par catégorie apparaîtront lorsque le catalogue sera en ligne."
  ),
  categoriesSeoTitle: L(
    "Shop Europese makers per categorie",
    "Shop European makers by category",
    "Europäische Macher nach Kategorie entdecken",
    "Achetez auprès de fabricants européens par catégorie"
  ),
  categoriesSeoBody: L(
    "Op EuropMade vind je uitsluitend producten die in Europa zijn geproduceerd. Elke categoriepagina toont straks geverifieerde productinformatie, aanbiedersvergelijking en de Buy Box — zonder gesponsorde rangschikking.",
    "On EuropMade you only find products produced in Europe. Each category page will show verified product information, seller comparison and the Buy Box — without sponsored ranking.",
    "Auf EuropMade finden Sie ausschließlich in Europa hergestellte Produkte. Jede Kategorieseite zeigt künftig verifizierte Produktinformationen, Anbietervergleich und die Buy Box — ohne gesponsertes Ranking.",
    "Sur EuropMade, vous ne trouvez que des produits fabriqués en Europe. Chaque page catégorie affichera des informations produit vérifiées, la comparaison des vendeurs et la Buy Box — sans classement sponsorisé."
  ),
  backToHomepage: L(
    "Terug naar de homepage",
    "Back to the homepage",
    "Zurück zur Startseite",
    "Retour à l’accueil"
  ),
  countryNL: L("Nederland", "Netherlands", "Niederlande", "Pays-Bas"),
  countryDE: L("Duitsland", "Germany", "Deutschland", "Allemagne"),
  countryBE: L("België", "Belgium", "Belgien", "Belgique"),
  countryFR: L("Frankrijk", "France", "Frankreich", "France"),
  countryIT: L("Italië", "Italy", "Italien", "Italie"),
  countryES: L("Spanje", "Spain", "Spanien", "Espagne"),
  countryPL: L("Polen", "Poland", "Polen", "Pologne"),
  countryAT: L("Oostenrijk", "Austria", "Österreich", "Autriche"),
  countrySE: L("Zweden", "Sweden", "Schweden", "Suède"),
  countryDK: L("Denemarken", "Denmark", "Dänemark", "Danemark"),
  countryIE: L("Ierland", "Ireland", "Irland", "Irlande"),
  countryPT: L("Portugal", "Portugal", "Portugal", "Portugal"),
  countryFI: L("Finland", "Finland", "Finnland", "Finlande"),
  countryEU: L("Europa", "Europe", "Europa", "Europe"),

  // —— Content / footer targets ——
  pageInPreparation: L(
    "Deze pagina wordt momenteel voorbereid.",
    "This page is currently being prepared.",
    "Diese Seite wird derzeit vorbereitet.",
    "Cette page est actuellement en préparation."
  ),
  onThisPage: L(
    "Op deze pagina",
    "On this page",
    "Auf dieser Seite",
    "Sur cette page"
  ),
  loading: L("Laden…", "Loading…", "Laden…", "Chargement…"),
  notAvailableYet: L(
    "Nog niet beschikbaar",
    "Not available yet",
    "Noch nicht verfügbar",
    "Pas encore disponible"
  ),
  buyBoxPageTitle: L(
    "Buy Box uitgelegd",
    "Buy Box explained",
    "Buy Box erklärt",
    "Buy Box expliquée"
  ),
  buyBoxPageP1: L(
    "De Buy Box toont automatisch de beste totale aanbieding voor jou. We wegen onder meer prijs, levertijd, beoordeling, voorraad en betrouwbaarheid.",
    "The Buy Box automatically shows the best overall offer for you. We weigh factors such as price, delivery time, rating, stock and reliability.",
    "Die Buy Box zeigt automatisch das beste Gesamtangebot für Sie. Wir gewichten u. a. Preis, Lieferzeit, Bewertung, Bestand und Zuverlässigkeit.",
    "La Buy Box affiche automatiquement la meilleure offre globale pour vous. Nous pondérons notamment le prix, le délai, la note, le stock et la fiabilité."
  ),
  buyBoxPageP2: L(
    "Advertenties, commissies of platformbelang spelen géén rol bij de selectie. Zo blijft de keuze eerlijk voor klant én verkoper.",
    "Ads, commissions or platform interest play no role in the selection. That keeps the choice fair for customers and sellers.",
    "Anzeigen, Provisionen oder Plattforminteresse spielen bei der Auswahl keine Rolle. So bleibt die Wahl fair für Kunden und Verkäufer.",
    "Les publicités, commissions ou intérêts de la plateforme n’entrent pas en ligne de compte. Le choix reste équitable pour clients et vendeurs."
  ),
  buyBoxPageP3: L(
    "Via \"Alle aanbieders bekijken\" vergelijk je zelf alle beschikbare offers voor hetzelfde product.",
    "Via \"View all sellers\" you can compare all available offers for the same product yourself.",
    "Über \"Alle Anbieter ansehen\" vergleichen Sie selbst alle verfügbaren Angebote für dasselbe Produkt.",
    "Via \"Voir tous les vendeurs\" vous comparez vous-même toutes les offres disponibles pour le même produit."
  ),
  aboutPageTitle: L(
    "Over EuropMade",
    "About EuropMade",
    "Über EuropMade",
    "À propos d’EuropMade"
  ),
  aboutPageP1: L(
    "EuropMade is het marketplace-platform voor producten die daadwerkelijk in Europa zijn geproduceerd. Wij verkopen zelf geen producten: onafhankelijke retailers en producenten bieden hun aanbod aan, en jij koopt rechtstreeks bij hen.",
    "EuropMade is the marketplace platform for products that are actually produced in Europe. We do not sell products ourselves: independent retailers and producers list their offers, and you buy directly from them.",
    "EuropMade ist die Marketplace-Plattform für Produkte, die tatsächlich in Europa hergestellt werden. Wir verkaufen selbst keine Produkte: unabhängige Händler und Produzenten bieten an, und Sie kaufen direkt bei ihnen.",
    "EuropMade est la marketplace des produits réellement fabriqués en Europe. Nous ne vendons pas nous-mêmes : des détaillants et producteurs indépendants proposent leurs offres, et vous achetez directement auprès d’eux."
  ),
  aboutPageP2: L(
    "Elke productpagina bevat gecontroleerde informatie over herkomst, producent en materiaal. De Buy Box selecteert automatisch de beste totale aanbieding voor jou — nooit op basis van advertenties of commissies.",
    "Every product page includes verified information about origin, producer and materials. The Buy Box automatically selects the best overall offer for you — never based on ads or commissions.",
    "Jede Produktseite enthält geprüfte Informationen zu Herkunft, Produzent und Material. Die Buy Box wählt automatisch das beste Gesamtangebot — nie auf Basis von Anzeigen oder Provisionen.",
    "Chaque page produit contient des informations vérifiées sur l’origine, le producteur et les matériaux. La Buy Box sélectionne automatiquement la meilleure offre globale — jamais sur la base de publicités ou de commissions."
  ),
  aboutPageP3: L(
    "Ons doel: het meest transparante, betrouwbare en eerlijke marketplace-platform van Europa.",
    "Our goal: Europe’s most transparent, reliable and fair marketplace platform.",
    "Unser Ziel: Europas transparenteste, zuverlässigste und fairste Marketplace-Plattform.",
    "Notre objectif : la marketplace la plus transparente, fiable et équitable d’Europe."
  ),
  supportPageTitle: L(
    "Klantenservice",
    "Customer service",
    "Kundenservice",
    "Service client"
  ),
  supportPageIntro: L(
    "Heb je een vraag over een bestelling, retour of je account? Gebruik de onderstaande routes — zo helpen we je sneller.",
    "Have a question about an order, return or your account? Use the routes below — that helps us assist you faster.",
    "Haben Sie eine Frage zu einer Bestellung, Retoure oder Ihrem Konto? Nutzen Sie die unten stehenden Wege — so helfen wir Ihnen schneller.",
    "Une question sur une commande, un retour ou votre compte ? Utilisez les liens ci-dessous — nous pourrons vous aider plus rapidement."
  ),
  supportMyOrders: L(
    "Mijn bestellingen",
    "My orders",
    "Meine Bestellungen",
    "Mes commandes"
  ),
  supportMyOrdersHint: L(
    "status, tracking en berichten met de verkoper",
    "status, tracking and messages with the seller",
    "Status, Sendungsverfolgung und Nachrichten mit dem Verkäufer",
    "statut, suivi et messages avec le vendeur"
  ),
  supportReturns: L("Retouren", "Returns", "Retouren", "Retours"),
  supportReturnsHint: L(
    "retour aanvragen of opvolgen",
    "request or follow up a return",
    "Retoure beantragen oder nachverfolgen",
    "demander ou suivre un retour"
  ),
  supportMessages: L("Berichten", "Messages", "Nachrichten", "Messages"),
  supportMessagesHint: L(
    "conversatie met de verkoper over een order",
    "conversation with the seller about an order",
    "Unterhaltung mit dem Verkäufer zu einer Bestellung",
    "conversation avec le vendeur au sujet d’une commande"
  ),
  supportReturnPolicy: L(
    "Retourbeleid",
    "Return policy",
    "Rückgaberecht",
    "Politique de retour"
  ),
  supportReturnPolicyHint: L(
    "termijnen en voorwaarden",
    "timelines and terms",
    "Fristen und Bedingungen",
    "délais et conditions"
  ),
  supportContact: L("Contact", "Contact", "Kontakt", "Contact"),
  supportContactHint: L(
    "bereikbaarheid van EuropMade",
    "how to reach EuropMade",
    "Erreichbarkeit von EuropMade",
    "comment joindre EuropMade"
  ),
  supportPageOutro: L(
    "Voor productspecifieke vragen is de verkoper je eerste aanspreekpunt via de berichtenfunctie bij je bestelling.",
    "For product-specific questions, the seller is your first contact via the messaging feature on your order.",
    "Bei produktspezifischen Fragen ist der Verkäufer Ihr erster Ansprechpartner über die Nachrichtenfunktion bei Ihrer Bestellung.",
    "Pour les questions spécifiques au produit, le vendeur est votre premier contact via la messagerie de votre commande."
  ),
  supportOrderingHeading: L("Bestellen", "Ordering", "Bestellen", "Commander"),
  supportShippingHeading: L("Verzenden", "Shipping", "Versand", "Livraison"),
  supportReturnsHeading: L("Retour", "Returns", "Retoure", "Retours"),
  careersPageTitle: L(
    "Werken bij EuropMade",
    "Careers at EuropMade",
    "Karriere bei EuropMade",
    "Carrières chez EuropMade"
  ),
  legalIndexTitle: L("Juridisch", "Legal", "Rechtliches", "Mentions légales"),
  legalIndexIntro: L(
    "Hier vind je de juridische informatie van EuropMade. EuropMade is een marketplace: de koopovereenkomst komt tot stand tussen jou en de verkoper. EuropMade faciliteert het platform.",
    "Here you find EuropMade’s legal information. EuropMade is a marketplace: the purchase agreement is between you and the seller. EuropMade facilitates the platform.",
    "Hier finden Sie die rechtlichen Informationen von EuropMade. EuropMade ist eine Marketplace: der Kaufvertrag kommt zwischen Ihnen und dem Verkäufer zustande. EuropMade stellt die Plattform bereit.",
    "Retrouvez ici les informations juridiques d’EuropMade. EuropMade est une marketplace : le contrat de vente est conclu entre vous et le vendeur. EuropMade facilite la plateforme."
  ),
  legalTerms: L(
    "Algemene voorwaarden",
    "Terms and conditions",
    "Allgemeine Geschäftsbedingungen",
    "Conditions générales"
  ),
  legalShipping: L("Verzending", "Shipping", "Versand", "Livraison"),
  legalReturns: L("Retourneren", "Returns", "Retouren", "Retours"),
  legalPayments: L(
    "Betaalmethoden",
    "Payment methods",
    "Zahlungsmethoden",
    "Moyens de paiement"
  ),
  legalDisclaimer: L("Disclaimer", "Disclaimer", "Haftungsausschluss", "Avertissement"),
  legalPrivacy: L("Privacybeleid", "Privacy policy", "Datenschutz", "Politique de confidentialité"),
  legalCopyright: L("Copyright", "Copyright", "Urheberrecht", "Droit d’auteur"),
  legalWarranty: L("Garanties", "Warranties", "Garantien", "Garanties"),
  legalRefund: L(
    "Terugbetalingsbeleid",
    "Refund policy",
    "Rückerstattungsrichtlinie",
    "Politique de remboursement"
  ),
  legalContact: L("Contact", "Contact", "Kontakt", "Contact"),
  legalNotFoundTitle: L(
    "Niet gevonden",
    "Not found",
    "Nicht gefunden",
    "Introuvable"
  ),
  legalNotFoundBody: L(
    "Deze juridische pagina bestaat niet.",
    "This legal page does not exist.",
    "Diese rechtliche Seite existiert nicht.",
    "Cette page juridique n’existe pas."
  ),
  partnerWelcomeTitle: L(
    "Word partner op EuropMade",
    "Become a partner on EuropMade",
    "Partner bei EuropMade werden",
    "Devenir partenaire sur EuropMade"
  ),
  affiliateDashboardTitle: L(
    "Affiliate Dashboard",
    "Affiliate Dashboard",
    "Affiliate-Dashboard",
    "Tableau de bord affilié"
  ),
  affiliateNavDashboard: L("Dashboard", "Dashboard", "Dashboard", "Tableau de bord"),
  affiliateNavStats: L(
    "Statistieken",
    "Statistics",
    "Statistiken",
    "Statistiques"
  ),
  affiliateNavCommissions: L(
    "Commissies",
    "Commissions",
    "Provisionen",
    "Commissions"
  ),
  affiliateNavLinks: L(
    "Links & Coupons",
    "Links & Coupons",
    "Links & Coupons",
    "Liens & coupons"
  ),
  affiliateNavPayouts: L(
    "Uitbetalingen",
    "Payouts",
    "Auszahlungen",
    "Paiements"
  ),
  affiliateNavAccount: L("Account", "Account", "Konto", "Compte"),
  affiliateNavAria: L(
    "Affiliate navigatie",
    "Affiliate navigation",
    "Affiliate-Navigation",
    "Navigation affilié"
  ),
  cookiePrefsTitle: L(
    "Cookievoorkeuren",
    "Cookie preferences",
    "Cookie-Einstellungen",
    "Préférences de cookies"
  ),
  cookiePrefsIntro: L(
    "Beheer per categorie welke cookies zijn toegestaan.",
    "Manage which cookies are allowed per category.",
    "Verwalten Sie je Kategorie, welche Cookies erlaubt sind.",
    "Gérez par catégorie quels cookies sont autorisés."
  ),
  cookieNecessary: L("Noodzakelijk", "Necessary", "Erforderlich", "Nécessaires"),
  cookieNecessaryDesc: L(
    "Vereist voor het functioneren van de website (bijv. sessiebeheer, winkelwagen). Kan niet worden uitgeschakeld.",
    "Required for the website to work (e.g. session management, cart). Cannot be disabled.",
    "Erforderlich für die Funktion der Website (z. B. Sitzung, Warenkorb). Kann nicht deaktiviert werden.",
    "Requis pour le fonctionnement du site (session, panier…). Ne peut pas être désactivé."
  ),
  cookieAffiliate: L(
    "Affiliate-tracking",
    "Affiliate tracking",
    "Affiliate-Tracking",
    "Suivi d’affiliation"
  ),
  cookieAffiliateDesc: L(
    "Maakt cookie-gebaseerde toeschrijving aan een Affiliate mogelijk (ConsentRecord).",
    "Enables cookie-based attribution to an Affiliate (ConsentRecord).",
    "Ermöglicht cookiebasierte Zuordnung zu einem Affiliate (ConsentRecord).",
    "Permet l’attribution par cookie à un Affilié (ConsentRecord)."
  ),
  cookieAnalytics: L("Analytics", "Analytics", "Analytics", "Analytique"),
  cookieAnalyticsDesc: L(
    "Geanonimiseerde statistieken over websitegebruik.",
    "Anonymised statistics about website usage.",
    "Anonymisierte Statistiken zur Website-Nutzung.",
    "Statistiques anonymisées sur l’utilisation du site."
  ),
  cookieBannerTitle: L(
    "Jouw privacy",
    "Your privacy",
    "Ihre Privatsphäre",
    "Votre vie privée"
  ),
  cookieBannerBody: L(
    "We gebruiken cookies voor het functioneren van de site en, met jouw toestemming, voor affiliate-trackinglinks. Zonder toestemming kun je nog steeds via een coupon-code aan een Affiliate worden toegeschreven.",
    "We use cookies for the site to work and, with your consent, for affiliate tracking links. Without consent you can still be attributed to an Affiliate via a coupon code.",
    "Wir verwenden Cookies für die Funktion der Website und — mit Ihrer Zustimmung — für Affiliate-Tracking-Links. Ohne Zustimmung können Sie weiterhin über einen Gutscheincode einem Affiliate zugeordnet werden.",
    "Nous utilisons des cookies pour le fonctionnement du site et, avec votre consentement, pour les liens de suivi d’affiliation. Sans consentement, vous pouvez toujours être attribué à un Affilié via un code promo."
  ),
  cookieAcceptAll: L(
    "Alles accepteren",
    "Accept all",
    "Alle akzeptieren",
    "Tout accepter"
  ),
  cookieReject: L("Weigeren", "Reject", "Ablehnen", "Refuser"),
  cookieManagePreferences: L(
    "Voorkeuren beheren",
    "Manage preferences",
    "Einstellungen verwalten",
    "Gérer les préférences"
  ),
  cancel: L("Annuleren", "Cancel", "Abbrechen", "Annuler"),
  savePreferences: L(
    "Voorkeuren opslaan",
    "Save preferences",
    "Einstellungen speichern",
    "Enregistrer les préférences"
  ),
  saving: L("Opslaan…", "Saving…", "Speichern…", "Enregistrement…"),

  // —— Auth ——
  authLoginTitle: L("Inloggen", "Sign in", "Anmelden", "Connexion"),
  authWelcomeBack: L(
    "Welkom terug bij EuropMade",
    "Welcome back to EuropMade",
    "Willkommen zurück bei EuropMade",
    "Bon retour sur EuropMade"
  ),
  authEmail: L("E-mailadres", "Email address", "E-Mail-Adresse", "Adresse e-mail"),
  authPassword: L("Wachtwoord", "Password", "Passwort", "Mot de passe"),
  authRememberMe: L("Onthoud mij", "Remember me", "Angemeldet bleiben", "Se souvenir de moi"),
  authForgotPassword: L(
    "Wachtwoord vergeten?",
    "Forgot password?",
    "Passwort vergessen?",
    "Mot de passe oublié ?"
  ),
  authSigningIn: L(
    "Bezig met inloggen…",
    "Signing in…",
    "Anmeldung läuft…",
    "Connexion…"
  ),
  authLoginError: L(
    "E-mailadres of wachtwoord onjuist.",
    "Incorrect email address or password.",
    "E-Mail-Adresse oder Passwort falsch.",
    "Adresse e-mail ou mot de passe incorrect."
  ),
  authOr: L("of", "or", "oder", "ou"),
  authNoAccount: L(
    "Nog geen account?",
    "Don’t have an account?",
    "Noch kein Konto?",
    "Pas encore de compte ?"
  ),
  authRegister: L("Registreren", "Register", "Registrieren", "S’inscrire"),
  authMfaTitle: L(
    "Verificatiecode",
    "Verification code",
    "Bestätigungscode",
    "Code de vérification"
  ),
  authMfaSubtitle: L(
    "Voer de code in uit je authenticator-app",
    "Enter the code from your authenticator app",
    "Geben Sie den Code aus Ihrer Authenticator-App ein",
    "Saisissez le code de votre application d’authentification"
  ),
  authRecoveryCode: L("Herstelcode", "Recovery code", "Wiederherstellungscode", "Code de récupération"),
  authTrustDevice: L(
    "Vertrouw dit apparaat 30 dagen",
    "Trust this device for 30 days",
    "Dieses Gerät 30 Tage vertrauen",
    "Faire confiance à cet appareil pendant 30 jours"
  ),
  authConfirm: L("Bevestigen", "Confirm", "Bestätigen", "Confirmer"),
  authUseAuthenticator: L(
    "Gebruik je authenticator-app",
    "Use your authenticator app",
    "Authenticator-App verwenden",
    "Utiliser votre application d’authentification"
  ),
  authNoAppAccess: L(
    "Geen toegang tot je app?",
    "No access to your app?",
    "Kein Zugriff auf Ihre App?",
    "Pas d’accès à votre application ?"
  ),
  authUseRecovery: L(
    "Gebruik een herstelcode",
    "Use a recovery code",
    "Wiederherstellungscode verwenden",
    "Utiliser un code de récupération"
  ),
  authMfaRecoveryError: L(
    "Deze herstelcode is onjuist of al gebruikt.",
    "This recovery code is incorrect or already used.",
    "Dieser Wiederherstellungscode ist falsch oder bereits verwendet.",
    "Ce code de récupération est incorrect ou déjà utilisé."
  ),
  authMfaCodeError: L(
    "Deze code is onjuist of verlopen.",
    "This code is incorrect or expired.",
    "Dieser Code ist falsch oder abgelaufen.",
    "Ce code est incorrect ou a expiré."
  ),
  authEmailPlaceholder: L(
    "naam@voorbeeld.nl",
    "name@example.com",
    "name@beispiel.de",
    "nom@exemple.fr"
  ),

  // —— Buyer portal ——
  buyerPortalTitle: L(
    "Mijn EuropMade",
    "My EuropMade",
    "Mein EuropMade",
    "Mon EuropMade"
  ),
  buyerNavDashboard: L("Dashboard", "Dashboard", "Dashboard", "Tableau de bord"),
  buyerNavOrders: L(
    "Mijn bestellingen",
    "My orders",
    "Meine Bestellungen",
    "Mes commandes"
  ),
  buyerNavReturns: L("Retouren", "Returns", "Retouren", "Retours"),
  buyerNavMessages: L("Berichten", "Messages", "Nachrichten", "Messages"),
  buyerNavReviews: L("Reviews", "Reviews", "Bewertungen", "Avis"),
  buyerNavSettings: L(
    "Instellingen",
    "Settings",
    "Einstellungen",
    "Paramètres"
  ),
  buyerNavAria: L(
    "Buyer navigatie",
    "Buyer navigation",
    "Buyer-Navigation",
    "Navigation acheteur"
  ),
  notifications: L(
    "Notificaties",
    "Notifications",
    "Benachrichtigungen",
    "Notifications"
  ),
  buyerDashboardIntro: L(
    "Overzicht van je recente activiteit.",
    "Overview of your recent activity.",
    "Überblick über Ihre letzte Aktivität.",
    "Aperçu de votre activité récente."
  ),
  buyerActiveOrders: L(
    "Actieve bestellingen",
    "Active orders",
    "Aktive Bestellungen",
    "Commandes actives"
  ),
  buyerOpenReturns: L(
    "Openstaande retour",
    "Open returns",
    "Offene Retouren",
    "Retours ouverts"
  ),
  buyerNewMessages: L(
    "Nieuwe berichten",
    "New messages",
    "Neue Nachrichten",
    "Nouveaux messages"
  ),
  buyerViewAll: L("↳ Bekijk alle", "↳ View all", "↳ Alle ansehen", "↳ Tout voir"),
  buyerViewStatus: L(
    "↳ Bekijk status",
    "↳ View status",
    "↳ Status ansehen",
    "↳ Voir le statut"
  ),
  buyerComingLater: L(
    "Volgt in S3-05-07",
    "Coming in S3-05-07",
    "Folgt in S3-05-07",
    "À venir en S3-05-07"
  ),
  buyerRecentOrders: L(
    "Recente bestellingen",
    "Recent orders",
    "Letzte Bestellungen",
    "Commandes récentes"
  ),
  buyerNoOrders: L(
    "Nog geen bestellingen.",
    "No orders yet.",
    "Noch keine Bestellungen.",
    "Pas encore de commandes."
  ),
  buyerOrderLabel: L(
    "Bestelling #{number} · {status}",
    "Order #{number} · {status}",
    "Bestellung #{number} · {status}",
    "Commande #{number} · {status}"
  ),
  buyerView: L("Bekijken →", "View →", "Ansehen →", "Voir →"),
  buyerDashboardLoadError: L(
    "Dashboard laden mislukt.",
    "Failed to load dashboard.",
    "Dashboard konnte nicht geladen werden.",
    "Échec du chargement du tableau de bord."
  ),

  // —— Seller portal ——
  sellerDashboardTitle: L(
    "Seller Dashboard",
    "Seller Dashboard",
    "Seller Dashboard",
    "Tableau de bord vendeur"
  ),
  sellerNavDashboard: L("Dashboard", "Dashboard", "Dashboard", "Tableau de bord"),
  sellerNavProducts: L("Producten", "Products", "Produkte", "Produits"),
  sellerNavOrders: L("Orders", "Orders", "Bestellungen", "Commandes"),
  sellerNavMessages: L("Berichten", "Messages", "Nachrichten", "Messages"),
  sellerNavReturns: L("Retouren", "Returns", "Retouren", "Retours"),
  sellerNavMarketing: L("Marketing", "Marketing", "Marketing", "Marketing"),
  sellerNavFinance: L("Financiën", "Finance", "Finanzen", "Finance"),
  sellerNavReviews: L("Reviews", "Reviews", "Bewertungen", "Avis"),
  sellerNavSettings: L(
    "Instellingen",
    "Settings",
    "Einstellungen",
    "Paramètres"
  ),
  sellerNavAria: L(
    "Seller navigatie",
    "Seller navigation",
    "Seller-Navigation",
    "Navigation vendeur"
  ),
  sellerDashboardIntro: L(
    "Overzicht van verkopen, producten en openstaande acties.",
    "Overview of sales, products and outstanding actions.",
    "Überblick über Verkäufe, Produkte und offene Aktionen.",
    "Aperçu des ventes, produits et actions en attente."
  ),
  sellerPeriod: L("Periode", "Period", "Zeitraum", "Période"),
  sellerPeriodFrom: L("vanaf", "from", "ab", "à partir de"),
  sellerActionRequired: L(
    "Actie vereist",
    "Action required",
    "Aktion erforderlich",
    "Action requise"
  ),
  sellerNoActions: L(
    "Geen openstaande acties in deze periode.",
    "No outstanding actions in this period.",
    "Keine offenen Aktionen in diesem Zeitraum.",
    "Aucune action en attente pour cette période."
  ),
  sellerAction: L("Actie", "Action", "Aktion", "Action"),
  sellerOpen: L("Openen", "Open", "Öffnen", "Ouvrir"),
  sellerRevenue: L("Omzet", "Revenue", "Umsatz", "Chiffre d’affaires"),
  sellerProductsOnline: L(
    "Producten online",
    "Products online",
    "Produkte online",
    "Produits en ligne"
  ),
  sellerInConcept: L(
    "{count} in concept",
    "{count} in draft",
    "{count} im Entwurf",
    "{count} en brouillon"
  ),
  sellerUnread: L(
    "{count} ongelezen",
    "{count} unread",
    "{count} ungelesen",
    "{count} non lus"
  ),
  sellerNewMessages: L(
    "{count} nieuwe berichten",
    "{count} new messages",
    "{count} neue Nachrichten",
    "{count} nouveaux messages"
  ),
  sellerProductsAwaiting: L(
    "{count} producten wachten op goedkeuring",
    "{count} products awaiting approval",
    "{count} Produkte warten auf Freigabe",
    "{count} produits en attente d’approbation"
  ),
  sellerOpenReturns: L(
    "{count} open retouren",
    "{count} open returns",
    "{count} offene Retouren",
    "{count} retours ouverts"
  ),
  sellerOpenReturnsLabel: L(
    "Open retouren",
    "Open returns",
    "Offene Retouren",
    "Retours ouverts"
  ),
  sellerOpenInvoices: L(
    "{count} open facturen",
    "{count} open invoices",
    "{count} offene Rechnungen",
    "{count} factures ouvertes"
  ),
  sellerOpenInvoicesLabel: L(
    "Open facturen",
    "Open invoices",
    "Offene Rechnungen",
    "Factures ouvertes"
  ),
  sellerInvoices: L("Facturen", "Invoices", "Rechnungen", "Factures"),
  sellerProductsInReview: L(
    "Producten in beoordeling",
    "Products under review",
    "Produkte in Prüfung",
    "Produits en cours d’examen"
  ),
  sellerReviewsAwaiting: L(
    "Reviews wachten op reactie",
    "Reviews awaiting reply",
    "Bewertungen warten auf Antwort",
    "Avis en attente de réponse"
  ),
  sellerPerformance: L(
    "Prestaties gekozen periode",
    "Performance for selected period",
    "Leistung im gewählten Zeitraum",
    "Performances de la période sélectionnée"
  ),
  sellerRevenueByMonth: L(
    "Omzet per maand (periode)",
    "Revenue by month (period)",
    "Umsatz pro Monat (Zeitraum)",
    "Chiffre d’affaires par mois (période)"
  ),
  sellerNoRevenue: L(
    "Geen omzet in deze periode.",
    "No revenue in this period.",
    "Kein Umsatz in diesem Zeitraum.",
    "Aucun chiffre d’affaires pour cette période."
  ),
  sellerMonth: L("Maand", "Month", "Monat", "Mois"),
  sellerShare: L("Aandeel", "Share", "Anteil", "Part"),

  periodToday: L("Vandaag", "Today", "Heute", "Aujourd’hui"),
  periodThisWeek: L("Deze week", "This week", "Diese Woche", "Cette semaine"),
  periodThisMonth: L(
    "Deze maand",
    "This month",
    "Dieser Monat",
    "Ce mois-ci"
  ),
  periodPreviousMonth: L(
    "Vorige maand",
    "Previous month",
    "Vorheriger Monat",
    "Mois précédent"
  ),
  periodThisQuarter: L(
    "Dit kwartaal",
    "This quarter",
    "Dieses Quartal",
    "Ce trimestre"
  ),
  periodThisYear: L("Dit jaar", "This year", "Dieses Jahr", "Cette année"),

  sellerRoleRetailerProducer: L(
    "Retailer + Producent",
    "Retailer + Producer",
    "Händler + Produzent",
    "Détaillant + Producteur"
  ),
  sellerRoleProducerBrand: L(
    "Producent/Merkhouder",
    "Producer/Brand owner",
    "Produzent/Markeninhaber",
    "Producteur/Propriétaire de marque"
  ),
  sellerRolePartner: L("Partner", "Partner", "Partner", "Partenaire"),

  // —— Document metadata ——
  metaSiteTitle: L(
    "EuropMade — Kwaliteitsproducten uit Europa",
    "EuropMade — Quality products from Europe",
    "EuropMade — Qualitätsprodukte aus Europa",
    "EuropMade — Produits de qualité d’Europe"
  ),
  metaSiteDescription: L(
    "Het meest transparante, betrouwbare en eerlijke marketplace-platform van Europa, voor producten die daadwerkelijk in Europa zijn geproduceerd.",
    "Europe’s most transparent, trustworthy and fair marketplace for products that are actually produced in Europe.",
    "Europas transparentester, vertrauenswürdigster und fairster Marktplatz für Produkte, die tatsächlich in Europa hergestellt werden.",
    "La marketplace la plus transparente, fiable et équitable d’Europe pour des produits réellement produits en Europe."
  ),

  // —— Shared portal chrome ——
  commonSearch: L("Zoeken", "Search", "Suchen", "Rechercher"),
  commonView: L("Bekijken", "View", "Ansehen", "Voir"),
  commonOpen: L("Openen", "Open", "Öffnen", "Ouvrir"),
  commonBack: L("Terug", "Back", "Zurück", "Retour"),
  commonNext: L("Volgende", "Next", "Weiter", "Suivant"),
  commonPrevious: L("← Terug", "← Back", "← Zurück", "← Retour"),
  commonSave: L("Opslaan", "Save", "Speichern", "Enregistrer"),
  commonSubmit: L("Versturen", "Send", "Senden", "Envoyer"),
  commonCancel: L("Annuleren", "Cancel", "Abbrechen", "Annuler"),
  commonAll: L("Alle", "All", "Alle", "Tous"),
  commonStatus: L("Status", "Status", "Status", "Statut"),
  commonDate: L("Datum", "Date", "Datum", "Date"),
  commonAmount: L("Bedrag", "Amount", "Betrag", "Montant"),
  commonSeller: L("Verkoper", "Seller", "Verkäufer", "Vendeur"),
  commonOrder: L("Order", "Order", "Bestellung", "Commande"),
  commonName: L("Naam", "Name", "Name", "Nom"),
  commonEmail: L("E-mail", "Email", "E-Mail", "E-mail"),
  commonActions: L("Acties", "Actions", "Aktionen", "Actions"),
  commonFilter: L("Filter", "Filter", "Filter", "Filtrer"),
  commonNoResults: L(
    "Geen resultaten in dit filter.",
    "No results for this filter.",
    "Keine Ergebnisse für diesen Filter.",
    "Aucun résultat pour ce filtre."
  ),
  commonLoadFailed: L(
    "Laden mislukt.",
    "Failed to load.",
    "Laden fehlgeschlagen.",
    "Échec du chargement."
  ),

  commonConfirm: L("Bevestigen", "Confirm", "Bestätigen", "Confirmer"),
  commonCustomer: L("Klant", "Customer", "Kunde", "Client"),
  commonLoading: L("Laden…", "Loading…", "Laden…", "Chargement…"),
  commonUnknown: L("Onbekend", "Unknown", "Unbekannt", "Inconnu"),
  commonTitle: L("Titel", "Title", "Titel", "Titre"),
  commonPrice: L("Prijs", "Price", "Preis", "Prix"),
  commonStock: L("Voorraad", "Stock", "Bestand", "Stock"),
  commonCategory: L("Categorie", "Category", "Kategorie", "Catégorie"),
  commonProduct: L("Product", "Product", "Produkt", "Produit"),
  commonQuantity: L("Aantal", "Quantity", "Menge", "Quantité"),
  commonSku: L("SKU", "SKU", "SKU", "SKU"),
  commonTotal: L("Totaal", "Total", "Gesamt", "Total"),
  commonBrand: L("Merk", "Brand", "Marke", "Marque"),
  commonPhone: L("Telefoonnummer", "Phone", "Telefonnummer", "Téléphone"),
  commonCountry: L("Land", "Country", "Land", "Pays"),
  commonFile: L("Bestand", "File", "Datei", "Fichier"),
  commonUpload: L("Uploaden", "Upload", "Hochladen", "Téléverser"),
  commonAvailable: L("Beschikbaar", "Available", "Verfügbar", "Disponible"),
  commonUnavailable: L(
    "Nog niet beschikbaar",
    "Not yet available",
    "Noch nicht verfügbar",
    "Pas encore disponible"
  ),
  commonOverview: L("Overzicht", "Overview", "Übersicht", "Aperçu"),
  commonSummary: L("Samenvatting", "Summary", "Zusammenfassung", "Résumé"),
  commonHistory: L("Historie", "History", "Historie", "Historique"),
  commonShortcuts: L("Snelkoppelingen", "Shortcuts", "Schnellzugriff", "Raccourcis"),
  commonViewArrow: L("Bekijken →", "View →", "Ansehen →", "Voir →"),
  commonOpenArrow: L("Openen →", "Open →", "Öffnen →", "Ouvrir →"),
  commonAdd: L("Toevoegen", "Add", "Hinzufügen", "Ajouter"),
  commonStart: L("Starten", "Start", "Starten", "Démarrer"),
  commonPause: L("Pauzeren", "Pause", "Pausieren", "Mettre en pause"),
  commonEnd: L("Beëindigen", "End", "Beenden", "Terminer"),
  commonNone: L("geen", "none", "keine", "aucun"),
  commonNotAvailableYet: L(
    "Nog niet beschikbaar",
    "Not available yet",
    "Noch nicht verfügbar",
    "Pas encore disponible"
  ),
  commonPageOf: L(
    "Pagina {current} / {total}",
    "Page {current} / {total}",
    "Seite {current} / {total}",
    "Page {current} / {total}"
  ),
  commonRangeOf: L(
    "{from}–{to} van {total}",
    "{from}–{to} of {total}",
    "{from}–{to} von {total}",
    "{from}–{to} sur {total}"
  ),
  commonCountOf: L(
    "{filtered} van {total}",
    "{filtered} of {total}",
    "{filtered} von {total}",
    "{filtered} sur {total}"
  ),
  commonSelected: L(
    "{count} geselecteerd",
    "{count} selected",
    "{count} ausgewählt",
    "{count} sélectionné(s)"
  ),
  commonEmptyFilter: L(
    "Geen resultaten",
    "No results",
    "Keine Ergebnisse",
    "Aucun résultat"
  ),
  commonEmptyFilterHint: L(
    "Pas je zoekopdracht of filters aan.",
    "Adjust your search or filters.",
    "Passe deine Suche oder Filter an.",
    "Ajustez votre recherche ou vos filtres."
  ),
  commonSubject: L("Onderwerp", "Subject", "Betreff", "Objet"),
  commonMessage: L("Bericht", "Message", "Nachricht", "Message"),
  commonUnread: L("Ongelezen", "Unread", "Ungelesen", "Non lu"),
  commonRead: L("Gelezen", "Read", "Gelesen", "Lu"),
  commonYou: L("Jij", "You", "Du", "Vous"),
  commonAttachment: L("Bijlage", "Attachment", "Anhang", "Pièce jointe"),
  commonReply: L("Antwoord", "Reply", "Antwort", "Réponse"),
  commonSaving: L("Opslaan…", "Saving…", "Speichern…", "Enregistrement…"),
  commonBusy: L("Bezig…", "Working…", "Beschäftigt…", "En cours…"),
  commonSearching: L("Zoeken…", "Searching…", "Suchen…", "Recherche…"),
  commonField: L("Veld", "Field", "Feld", "Champ"),
  commonNewValue: L("Nieuwe waarde", "New value", "Neuer Wert", "Nouvelle valeur"),
  commonLocation: L("Locatie", "Location", "Standort", "Emplacement"),
  commonStartDate: L("Startdatum", "Start date", "Startdatum", "Date de début"),
  commonEndDate: L("Einddatum", "End date", "Enddatum", "Date de fin"),
  commonDescription: L("Omschrijving", "Description", "Beschreibung", "Description"),
  commonRate: L("Tarief", "Rate", "Satz", "Taux"),
  commonBase: L("Basis", "Base", "Basis", "Base"),
  commonCommission: L("Commissie", "Commission", "Provision", "Commission"),
  commonPerWeek: L("/ week", "/ week", "/ Woche", "/ semaine"),
  commonPerDay: L("/dag", "/day", "/Tag", "/jour"),

  // —— Status presentation ——
  statusInTransit: L("Onderweg", "In transit", "Unterwegs", "En transit"),
  statusDelivered: L("Geleverd", "Delivered", "Geliefert", "Livré"),
  statusProcessing: L(
    "In behandeling",
    "Processing",
    "In Bearbeitung",
    "En cours"
  ),
  statusShipped: L("Verzonden", "Shipped", "Versandt", "Expédié"),
  statusNotShipped: L(
    "Nog niet verzonden",
    "Not yet shipped",
    "Noch nicht versandt",
    "Pas encore expédié"
  ),
  statusReturnRequested: L(
    "Retour aangemeld",
    "Return requested",
    "Retoure angemeldet",
    "Retour demandé"
  ),
  statusReturnCompleted: L(
    "Retour afgerond",
    "Return completed",
    "Retoure abgeschlossen",
    "Retour terminé"
  ),
  statusPaid: L("Betaald", "Paid", "Bezahlt", "Payé"),
  statusPaymentProcessing: L(
    "Betaling wordt verwerkt",
    "Payment processing",
    "Zahlung wird verarbeitet",
    "Paiement en cours"
  ),
  statusRequested: L("Aangevraagd", "Requested", "Beantragt", "Demandé"),
  statusConfirmed: L("Bevestigd", "Confirmed", "Bestätigt", "Confirmé"),
  statusReceived: L("Ontvangen", "Received", "Empfangen", "Reçu"),
  statusProcessed: L("Verwerkt", "Processed", "Verarbeitet", "Traité"),
  statusRejected: L("Afgewezen", "Rejected", "Abgelehnt", "Refusé"),
  statusEscalated: L("Geëscaleerd", "Escalated", "Eskaliert", "Escaladé"),
  statusAccepted: L("Geaccepteerd", "Accepted", "Akzeptiert", "Accepté"),
  statusActive: L("Actief", "Active", "Aktiv", "Actif"),
  statusDraft: L("Concept", "Draft", "Entwurf", "Brouillon"),
  statusLive: L("Live", "Live", "Live", "En ligne"),
  statusArchived: L("Gearchiveerd", "Archived", "Archiviert", "Archivé"),
  statusDraftChecked: L(
    "Concept gecontroleerd",
    "Draft checked",
    "Entwurf geprüft",
    "Brouillon vérifié"
  ),
  statusRetailerCreated: L(
    "Retailer Created",
    "Retailer created",
    "Retailer erstellt",
    "Créé par le détaillant"
  ),
  statusLinked: L("Gekoppeld", "Linked", "Verknüpft", "Lié"),
  statusAwaitingProducer: L(
    "Wacht op producent",
    "Awaiting producer",
    "Wartet auf Produzent",
    "En attente du producteur"
  ),
  statusUnderReview: L(
    "In beoordeling",
    "Under review",
    "In Prüfung",
    "En cours d’examen"
  ),
  statusConflict: L("Conflict", "Conflict", "Konflikt", "Conflit"),
  statusNotLinked: L(
    "Niet gekoppeld",
    "Not linked",
    "Nicht verknüpft",
    "Non lié"
  ),
  statusScheduled: L("Gepland", "Scheduled", "Geplant", "Planifié"),
  statusPaidOut: L("Uitbetaald", "Paid out", "Ausgezahlt", "Versé"),
  statusToInvoice: L(
    "Nog te factureren",
    "To be invoiced",
    "Noch zu fakturieren",
    "À facturer"
  ),
  statusInvoiced: L("Gefactureerd", "Invoiced", "Fakturiert", "Facturé"),
  statusOpen: L("Open", "Open", "Offen", "Ouvert"),
  statusCompleted: L("Afgerond", "Completed", "Abgeschlossen", "Terminé"),
  statusPaused: L("Gepauzeerd", "Paused", "Pausiert", "En pause"),
  statusEnded: L("Beëindigd", "Ended", "Beendet", "Terminé"),
  statusSubmitted: L("Ingediend", "Submitted", "Eingereicht", "Soumis"),
  statusApproved: L("Goedgekeurd", "Approved", "Genehmigt", "Approuvé"),
  statusApplicationRejected: L(
    "Afgekeurd",
    "Rejected",
    "Abgelehnt",
    "Refusé"
  ),
  statusAdditionalInfoRequired: L(
    "Aanvullende informatie vereist",
    "Additional information required",
    "Zusätzliche Informationen erforderlich",
    "Informations complémentaires requises"
  ),
  statusAnswered: L("Beantwoord", "Answered", "Beantwortet", "Répondu"),
  statusUnanswered: L(
    "Onbeantwoord",
    "Unanswered",
    "Unbeantwortet",
    "Sans réponse"
  ),

  statusInfoRequested: L(
    "Informatie gevraagd",
    "Information requested",
    "Informationen angefordert",
    "Informations demandées"
  ),

  // —— Seller module bodies ——
  sellerProductsIntro: L(
    "Zoeken, filteren, CSV-import en bulkacties.",
    "Search, filter, CSV import and bulk actions.",
    "Suchen, filtern, CSV-Import und Massenaktionen.",
    "Recherche, filtres, import CSV et actions groupées."
  ),
  sellerProductsCsvImport: L("CSV import", "CSV import", "CSV-Import", "Import CSV"),
  sellerProductsBulkEdit: L(
    "Bulk wijzigen",
    "Bulk edit",
    "Massenbearbeitung",
    "Modification groupée"
  ),
  sellerProductsBulkPublish: L(
    "Bulk publiceren",
    "Bulk publish",
    "Massenveröffentlichung",
    "Publication groupée"
  ),
  sellerProductsNew: L(
    "Nieuw product",
    "New product",
    "Neues Produkt",
    "Nouveau produit"
  ),
  sellerProductsCsvHint: L(
    "Kolommen: title/titel, ean/sku, price/prijs, stock/voorraad, category/categorie (scheidingsteken ; of ,).",
    "Columns: title/titel, ean/sku, price/prijs, stock/voorraad, category/categorie (separator ; or ,).",
    "Spalten: title/titel, ean/sku, price/prijs, stock/voorraad, category/categorie (Trennzeichen ; oder ,).",
    "Colonnes : title/titel, ean/sku, price/prijs, stock/voorraad, category/categorie (séparateur ; ou ,)."
  ),
  sellerProductsCsvFile: L(
    "CSV-bestand",
    "CSV file",
    "CSV-Datei",
    "Fichier CSV"
  ),
  sellerProductsCsvRequirement: L(
    "CSV, max. 5 MB",
    "CSV, max. 5 MB",
    "CSV, max. 5 MB",
    "CSV, max. 5 Mo"
  ),
  sellerProductsCsvHeaderError: L(
    "CSV moet een header en minstens één datarij bevatten.",
    "CSV must include a header and at least one data row.",
    "CSV muss eine Kopfzeile und mindestens eine Datenzeile enthalten.",
    "Le CSV doit contenir un en-tête et au moins une ligne de données."
  ),
  sellerProductsCsvColumnsError: L(
    "Verplichte kolommen ontbreken: title/titel en ean/sku.",
    "Required columns missing: title/titel and ean/sku.",
    "Pflichtspalten fehlen: title/titel und ean/sku.",
    "Colonnes obligatoires manquantes : title/titel et ean/sku."
  ),
  sellerProductsCsvTitleMissing: L(
    "Titel ontbreekt",
    "Title missing",
    "Titel fehlt",
    "Titre manquant"
  ),
  sellerProductsCsvEanInvalid: L(
    "EAN ongeldig",
    "Invalid EAN",
    "EAN ungültig",
    "EAN invalide"
  ),
  sellerProductsCsvEanExists: L(
    "EAN bestaat al",
    "EAN already exists",
    "EAN existiert bereits",
    "EAN déjà existant"
  ),
  sellerProductsCsvEanDuplicate: L(
    "Dubbele EAN in CSV",
    "Duplicate EAN in CSV",
    "Doppelte EAN in CSV",
    "EAN en double dans le CSV"
  ),
  sellerProductsCsvNoValid: L(
    "Geen geldige rijen om te importeren.",
    "No valid rows to import.",
    "Keine gültigen Zeilen zum Importieren.",
    "Aucune ligne valide à importer."
  ),
  sellerProductsCsvImported: L(
    "{count} producten geïmporteerd.",
    "{count} products imported.",
    "{count} Produkte importiert.",
    "{count} produits importés."
  ),
  sellerProductsSelectFirst: L(
    "Selecteer eerst producten.",
    "Select products first.",
    "Wähle zuerst Produkte aus.",
    "Sélectionnez d’abord des produits."
  ),
  sellerProductsSelectBulk: L(
    "Selecteer eerst producten voor bulk wijzigen.",
    "Select products first for bulk edit.",
    "Wähle zuerst Produkte für die Massenbearbeitung aus.",
    "Sélectionnez d’abord des produits pour la modification groupée."
  ),
  sellerProductsSelectPublish: L(
    "Selecteer eerst producten om te publiceren.",
    "Select products first to publish.",
    "Wähle zuerst Produkte zum Veröffentlichen aus.",
    "Sélectionnez d’abord des produits à publier."
  ),
  sellerProductsUpdated: L(
    "{count} producten bijgewerkt.",
    "{count} products updated.",
    "{count} Produkte aktualisiert.",
    "{count} produits mis à jour."
  ),
  sellerProductsPublished: L(
    "{count} producten gepubliceerd.",
    "{count} products published.",
    "{count} Produkte veröffentlicht.",
    "{count} produits publiés."
  ),
  sellerProductsCsvValidRows: L(
    "{valid} van {total} rijen geldig",
    "{valid} of {total} rows valid",
    "{valid} von {total} Zeilen gültig",
    "{valid} sur {total} lignes valides"
  ),
  sellerProductsCsvRun: L(
    "Import uitvoeren",
    "Run import",
    "Import ausführen",
    "Lancer l’import"
  ),
  sellerProductsBulkTitle: L(
    "Bulk wijzigen ({count} producten)",
    "Bulk edit ({count} products)",
    "Massenbearbeitung ({count} Produkte)",
    "Modification groupée ({count} produits)"
  ),
  sellerProductsBulkPrice: L(
    "Prijs wijzigen",
    "Change price",
    "Preis ändern",
    "Modifier le prix"
  ),
  sellerProductsBulkStock: L(
    "Voorraad wijzigen",
    "Change stock",
    "Bestand ändern",
    "Modifier le stock"
  ),
  sellerProductsBulkCategory: L(
    "Categorie wijzigen",
    "Change category",
    "Kategorie ändern",
    "Modifier la catégorie"
  ),
  sellerProductsBulkStatus: L(
    "Status wijzigen",
    "Change status",
    "Status ändern",
    "Modifier le statut"
  ),
  sellerProductsBulkPublishOption: L(
    "Publiceren",
    "Publish",
    "Veröffentlichen",
    "Publier"
  ),
  sellerProductsBulkOffline: L(
    "Offline zetten",
    "Take offline",
    "Offline setzen",
    "Mettre hors ligne"
  ),
  sellerProductsBulkPublishHint: L(
    "Geselecteerde producten worden live gezet.",
    "Selected products will go live.",
    "Ausgewählte Produkte werden live geschaltet.",
    "Les produits sélectionnés seront mis en ligne."
  ),
  sellerProductsBulkOfflineHint: L(
    "Geselecteerde producten worden offline (concept) gezet.",
    "Selected products will be set offline (draft).",
    "Ausgewählte Produkte werden offline (Entwurf) gesetzt.",
    "Les produits sélectionnés seront mis hors ligne (brouillon)."
  ),
  sellerProductsPlaceholderStatus: L(
    "bijv. Actief",
    "e.g. Active",
    "z. B. Aktiv",
    "ex. Actif"
  ),
  sellerProductsPlaceholderCategory: L(
    "bijv. Voeding > Snacks",
    "e.g. Food > Snacks",
    "z. B. Lebensmittel > Snacks",
    "ex. Alimentation > Snacks"
  ),
  sellerProductsPlaceholderPrice: L(
    "bijv. 12.95",
    "e.g. 12.95",
    "z. B. 12.95",
    "ex. 12.95"
  ),
  sellerProductsSearchPlaceholder: L(
    "Zoek op titel, EAN, status…",
    "Search by title, EAN, status…",
    "Nach Titel, EAN, Status suchen…",
    "Rechercher par titre, EAN, statut…"
  ),
  sellerProductsListing: L("Listing", "Listing", "Listing", "Annonce"),
  sellerProductsLifecycle: L("Lifecycle", "Lifecycle", "Lebenszyklus", "Cycle de vie"),
  sellerProductsInStock: L(
    "Op voorraad",
    "In stock",
    "Auf Lager",
    "En stock"
  ),
  sellerProductsOutOfStock: L(
    "Geen voorraad",
    "Out of stock",
    "Nicht vorrätig",
    "Rupture de stock"
  ),
  sellerProductsNoOffer: L(
    "Geen aanbod",
    "No offer",
    "Kein Angebot",
    "Aucune offre"
  ),
  sellerProductsEmptyTitle: L(
    "Geen producten",
    "No products",
    "Keine Produkte",
    "Aucun produit"
  ),
  sellerProductsEmptyDesc: L(
    "Importeer een CSV of voeg handmatig een nieuw product toe.",
    "Import a CSV or add a new product manually.",
    "Importiere eine CSV oder füge manuell ein neues Produkt hinzu.",
    "Importez un CSV ou ajoutez manuellement un nouveau produit."
  ),
  sellerProductsCsvImportAction: L(
    "CSV importeren",
    "Import CSV",
    "CSV importieren",
    "Importer CSV"
  ),
  sellerProductsSelectAll: L(
    "Selecteer alle",
    "Select all",
    "Alle auswählen",
    "Tout sélectionner"
  ),
  sellerProductsSelectOne: L(
    "Selecteer {title}",
    "Select {title}",
    "{title} auswählen",
    "Sélectionner {title}"
  ),
  sellerProductsEanId: L("EAN / ID", "EAN / ID", "EAN / ID", "EAN / ID"),
  sellerProductsCloudStatus: L(
    "Product Cloud Status",
    "Product Cloud status",
    "Product-Cloud-Status",
    "Statut Product Cloud"
  ),
  sellerProductsCount: L(
    "{filtered} van {total} producten",
    "{filtered} of {total} products",
    "{filtered} von {total} Produkten",
    "{filtered} sur {total} produits"
  ),
  sellerProductsUncategorized: L(
    "Nog niet ingedeeld",
    "Not yet categorized",
    "Noch nicht eingeordnet",
    "Pas encore classé"
  ),

  sellerOrdersIntro: L(
    "Bestellingen van klanten bij jouw verkopersaccount.",
    "Customer orders on your seller account.",
    "Kundenbestellungen auf deinem Verkäuferkonto.",
    "Commandes clients sur votre compte vendeur."
  ),
  sellerOrdersSearchPlaceholder: L(
    "Zoek op ordernummer of klant…",
    "Search by order number or customer…",
    "Nach Bestellnummer oder Kunde suchen…",
    "Rechercher par numéro de commande ou client…"
  ),
  sellerOrdersEmptyTitle: L(
    "Geen orders",
    "No orders",
    "Keine Bestellungen",
    "Aucune commande"
  ),
  sellerOrdersEmptyDesc: L(
    "Zodra klanten bestellen bij jouw winkel, verschijnen orders hier.",
    "Orders appear here once customers buy from your store.",
    "Sobald Kunden in deinem Shop bestellen, erscheinen Bestellungen hier.",
    "Les commandes apparaissent ici dès que des clients achètent dans votre boutique."
  ),
  sellerOrdersEmptyFilterHint: L(
    "Pas je zoekopdracht of statusfilter aan.",
    "Adjust your search or status filter.",
    "Passe deine Suche oder den Statusfilter an.",
    "Ajustez votre recherche ou le filtre de statut."
  ),
  sellerOrdersCount: L(
    "{from}–{to} van {total} orders",
    "{from}–{to} of {total} orders",
    "{from}–{to} von {total} Bestellungen",
    "{from}–{to} sur {total} commandes"
  ),
  sellerOrdersPrev: L("Vorige", "Previous", "Zurück", "Précédent"),

  sellerMessagesIntro: L(
    "Conversaties met klanten over orders en retouren.",
    "Conversations with customers about orders and returns.",
    "Unterhaltungen mit Kunden zu Bestellungen und Retouren.",
    "Conversations avec les clients sur les commandes et retours."
  ),
  sellerMessagesUnreadCount: L(
    "{count} ongelezen",
    "{count} unread",
    "{count} ungelesen",
    "{count} non lus"
  ),
  sellerMessagesNew: L(
    "Nieuw bericht",
    "New message",
    "Neue Nachricht",
    "Nouveau message"
  ),
  sellerMessagesCompose: L(
    "Nieuw bericht versturen",
    "Send a new message",
    "Neue Nachricht senden",
    "Envoyer un nouveau message"
  ),
  sellerMessagesLinkedOrder: L(
    "Gekoppelde order",
    "Linked order",
    "Verknüpfte Bestellung",
    "Commande liée"
  ),
  sellerMessagesSubjectPlaceholder: L(
    "Onderwerp van het bericht",
    "Message subject",
    "Betreff der Nachricht",
    "Objet du message"
  ),
  sellerMessagesBodyPlaceholder: L(
    "Schrijf je bericht…",
    "Write your message…",
    "Schreibe deine Nachricht…",
    "Écrivez votre message…"
  ),
  sellerMessagesFillRequired: L(
    "Vul order, onderwerp en bericht in.",
    "Fill in order, subject and message.",
    "Fülle Bestellung, Betreff und Nachricht aus.",
    "Renseignez commande, objet et message."
  ),
  sellerMessagesEmptyTitle: L(
    "Geen berichten",
    "No messages",
    "Keine Nachrichten",
    "Aucun message"
  ),
  sellerMessagesEmptyDesc: L(
    "Klantvragen over orders verschijnen hier. Je kunt ook zelf een nieuw bericht starten.",
    "Customer questions about orders appear here. You can also start a new message yourself.",
    "Kundenfragen zu Bestellungen erscheinen hier. Du kannst auch selbst eine neue Nachricht starten.",
    "Les questions clients sur les commandes apparaissent ici. Vous pouvez aussi démarrer un message."
  ),
  sellerMessagesCustomerFallback: L(
    "Klant",
    "Customer",
    "Kunde",
    "Client"
  ),
  sellerMessagesNotFoundTitle: L(
    "Bericht niet gevonden",
    "Message not found",
    "Nachricht nicht gefunden",
    "Message introuvable"
  ),
  sellerMessagesNotFoundDesc: L(
    "Deze conversatie bestaat niet.",
    "This conversation does not exist.",
    "Diese Unterhaltung existiert nicht.",
    "Cette conversation n’existe pas."
  ),
  sellerMessagesSent: L(
    "Bericht verzonden.",
    "Message sent.",
    "Nachricht gesendet.",
    "Message envoyé."
  ),
  sellerMessagesCustomerInfo: L(
    "Klantinformatie",
    "Customer information",
    "Kundeninformationen",
    "Informations client"
  ),
  sellerMessagesConversation: L(
    "Conversatie",
    "Conversation",
    "Unterhaltung",
    "Conversation"
  ),
  sellerMessagesReplyPlaceholder: L(
    "Schrijf een bericht…",
    "Write a message…",
    "Schreibe eine Nachricht…",
    "Écrivez un message…"
  ),
  sellerMessagesReturnLink: L(
    "Retour {id}",
    "Return {id}",
    "Retoure {id}",
    "Retour {id}"
  ),
  sellerMessagesAttachmentLabel: L(
    "Bijlage: {name}",
    "Attachment: {name}",
    "Anhang: {name}",
    "Pièce jointe : {name}"
  ),

  sellerReturnsIntro: L(
    "Beoordeel retouraanvragen: accepteren, afwijzen of informatie vragen.",
    "Review return requests: accept, reject or ask for information.",
    "Retourenanfragen prüfen: akzeptieren, ablehnen oder Informationen anfordern.",
    "Examinez les demandes de retour : accepter, refuser ou demander des informations."
  ),
  sellerReturnsEmptyTitle: L(
    "Geen retouren",
    "No returns",
    "Keine Retouren",
    "Aucun retour"
  ),
  sellerReturnsEmptyDesc: L(
    "Retouraanvragen van klanten verschijnen hier zodra ze zijn ingediend.",
    "Customer return requests appear here once submitted.",
    "Kundenretourenanfragen erscheinen hier, sobald sie eingereicht wurden.",
    "Les demandes de retour clients apparaissent ici une fois soumises."
  ),
  sellerReturnsNotFoundTitle: L(
    "Retour niet gevonden",
    "Return not found",
    "Retoure nicht gefunden",
    "Retour introuvable"
  ),
  sellerReturnsNotFoundDesc: L(
    "Deze retour bestaat niet.",
    "This return does not exist.",
    "Diese Retoure existiert nicht.",
    "Ce retour n’existe pas."
  ),
  sellerReturnsSection: L("Retour", "Return", "Retoure", "Retour"),
  sellerReturnsNumber: L(
    "Retournummer",
    "Return number",
    "Retourenummer",
    "Numéro de retour"
  ),
  sellerReturnsOrderNumber: L(
    "Ordernummer",
    "Order number",
    "Bestellnummer",
    "Numéro de commande"
  ),
  sellerReturnsReasonComments: L(
    "Reden & opmerkingen",
    "Reason & comments",
    "Grund & Anmerkungen",
    "Motif et commentaires"
  ),
  sellerReturnsPhotos: L("Foto's", "Photos", "Fotos", "Photos"),
  sellerReturnsOpenMessage: L(
    "Gekoppeld bericht openen",
    "Open linked message",
    "Verknüpfte Nachricht öffnen",
    "Ouvrir le message lié"
  ),
  sellerReturnsAccept: L("Accepteren", "Accept", "Akzeptieren", "Accepter"),
  sellerReturnsReject: L("Afwijzen", "Reject", "Ablehnen", "Refuser"),
  sellerReturnsSetProcessing: L(
    "Status: In behandeling",
    "Status: Processing",
    "Status: In Bearbeitung",
    "Statut : En cours"
  ),
  sellerReturnsAskInfo: L(
    "Aanvullende informatie vragen",
    "Request additional information",
    "Zusätzliche Informationen anfordern",
    "Demander des informations complémentaires"
  ),
  sellerReturnsAskInfoPlaceholder: L(
    "Vraag aan de klant…",
    "Ask the customer…",
    "Frage an den Kunden…",
    "Question au client…"
  ),
  sellerReturnsSendRequest: L(
    "Verstuur verzoek",
    "Send request",
    "Anfrage senden",
    "Envoyer la demande"
  ),
  sellerReturnsAccepted: L(
    "Retour geaccepteerd.",
    "Return accepted.",
    "Retoure akzeptiert.",
    "Retour accepté."
  ),
  sellerReturnsRejected: L(
    "Retour afgewezen.",
    "Return rejected.",
    "Retoure abgelehnt.",
    "Retour refusé."
  ),
  sellerReturnsProcessingNote: L(
    "Status gewijzigd naar In behandeling.",
    "Status changed to Processing.",
    "Status auf In Bearbeitung geändert.",
    "Statut modifié en En cours."
  ),
  sellerReturnsInfoSent: L(
    "Informatieverzoek verstuurd: “{text}”",
    "Information request sent: “{text}”",
    "Informationsanfrage gesendet: „{text}“",
    "Demande d’informations envoyée : « {text} »"
  ),
  sellerReturnsOrderCustomer: L(
    "Order #{order} · {customer}",
    "Order #{order} · {customer}",
    "Bestellung #{order} · {customer}",
    "Commande #{order} · {customer}"
  ),

  sellerMarketingIntro: L(
    "Banners, sponsored products, affiliate-commissies en marketingfacturen.",
    "Banners, sponsored products, affiliate commissions and marketing invoices.",
    "Banner, Sponsored Products, Affiliate-Provisionen und Marketingrechnungen.",
    "Bannières, produits sponsorisés, commissions d’affiliation et factures marketing."
  ),
  sellerMarketingModules: L(
    "Marketplace-modules",
    "Marketplace modules",
    "Marketplace-Module",
    "Modules marketplace"
  ),
  sellerMktBannerTitle: L(
    "Banner Campagnes",
    "Banner campaigns",
    "Banner-Kampagnen",
    "Campagnes bannières"
  ),
  sellerMktBannerDesc: L(
    "Beheer banners voor homepage, categorie, zoek en product.",
    "Manage banners for homepage, category, search and product.",
    "Verwalte Banner für Homepage, Kategorie, Suche und Produkt.",
    "Gérez les bannières pour l’accueil, catégorie, recherche et produit."
  ),
  sellerMktSponsoredTitle: L(
    "Sponsored Products",
    "Sponsored products",
    "Sponsored Products",
    "Produits sponsorisés"
  ),
  sellerMktSponsoredDesc: L(
    "Campagnes met CPC, budget en looptijd.",
    "Campaigns with CPC, budget and duration.",
    "Kampagnen mit CPC, Budget und Laufzeit.",
    "Campagnes avec CPC, budget et durée."
  ),
  sellerMktAffiliateTitle: L(
    "Affiliate Programma",
    "Affiliate programme",
    "Affiliate-Programm",
    "Programme d’affiliation"
  ),
  sellerMktAffiliateDesc: L(
    "Stel commissies in op standaard-, categorie- en productniveau.",
    "Set commissions at default, category and product level.",
    "Lege Provisionen auf Standard-, Kategorie- und Produktebene fest.",
    "Définissez les commissions aux niveaux standard, catégorie et produit."
  ),
  sellerMktBillingTitle: L(
    "Marketing Facturen",
    "Marketing invoices",
    "Marketingrechnungen",
    "Factures marketing"
  ),
  sellerMktBillingDesc: L(
    "Openstaande en betaalde marketingkosten.",
    "Outstanding and paid marketing costs.",
    "Offene und bezahlte Marketingkosten.",
    "Coûts marketing ouverts et payés."
  ),

  sellerFinanceIntro: L(
    "Saldo, uitbetalingen, commissies en marketingkosten.",
    "Balance, payouts, commissions and marketing costs.",
    "Saldo, Auszahlungen, Provisionen und Marketingkosten.",
    "Solde, versements, commissions et coûts marketing."
  ),
  sellerFinanceAvailableBalance: L(
    "Beschikbaar saldo",
    "Available balance",
    "Verfügbares Guthaben",
    "Solde disponible"
  ),
  sellerFinanceNextPayout: L(
    "Volgende uitbetaling",
    "Next payout",
    "Nächste Auszahlung",
    "Prochain versement"
  ),
  sellerFinanceOnDate: L(
    "Op {date}",
    "On {date}",
    "Am {date}",
    "Le {date}"
  ),
  sellerFinancePayouts: L(
    "Uitbetalingen",
    "Payouts",
    "Auszahlungen",
    "Versements"
  ),
  sellerFinanceOpenCommissions: L(
    "Open commissies",
    "Open commissions",
    "Offene Provisionen",
    "Commissions ouvertes"
  ),
  sellerFinanceCommission: L(
    "Commissie",
    "Commission",
    "Provision",
    "Commission"
  ),
  sellerFinanceMarketingCosts: L(
    "Marketingkosten",
    "Marketing costs",
    "Marketingkosten",
    "Coûts marketing"
  ),
  sellerFinanceMarketingInvoices: L(
    "Marketing facturen",
    "Marketing invoices",
    "Marketingrechnungen",
    "Factures marketing"
  ),
  sellerFinanceRevenueHistory: L(
    "Omzethistorie",
    "Revenue history",
    "Umsatzhistorie",
    "Historique du chiffre d’affaires"
  ),
  sellerFinanceOpenPayouts: L(
    "Open uitbetalingen",
    "Open payouts",
    "Offene Auszahlungen",
    "Versements ouverts"
  ),
  sellerFinanceCommissionOverview: L(
    "Commissie-overzicht",
    "Commission overview",
    "Provisionsübersicht",
    "Aperçu des commissions"
  ),
  sellerFinanceDownloadInvoices: L(
    "Facturen downloaden",
    "Download invoices",
    "Rechnungen herunterladen",
    "Télécharger les factures"
  ),
  sellerFinanceVatOss: L(
    "BTW-overzicht (OSS)",
    "VAT overview (OSS)",
    "MwSt.-Übersicht (OSS)",
    "Aperçu TVA (OSS)"
  ),
  sellerFinancePayoutsIntro: L(
    "Geplande en uitgevoerde uitbetalingen naar jouw bankrekening.",
    "Scheduled and completed payouts to your bank account.",
    "Geplante und ausgeführte Auszahlungen auf dein Bankkonto.",
    "Versements planifiés et effectués vers votre compte bancaire."
  ),
  sellerFinancePayoutsEmptyTitle: L(
    "Geen uitbetalingen",
    "No payouts",
    "Keine Auszahlungen",
    "Aucun versement"
  ),
  sellerFinancePayoutsEmptyDesc: L(
    "Uitbetalingen verschijnen hier zodra er een beschikbaar saldo is.",
    "Payouts appear here once an available balance exists.",
    "Auszahlungen erscheinen hier, sobald ein verfügbares Guthaben besteht.",
    "Les versements apparaissent ici dès qu’un solde disponible existe."
  ),
  sellerFinanceCommissionIntro: L(
    "Ingehouden platformcommissie per order.",
    "Platform commission withheld per order.",
    "Einbehaltene Plattformprovision pro Bestellung.",
    "Commission plateforme retenue par commande."
  ),
  sellerFinanceCommissionEmptyTitle: L(
    "Geen commissies",
    "No commissions",
    "Keine Provisionen",
    "Aucune commission"
  ),
  sellerFinanceCommissionEmptyDesc: L(
    "Commissieregels verschijnen hier zodra er betaalde orders zijn.",
    "Commission lines appear here once there are paid orders.",
    "Provisionszeilen erscheinen hier, sobald bezahlte Bestellungen vorliegen.",
    "Les lignes de commission apparaissent ici dès qu’il y a des commandes payées."
  ),
  sellerFinanceInvoicesIntro: L(
    "Jij bent juridisch de verkoper. Upload of koppel jouw eigen klantfacturen — EuropMade genereert deze niet.",
    "You are the legal seller. Upload or link your own customer invoices — EuropMade does not generate them.",
    "Du bist der rechtliche Verkäufer. Lade deine eigenen Kundenrechnungen hoch oder verknüpfe sie — EuropMade erstellt sie nicht.",
    "Vous êtes le vendeur juridique. Téléversez ou liez vos propres factures clients — EuropMade ne les génère pas."
  ),
  sellerFinanceInvoicesUpload: L(
    "Factuur uploaden / koppelen",
    "Upload / link invoice",
    "Rechnung hochladen / verknüpfen",
    "Téléverser / lier une facture"
  ),
  sellerFinanceInvoiceFile: L(
    "Factuurbestand",
    "Invoice file",
    "Rechnungsdatei",
    "Fichier facture"
  ),
  sellerFinanceInvoiceRequirement: L(
    "PDF, max. 10 MB",
    "PDF, max. 10 MB",
    "PDF, max. 10 MB",
    "PDF, max. 10 Mo"
  ),
  sellerFinanceInvoiceLink: L("Koppelen", "Link", "Verknüpfen", "Lier"),
  sellerFinanceInvoiceNeedOrderFile: L(
    "Kies een order en upload een factuurbestand.",
    "Choose an order and upload an invoice file.",
    "Wähle eine Bestellung und lade eine Rechnungsdatei hoch.",
    "Choisissez une commande et téléversez un fichier facture."
  ),
  sellerFinanceInvoiceLinked: L(
    "Factuur gekoppeld aan order. EuropMade genereert geen klantfacturen.",
    "Invoice linked to order. EuropMade does not generate customer invoices.",
    "Rechnung mit Bestellung verknüpft. EuropMade erstellt keine Kundenrechnungen.",
    "Facture liée à la commande. EuropMade ne génère pas de factures clients."
  ),
  sellerFinanceInvoicesEmptyTitle: L(
    "Geen facturen",
    "No invoices",
    "Keine Rechnungen",
    "Aucune facture"
  ),
  sellerFinanceInvoicesEmptyDesc: L(
    "Upload jouw eigen klantfacturen en koppel ze aan orders.",
    "Upload your own customer invoices and link them to orders.",
    "Lade deine eigenen Kundenrechnungen hoch und verknüpfe sie mit Bestellungen.",
    "Téléversez vos propres factures clients et liez-les aux commandes."
  ),
  sellerFinanceUploadedAt: L(
    "Geüpload",
    "Uploaded",
    "Hochgeladen",
    "Téléversé"
  ),
  sellerFinanceVatIntro: L(
    "Omzet en BTW per EU-land voor One-Stop-Shop rapportage.",
    "Revenue and VAT per EU country for One-Stop-Shop reporting.",
    "Umsatz und MwSt. pro EU-Land für One-Stop-Shop-Meldung.",
    "Chiffre d’affaires et TVA par pays UE pour le reporting One-Stop-Shop."
  ),
  sellerFinanceVatEmptyTitle: L(
    "Geen BTW-gegevens",
    "No VAT data",
    "Keine MwSt.-Daten",
    "Aucune donnée TVA"
  ),
  sellerFinanceVatEmptyDesc: L(
    "OSS-regels verschijnen hier zodra er grensoverschrijdende verkopen zijn.",
    "OSS lines appear here once there are cross-border sales.",
    "OSS-Zeilen erscheinen hier, sobald grenzüberschreitende Verkäufe vorliegen.",
    "Les lignes OSS apparaissent ici dès qu’il y a des ventes transfrontalières."
  ),
  sellerFinanceVatRate: L("Tarief", "Rate", "Satz", "Taux"),
  sellerFinanceVatBase: L(
    "Grondslag",
    "Taxable base",
    "Bemessungsgrundlage",
    "Base taxable"
  ),
  sellerFinanceVatLabel: L("BTW", "VAT", "MwSt.", "TVA"),
  sellerFinanceVatOssShort: L("BTW (OSS)", "VAT (OSS)", "MwSt. (OSS)", "TVA (OSS)"),

  sellerReviewsIntro: L(
    "Filter op onbeantwoord en sterren. Beantwoord reviews vanuit dit overzicht.",
    "Filter by unanswered and stars. Reply to reviews from this overview.",
    "Filtere nach unbeantwortet und Sternen. Beantworte Bewertungen aus dieser Übersicht.",
    "Filtrez par sans réponse et étoiles. Répondez aux avis depuis cet aperçu."
  ),
  sellerReviewsTotal: L(
    "Totaal reviews",
    "Total reviews",
    "Bewertungen gesamt",
    "Total des avis"
  ),
  sellerReviewsAverage: L(
    "Gemiddelde score",
    "Average score",
    "Durchschnittliche Bewertung",
    "Note moyenne"
  ),
  sellerReviewsAwaitingReply: L(
    "Wachten op reactie",
    "Awaiting reply",
    "Warten auf Antwort",
    "En attente de réponse"
  ),
  sellerReviewsSearchPlaceholder: L(
    "Zoek in tekst of product…",
    "Search in text or product…",
    "In Text oder Produkt suchen…",
    "Rechercher dans le texte ou le produit…"
  ),
  sellerReviewsStar: L("1 ster", "1 star", "1 Stern", "1 étoile"),
  sellerReviewsStars: L(
    "{count} sterren",
    "{count} stars",
    "{count} Sterne",
    "{count} étoiles"
  ),
  sellerReviewsEmptyTitle: L(
    "Geen reviews",
    "No reviews",
    "Keine Bewertungen",
    "Aucun avis"
  ),
  sellerReviewsEmptyDesc: L(
    "Zodra klanten reviews achterlaten, verschijnen ze hier.",
    "Reviews appear here once customers leave them.",
    "Sobald Kunden Bewertungen hinterlassen, erscheinen sie hier.",
    "Les avis apparaissent ici dès que des clients en laissent."
  ),
  sellerReviewsYourReply: L(
    "Jouw reactie: {reply}",
    "Your reply: {reply}",
    "Deine Antwort: {reply}",
    "Votre réponse : {reply}"
  ),
  sellerReviewsReplyLabel: L(
    "Jouw reactie",
    "Your reply",
    "Deine Antwort",
    "Votre réponse"
  ),
  sellerReviewsReplyPlaceholder: L(
    "Schrijf een reactie…",
    "Write a reply…",
    "Schreibe eine Antwort…",
    "Écrivez une réponse…"
  ),
  sellerReviewsReplyAction: L(
    "Beantwoorden",
    "Reply",
    "Antworten",
    "Répondre"
  ),
  sellerReviewsReplySaved: L(
    "Reactie opgeslagen (demo).",
    "Reply saved (demo).",
    "Antwort gespeichert (Demo).",
    "Réponse enregistrée (démo)."
  ),

  sellerSettingsIntro: L(
    "Bedrijf, bank, BTW, branding, adressen, notificaties en beveiliging.",
    "Company, bank, VAT, branding, addresses, notifications and security.",
    "Unternehmen, Bank, MwSt., Branding, Adressen, Benachrichtigungen und Sicherheit.",
    "Entreprise, banque, TVA, image de marque, adresses, notifications et sécurité."
  ),
  sellerSettingsNavAria: L(
    "Instellingen submenu",
    "Settings submenu",
    "Einstellungen-Untermenü",
    "Sous-menu paramètres"
  ),
  sellerSettingsCompany: L(
    "Bedrijfsgegevens",
    "Company details",
    "Unternehmensdaten",
    "Coordonnées de l’entreprise"
  ),
  sellerSettingsBank: L(
    "Bankrekening",
    "Bank account",
    "Bankkonto",
    "Compte bancaire"
  ),
  sellerSettingsVat: L("BTW", "VAT", "MwSt.", "TVA"),
  sellerSettingsLogo: L("Logo", "Logo", "Logo", "Logo"),
  sellerSettingsBanner: L("Banner", "Banner", "Banner", "Bannière"),
  sellerSettingsReturnAddress: L(
    "Retouradres",
    "Return address",
    "Retouradresse",
    "Adresse de retour"
  ),
  sellerSettingsShippingAddress: L(
    "Verzendadres",
    "Shipping address",
    "Lieferadresse",
    "Adresse de livraison"
  ),
  sellerSettingsNotifications: L(
    "Notificaties",
    "Notifications",
    "Benachrichtigungen",
    "Notifications"
  ),
  sellerSettingsSecurity: L(
    "Beveiliging",
    "Security",
    "Sicherheit",
    "Sécurité"
  ),
  sellerSettingsApiKeys: L("API Keys", "API keys", "API-Schlüssel", "Clés API"),
  sellerSettingsCompanyName: L(
    "Bedrijfsnaam",
    "Company name",
    "Firmenname",
    "Nom de l’entreprise"
  ),
  sellerSettingsKvk: L("KvK", "Chamber of Commerce", "Handelsregister", "RCS"),
  sellerSettingsRoles: L("Rollen", "Roles", "Rollen", "Rôles"),
  sellerSettingsRoleRetailer: L(
    "Retailer",
    "Retailer",
    "Händler",
    "Détaillant"
  ),
  sellerSettingsRecommendedFormat: L(
    "Aanbevolen formaat",
    "Recommended format",
    "Empfohlenes Format",
    "Format recommandé"
  ),
  sellerSettingsUsage: L("Toepassing", "Usage", "Verwendung", "Utilisation"),
  sellerSettingsLogoReq: L(
    "PNG of SVG, max. 5 MB",
    "PNG or SVG, max. 5 MB",
    "PNG oder SVG, max. 5 MB",
    "PNG ou SVG, max. 5 Mo"
  ),
  sellerSettingsBannerReq: L(
    "PNG of JPG, max. 10 MB",
    "PNG or JPG, max. 10 MB",
    "PNG oder JPG, max. 10 MB",
    "PNG ou JPG, max. 10 Mo"
  ),
  sellerSettingsLogoUpload: L(
    "Logo uploaden",
    "Upload logo",
    "Logo hochladen",
    "Téléverser le logo"
  ),
  sellerSettingsBannerUpload: L(
    "Banner uploaden",
    "Upload banner",
    "Banner hochladen",
    "Téléverser la bannière"
  ),
  sellerSettingsLogoUseProfile: L(
    "Seller profiel",
    "Seller profile",
    "Verkäuferprofil",
    "Profil vendeur"
  ),
  sellerSettingsLogoUsePdp: L(
    "Productpagina",
    "Product page",
    "Produktseite",
    "Page produit"
  ),
  sellerSettingsLogoUseSearch: L(
    "Zoekresultaten",
    "Search results",
    "Suchergebnisse",
    "Résultats de recherche"
  ),
  sellerSettingsBannerUseHome: L(
    "Seller homepage",
    "Seller homepage",
    "Verkäufer-Homepage",
    "Page d’accueil vendeur"
  ),
  sellerSettingsBannerUseShop: L(
    "Winkelpagina",
    "Shop page",
    "Shopseite",
    "Page boutique"
  ),
  sellerSettingsBannerUseMarketing: L(
    "Marketingpagina",
    "Marketing page",
    "Marketingseite",
    "Page marketing"
  ),
  sellerSettingsNotifyOrder: L(
    "E-mail bij nieuwe order",
    "Email on new order",
    "E-Mail bei neuer Bestellung",
    "E-mail pour nouvelle commande"
  ),
  sellerSettingsNotifyMessage: L(
    "E-mail bij nieuw bericht",
    "Email on new message",
    "E-Mail bei neuer Nachricht",
    "E-mail pour nouveau message"
  ),
  sellerSettingsNotifyReturn: L(
    "E-mail bij retouraanvraag",
    "Email on return request",
    "E-Mail bei Retourenanfrage",
    "E-mail pour demande de retour"
  ),
  sellerSettingsPasswordChanged: L(
    "Wachtwoord laatst gewijzigd: 12 juni 2026",
    "Password last changed: 12 June 2026",
    "Passwort zuletzt geändert: 12. Juni 2026",
    "Mot de passe modifié le : 12 juin 2026"
  ),
  sellerSettings2faOff: L(
    "Tweestapsverificatie: Uit",
    "Two-factor authentication: Off",
    "Zwei-Faktor-Authentifizierung: Aus",
    "Authentification à deux facteurs : Désactivée"
  ),
  sellerSettingsChangePassword: L(
    "Wachtwoord wijzigen",
    "Change password",
    "Passwort ändern",
    "Changer le mot de passe"
  ),
  sellerSettingsApiEmpty: L(
    "Nog geen API-sleutels. Genereer een sleutel wanneer de integratie-API live is.",
    "No API keys yet. Generate a key when the integration API is live.",
    "Noch keine API-Schlüssel. Erzeuge einen Schlüssel, wenn die Integrations-API live ist.",
    "Pas encore de clés API. Générez une clé lorsque l’API d’intégration est en ligne."
  ),
  sellerSettingsNewKey: L(
    "Nieuwe sleutel",
    "New key",
    "Neuer Schlüssel",
    "Nouvelle clé"
  ),
  sellerSettingsSavedDemo: L(
    "{label} lokaal bijgewerkt (demo).",
    "{label} updated locally (demo).",
    "{label} lokal aktualisiert (Demo).",
    "{label} mis à jour localement (démo)."
  ),
  sellerSettingsMax5mb: L(
    "Maximaal 5 MB",
    "Maximum 5 MB",
    "Maximal 5 MB",
    "Maximum 5 Mo"
  ),
  sellerSettingsMax10mb: L(
    "Maximaal 10 MB",
    "Maximum 10 MB",
    "Maximal 10 MB",
    "Maximum 10 Mo"
  ),
  sellerSettingsPngSvg: L("PNG of SVG", "PNG or SVG", "PNG oder SVG", "PNG ou SVG"),
  sellerSettingsPngJpg: L("PNG of JPG", "PNG or JPG", "PNG oder JPG", "PNG ou JPG"),

  sellerOrderNotFoundTitle: L(
    "Order niet gevonden",
    "Order not found",
    "Bestellung nicht gefunden",
    "Commande introuvable"
  ),
  sellerOrderNotFoundDesc: L(
    "Deze order bestaat niet of is niet meer beschikbaar.",
    "This order does not exist or is no longer available.",
    "Diese Bestellung existiert nicht oder ist nicht mehr verfügbar.",
    "Cette commande n'existe pas ou n'est plus disponible."
  ),
  sellerOrderBackToOrders: L(
    "Terug naar orders",
    "Back to orders",
    "Zurück zu Bestellungen",
    "Retour aux commandes"
  ),
  sellerOrderTitle: L(
    "Order #{number}",
    "Order #{number}",
    "Bestellung #{number}",
    "Commande #{number}"
  ),
  sellerOrderDownloadInvoice: L(
    "Download factuur",
    "Download invoice",
    "Rechnung herunterladen",
    "Télécharger la facture"
  ),
  sellerOrderDownloadPacking: L(
    "Download pakbon",
    "Download packing slip",
    "Lieferschein herunterladen",
    "Télécharger le bon de livraison"
  ),
  sellerOrderDownloaded: L(
    "{label} gedownload (demo).",
    "{label} downloaded (demo).",
    "{label} heruntergeladen (Demo).",
    "{label} téléchargé (démo)."
  ),
  sellerOrderInvoiceLabel: L("Factuur", "Invoice", "Rechnung", "Facture"),
  sellerOrderPackingLabel: L("Pakbon", "Packing slip", "Lieferschein", "Bon de livraison"),
  sellerOrderDate: L("Orderdatum", "Order date", "Bestelldatum", "Date de commande"),
  sellerOrderPaymentStatus: L(
    "Betaalstatus",
    "Payment status",
    "Zahlungsstatus",
    "Statut de paiement"
  ),
  sellerOrderShippingStatus: L(
    "Verzendstatus",
    "Shipping status",
    "Versandstatus",
    "Statut d'expédition"
  ),
  sellerOrderFinancial: L("Financieel", "Financial", "Finanzen", "Financier"),
  sellerOrderSubtotal: L("Subtotaal", "Subtotal", "Zwischensumme", "Sous-total"),
  sellerOrderShippingCost: L(
    "Verzendkosten",
    "Shipping cost",
    "Versandkosten",
    "Frais de port"
  ),
  sellerOrderGrandTotal: L(
    "Totaalbedrag",
    "Grand total",
    "Gesamtbetrag",
    "Montant total"
  ),
  sellerOrderShipping: L("Verzending", "Shipping", "Versand", "Expédition"),
  sellerOrderCarrier: L("Vervoerder", "Carrier", "Spediteur", "Transporteur"),
  sellerOrderTracking: L(
    "Track & trace",
    "Track & trace",
    "Sendungsverfolgung",
    "Suivi"
  ),
  sellerOrderMessages: L("Berichten:", "Messages:", "Nachrichten:", "Messages :"),
  sellerOrderReturns: L("Retouren:", "Returns:", "Retouren:", "Retours :"),
  sellerOrderBillingAddress: L(
    "Factuuradres",
    "Billing address",
    "Rechnungsadresse",
    "Adresse de facturation"
  ),

  sellerProductAddTitle: L(
    "Product toevoegen — EAN-zoeken",
    "Add product — EAN search",
    "Produkt hinzufügen — EAN-Suche",
    "Ajouter un produit — recherche EAN"
  ),
  sellerProductAddIntro: L(
    "Zoek op EAN/GTIN om te controleren of dit product al in de Product Cloud bestaat.",
    "Search by EAN/GTIN to check whether this product already exists in the Product Cloud.",
    "Suche nach EAN/GTIN, um zu prüfen, ob dieses Produkt bereits in der Product Cloud existiert.",
    "Recherchez par EAN/GTIN pour vérifier si ce produit existe déjà dans la Product Cloud."
  ),
  sellerProductAddEanLabel: L("EAN / GTIN", "EAN / GTIN", "EAN / GTIN", "EAN / GTIN"),
  sellerProductAddEanHint: L(
    "Sterkste matchsleutel (Product Cloud Architecture Deel 2.4). Geen EAN? Gebruik MPN via 'Nieuw product aanmaken'.",
    "Strongest match key (Product Cloud Architecture part 2.4). No EAN? Use MPN via 'Create new product'.",
    "Stärkster Match-Schlüssel (Product Cloud Architecture Teil 2.4). Keine EAN? Nutze MPN über 'Neues Produkt anlegen'.",
    "Clé de correspondance la plus forte (Product Cloud Architecture partie 2.4). Pas d'EAN ? Utilisez le MPN via 'Créer un nouveau produit'."
  ),
  sellerProductAddEanRequired: L(
    "Vul een EAN / GTIN in.",
    "Enter an EAN / GTIN.",
    "Gib eine EAN / GTIN ein.",
    "Saisissez un EAN / GTIN."
  ),
  sellerProductAddSearchFailed: L(
    "Zoeken mislukt. Probeer opnieuw.",
    "Search failed. Try again.",
    "Suche fehlgeschlagen. Bitte erneut versuchen.",
    "Échec de la recherche. Réessayez."
  ),
  sellerProductAddResultHint: L(
    "Resultaat verschijnt hieronder zodra gezocht is — zie 'Match gevonden' / 'Geen match gevonden' in deze wireframe-groep.",
    "Results appear below once you search — see 'Match found' / 'No match found' in this wireframe group.",
    "Ergebnis erscheint unten nach der Suche — siehe 'Match gefunden' / 'Kein Match gefunden' in dieser Wireframe-Gruppe.",
    "Le résultat apparaît ci-dessous après la recherche — voir 'Correspondance trouvée' / 'Aucune correspondance' dans ce groupe de wireframes."
  ),
  sellerProductMatchFound: L(
    "Match gevonden",
    "Match found",
    "Match gefunden",
    "Correspondance trouvée"
  ),
  sellerProductMatchFoundIntro: L(
    "Dit product bestaat al in de Product Cloud — koppel je aanbod eraan.",
    "This product already exists in the Product Cloud — link your offer to it.",
    "Dieses Produkt existiert bereits in der Product Cloud — verknüpfe dein Angebot damit.",
    "Ce produit existe déjà dans la Product Cloud — liez-y votre offre."
  ),
  sellerProductFound: L(
    "Gevonden product",
    "Found product",
    "Gefundenes Produkt",
    "Produit trouvé"
  ),
  sellerProductYourOffer: L(
    "Jouw aanbod — commerciële gegevens",
    "Your offer — commercial data",
    "Dein Angebot — kommerzielle Daten",
    "Votre offre — données commerciales"
  ),
  sellerProductOfferNextNotice: L(
    "Prijs en voorraad stel je in op het volgende scherm (Commerce Cloud Offer).",
    "Set price and stock on the next screen (Commerce Cloud Offer).",
    "Preis und Bestand legst du auf dem nächsten Bildschirm fest (Commerce Cloud Offer).",
    "Définissez le prix et le stock sur l'écran suivant (Commerce Cloud Offer)."
  ),
  sellerProductBackToSearch: L(
    "Terug naar zoeken",
    "Back to search",
    "Zurück zur Suche",
    "Retour à la recherche"
  ),
  sellerProductCreateOffer: L(
    "Aanbod aanmaken",
    "Create offer",
    "Angebot erstellen",
    "Créer une offre"
  ),
  sellerProductIdentifierMissing: L(
    "Identifier ontbreekt — zoek opnieuw of neem contact op.",
    "Identifier missing — search again or contact support.",
    "Identifier fehlt — erneut suchen oder Support kontaktieren.",
    "Identifiant manquant — recherchez à nouveau ou contactez le support."
  ),
  sellerProductNoMatch: L(
    "Geen match gevonden",
    "No match found",
    "Kein Match gefunden",
    "Aucune correspondance"
  ),
  sellerProductNoMatchIntro: L(
    "Er bestaat nog geen product met dit EAN in de Product Cloud.",
    "No product with this EAN exists yet in the Product Cloud.",
    "Es existiert noch kein Produkt mit dieser EAN in der Product Cloud.",
    "Aucun produit avec cet EAN n'existe encore dans la Product Cloud."
  ),
  sellerProductNoMatchHint: L(
    "Controleer het ingevoerde EAN ({ean}), of maak een nieuw product aan als dit de eerste keer is dat dit product wordt aangeboden.",
    "Check the entered EAN ({ean}), or create a new product if this is the first time it is offered.",
    "Prüfe die eingegebene EAN ({ean}), oder lege ein neues Produkt an, wenn es zum ersten Mal angeboten wird.",
    "Vérifiez l'EAN saisi ({ean}), ou créez un nouveau produit si c'est la première fois qu'il est proposé."
  ),
  sellerProductSearchAgain: L(
    "Opnieuw zoeken",
    "Search again",
    "Erneut suchen",
    "Rechercher à nouveau"
  ),
  sellerProductCreateNew: L(
    "Nieuw product aanmaken",
    "Create new product",
    "Neues Produkt anlegen",
    "Créer un nouveau produit"
  ),
  sellerProductUncertain: L(
    "Onzekere match",
    "Uncertain match",
    "Unsicherer Match",
    "Correspondance incertaine"
  ),
  sellerProductUncertainIntro: L(
    "Er is geen unieke deterministische EAN-match. AI ondersteunt; jij beslist (ADR-0012 / ADR-0007).",
    "There is no unique deterministic EAN match. AI assists; you decide (ADR-0012 / ADR-0007).",
    "Es gibt keinen eindeutigen deterministischen EAN-Match. KI unterstützt; du entscheidest (ADR-0012 / ADR-0007).",
    "Il n'y a pas de correspondance EAN déterministe unique. L'IA assiste ; vous décidez (ADR-0012 / ADR-0007)."
  ),
  sellerProductCandidatesNoPreview: L(
    "Er zijn kandidaten geregistreerd, maar geen preview beschikbaar. Zoek opnieuw of maak een nieuw product.",
    "Candidates are registered, but no preview is available. Search again or create a new product.",
    "Kandidaten sind registriert, aber keine Vorschau verfügbar. Erneut suchen oder neues Produkt anlegen.",
    "Des candidats sont enregistrés, mais aucun aperçu n'est disponible. Recherchez à nouveau ou créez un produit."
  ),
  sellerProductEanMatchLabel: L(
    "EAN-match: {label}",
    "EAN match: {label}",
    "EAN-Match: {label}",
    "Correspondance EAN : {label}"
  ),
  sellerProductEanMatchDefault: L(
    "100% zekerheid",
    "100% certainty",
    "100% Sicherheit",
    "100 % de certitude"
  ),
  sellerProductAiDeterministic: L(
    "Deterministische match — AI ondersteunt, beslist nooit.",
    "Deterministic match — AI assists, never decides.",
    "Deterministischer Match — KI unterstützt, entscheidet nie.",
    "Correspondance déterministe — l'IA assiste, ne décide jamais."
  ),
  sellerProductAiUncertainLabel: L(
    "Onzeker — AI-ondersteuning",
    "Uncertain — AI assistance",
    "Unsicher — KI-Unterstützung",
    "Incertain — assistance IA"
  ),
  sellerProductAiUncertainNote: L(
    "AI ondersteunt; de verkoper beslist. Geen automatische koppeling.",
    "AI assists; the seller decides. No automatic linking.",
    "KI unterstützt; der Verkäufer entscheidet. Keine automatische Verknüpfung.",
    "L'IA assiste ; le vendeur décide. Pas de liaison automatique."
  ),
  sellerProductQtyPlaceholder: L("Aantal", "Quantity", "Menge", "Quantité"),

  sellerProductNewTitle: L(
    "Nieuw product aanmaken",
    "Create new product",
    "Neues Produkt anlegen",
    "Créer un nouveau produit"
  ),
  sellerProductNewBreadcrumb: L(
    "Nieuw product aanmaken — Retailer Created",
    "Create new product — Retailer Created",
    "Neues Produkt anlegen — Retailer Created",
    "Créer un nouveau produit — Retailer Created"
  ),
  sellerProductNewIntro: L(
    "Retailer Created — dit product krijgt de status 'Retailer Created' tot een Producent/Merkhouder het eventueel claimt (Product Cloud Architecture Deel 8.1).",
    "Retailer Created — this product gets status 'Retailer Created' until a Producer/Brand owner may claim it (Product Cloud Architecture part 8.1).",
    "Retailer Created — dieses Produkt erhält den Status 'Retailer Created', bis ein Produzent/Markeninhaber es ggf. beansprucht (Product Cloud Architecture Teil 8.1).",
    "Retailer Created — ce produit reçoit le statut 'Retailer Created' jusqu'à ce qu'un producteur/détenteur de marque puisse le revendiquer (Product Cloud Architecture partie 8.1)."
  ),
  sellerProductNewTitleLabel: L(
    "Producttitel",
    "Product title",
    "Produkttitel",
    "Titre du produit"
  ),
  sellerProductNewTitlePlaceholder: L(
    "Bijv. Draadloze koptelefoon XR-200",
    "e.g. Wireless headphones XR-200",
    "z. B. Kabellose Kopfhörer XR-200",
    "ex. Casque sans fil XR-200"
  ),
  sellerProductNewBrandPlaceholder: L(
    "Merknaam",
    "Brand name",
    "Markenname",
    "Nom de marque"
  ),
  sellerProductNewChooseCategory: L(
    "Kies categorie...",
    "Choose category...",
    "Kategorie wählen...",
    "Choisir une catégorie..."
  ),
  sellerProductNewIdentifierLabel: L(
    "EAN/GTIN (optioneel) of MPN",
    "EAN/GTIN (optional) or MPN",
    "EAN/GTIN (optional) oder MPN",
    "EAN/GTIN (facultatif) ou MPN"
  ),
  sellerProductNewIdentifierPlaceholder: L(
    "EAN of fabrikantnummer",
    "EAN or manufacturer part number",
    "EAN oder Herstellerteilenummer",
    "EAN ou numéro fabricant"
  ),
  sellerProductNewMainImage: L(
    "Hoofdafbeelding",
    "Main image",
    "Hauptbild",
    "Image principale"
  ),
  sellerProductNewNoFile: L(
    "Nog geen bestand gekozen",
    "No file selected yet",
    "Noch keine Datei gewählt",
    "Aucun fichier sélectionné"
  ),
  sellerProductNewPublishNotice: L(
    "Verplicht vóór publicatie: minimaal één hoofdafbeelding en alle verplichte attributen voor deze categorie.",
    "Required before publishing: at least one main image and all required attributes for this category.",
    "Vor Veröffentlichung erforderlich: mindestens ein Hauptbild und alle Pflichtattribute für diese Kategorie.",
    "Obligatoire avant publication : au moins une image principale et tous les attributs obligatoires pour cette catégorie."
  ),
  sellerProductNewCreate: L(
    "Product aanmaken (concept)",
    "Create product (draft)",
    "Produkt anlegen (Entwurf)",
    "Créer le produit (brouillon)"
  ),
  sellerProductNewTitleRequired: L(
    "Vul een producttitel in.",
    "Enter a product title.",
    "Gib einen Produkttitel ein.",
    "Saisissez un titre de produit."
  ),
  sellerProductNewBrandRequired: L(
    "Vul een merknaam in.",
    "Enter a brand name.",
    "Gib einen Markennamen ein.",
    "Saisissez un nom de marque."
  ),
  sellerProductNewCategoryRequired: L(
    "Kies een categorie.",
    "Choose a category.",
    "Wähle eine Kategorie.",
    "Choisissez une catégorie."
  ),
  sellerProductNewIdRequired: L(
    "Vul een EAN/GTIN of MPN in.",
    "Enter an EAN/GTIN or MPN.",
    "Gib eine EAN/GTIN oder MPN ein.",
    "Saisissez un EAN/GTIN ou MPN."
  ),
  sellerProductNewExists: L(
    "Dit product bestaat al. Zoek op EAN om een aanbod te koppelen.",
    "This product already exists. Search by EAN to link an offer.",
    "Dieses Produkt existiert bereits. Suche nach EAN, um ein Angebot zu verknüpfen.",
    "Ce produit existe déjà. Recherchez par EAN pour lier une offre."
  ),
  sellerProductNewCreatedNoId: L(
    "Product aangemaakt, maar identifier ontbreekt.",
    "Product created, but identifier is missing.",
    "Produkt angelegt, aber Identifier fehlt.",
    "Produit créé, mais l'identifiant est manquant."
  ),
  sellerProductNewCreateFailed: L(
    "Aanmaken mislukt. Probeer opnieuw.",
    "Creation failed. Try again.",
    "Anlegen fehlgeschlagen. Bitte erneut versuchen.",
    "Échec de la création. Réessayez."
  ),
  sellerProductCatGeneral: L("Algemeen", "General", "Allgemein", "Général"),
  sellerProductCatElectronics: L(
    "Elektronica",
    "Electronics",
    "Elektronik",
    "Électronique"
  ),
  sellerProductCatFashion: L("Mode", "Fashion", "Mode", "Mode"),
  sellerProductCatHome: L(
    "Home & Living",
    "Home & Living",
    "Home & Living",
    "Maison & Lifestyle"
  ),
  sellerProductCatSport: L(
    "Sport & Outdoor",
    "Sport & Outdoor",
    "Sport & Outdoor",
    "Sport & Outdoor"
  ),
  sellerProductCatBeauty: L(
    "Beauty & Verzorging",
    "Beauty & Care",
    "Beauty & Pflege",
    "Beauté & Soins"
  ),

  sellerOfferTitle: L(
    "Productdetail — commerciële gegevens",
    "Product detail — commercial data",
    "Produktdetail — kommerzielle Daten",
    "Détail produit — données commerciales"
  ),
  sellerOfferIntro: L(
    "{title} — jouw aanbod (Offer)",
    "{title} — your offer",
    "{title} — dein Angebot (Offer)",
    "{title} — votre offre"
  ),
  sellerOfferRegion: L(
    " · regio {region}",
    " · region {region}",
    " · Region {region}",
    " · région {region}"
  ),
  sellerOfferCommercial: L(
    "Commercieel",
    "Commercial",
    "Kommerziell",
    "Commercial"
  ),
  sellerOfferBasePrice: L(
    "Basisprijs",
    "Base price",
    "Grundpreis",
    "Prix de base"
  ),
  sellerOfferTotalHint: L(
    "Totaalprijs (Buy Box-vergelijking): {total}",
    "Total price (Buy Box comparison): {total}",
    "Gesamtpreis (Buy-Box-Vergleich): {total}",
    "Prix total (comparaison Buy Box) : {total}"
  ),
  sellerOfferQtyInStock: L(
    "Aantal op voorraad",
    "Quantity in stock",
    "Menge auf Lager",
    "Quantité en stock"
  ),
  sellerOfferBuyBox: L(
    "Buy Box-positie",
    "Buy Box position",
    "Buy-Box-Position",
    "Position Buy Box"
  ),
  sellerOfferBuyBoxEmpty: L(
    "Nog geen aanbod voor deze identifier/regio. Na opslaan toont de server je Buy Box-positie.",
    "No offer yet for this identifier/region. After saving, the server shows your Buy Box position.",
    "Noch kein Angebot für diese Identifier/Region. Nach dem Speichern zeigt der Server deine Buy-Box-Position.",
    "Pas encore d'offre pour cet identifiant/région. Après enregistrement, le serveur affiche votre position Buy Box."
  ),
  sellerOfferBuyBoxLoading: L(
    "Buy Box-positie wordt geladen…",
    "Buy Box position is loading…",
    "Buy-Box-Position wird geladen…",
    "Chargement de la position Buy Box…"
  ),
  sellerOfferBuyBoxWinner: L(
    "Buy Box-winnaar",
    "Buy Box winner",
    "Buy-Box-Gewinner",
    "Gagnant Buy Box"
  ),
  sellerOfferBuyBoxRank: L(
    "Positie #{rank}",
    "Position #{rank}",
    "Position #{rank}",
    "Position #{rank}"
  ),
  sellerOfferBuyBoxUnranked: L(
    "Niet in ranking",
    "Not in ranking",
    "Nicht in der Rangliste",
    "Hors classement"
  ),
  sellerOfferCurrentStatus: L(
    "Huidige status",
    "Current status",
    "Aktueller Status",
    "Statut actuel"
  ),
  sellerOfferCompetitors: L(
    "Concurrerende aanbieders",
    "Competing sellers",
    "Konkurrierende Anbieter",
    "Offreurs concurrents"
  ),
  sellerOfferShowWeights: L(
    "Bekijk wegingsfactoren",
    "View weighting factors",
    "Gewichtungsfaktoren anzeigen",
    "Voir les facteurs de pondération"
  ),
  sellerOfferHideWeights: L(
    "Verberg wegingsfactoren",
    "Hide weighting factors",
    "Gewichtungsfaktoren ausblenden",
    "Masquer les facteurs de pondération"
  ),
  sellerOfferWeightDelivery: L(
    "Levertijd",
    "Delivery time",
    "Lieferzeit",
    "Délai de livraison"
  ),
  sellerOfferWeightSellerReview: L(
    "Verkopersreview",
    "Seller review",
    "Verkäuferbewertung",
    "Avis vendeur"
  ),
  sellerOfferWeightPerformance: L(
    "Performance",
    "Performance",
    "Performance",
    "Performance"
  ),
  sellerOfferWeightReturns: L(
    "Retourprestaties",
    "Return performance",
    "Retourenleistung",
    "Performance retours"
  ),
  sellerOfferNoIdentifier: L(
    "Geen identifier_id — open dit scherm via match of nieuw product.",
    "No identifier_id — open this screen via match or new product.",
    "Keine identifier_id — öffne diesen Bildschirm über Match oder neues Produkt.",
    "Pas d'identifier_id — ouvrez cet écran via une correspondance ou un nouveau produit."
  ),
  sellerOfferInvalidBase: L(
    "Vul een geldige basisprijs in.",
    "Enter a valid base price.",
    "Gib einen gültigen Grundpreis ein.",
    "Saisissez un prix de base valide."
  ),
  sellerOfferInvalidShipping: L(
    "Vul geldige verzendkosten in.",
    "Enter a valid shipping cost.",
    "Gib gültige Versandkosten ein.",
    "Saisissez des frais de port valides."
  ),
  sellerOfferInvalidStock: L(
    "Voorraad moet een geheel getal ≥ 0 zijn.",
    "Stock must be an integer ≥ 0.",
    "Bestand muss eine ganze Zahl ≥ 0 sein.",
    "Le stock doit être un entier ≥ 0."
  ),
  sellerOfferCreated: L(
    "Aanbod aangemaakt.",
    "Offer created.",
    "Angebot erstellt.",
    "Offre créée."
  ),
  sellerOfferUpdated: L(
    "Aanbod bijgewerkt.",
    "Offer updated.",
    "Angebot aktualisiert.",
    "Offre mise à jour."
  ),
  sellerOfferSaveFailed: L(
    "Opslaan mislukt. Probeer opnieuw.",
    "Save failed. Try again.",
    "Speichern fehlgeschlagen. Bitte erneut versuchen.",
    "Échec de l'enregistrement. Réessayez."
  ),

  sellerBannerIntro: L(
    "Koop een bannerpositie voor een vaste weekprijs. Totaalprijs = weken × prijs per week.",
    "Buy a banner position at a fixed weekly price. Total = weeks × price per week.",
    "Kaufe eine Bannerposition zum festen Wochenpreis. Gesamtpreis = Wochen × Preis pro Woche.",
    "Achetez une position bannière à un prix hebdomadaire fixe. Total = semaines × prix par semaine."
  ),
  sellerBannerPriceOverview: L(
    "Prijsoverzicht",
    "Price overview",
    "Preisübersicht",
    "Aperçu des prix"
  ),
  sellerBannerNewCampaign: L(
    "Nieuwe campagne",
    "New campaign",
    "Neue Kampagne",
    "Nouvelle campagne"
  ),
  sellerBannerPosition: L(
    "Bannerpositie",
    "Banner position",
    "Bannerposition",
    "Position bannière"
  ),
  sellerBannerWeeklyPrice: L(
    "Weekprijs",
    "Weekly price",
    "Wochenpreis",
    "Prix hebdomadaire"
  ),
  sellerBannerAutoPrice: L(
    "Automatische prijsberekening",
    "Automatic price calculation",
    "Automatische Preisberechnung",
    "Calcul automatique du prix"
  ),
  sellerBannerWeeks: L(
    "Aantal weken: {weeks}",
    "Number of weeks: {weeks}",
    "Anzahl Wochen: {weeks}",
    "Nombre de semaines : {weeks}"
  ),
  sellerBannerPricePerWeek: L(
    "Prijs per week: {price}",
    "Price per week: {price}",
    "Preis pro Woche: {price}",
    "Prix par semaine : {price}"
  ),
  sellerBannerTotalPrice: L(
    "Totaalprijs: {price}",
    "Total price: {price}",
    "Gesamtpreis: {price}",
    "Prix total : {price}"
  ),
  sellerBannerStart: L(
    "Campagne starten",
    "Start campaign",
    "Kampagne starten",
    "Démarrer la campagne"
  ),
  sellerBannerNeedDates: L(
    "Kies een bannerpositie, startdatum en einddatum.",
    "Choose a banner position, start date and end date.",
    "Wähle Bannerposition, Start- und Enddatum.",
    "Choisissez une position, une date de début et de fin."
  ),
  sellerBannerPrepared: L(
    "Campagne voorbereid: {location} · {weeks} week(en) · {price}. Publiceren volgt bij API-koppeling.",
    "Campaign prepared: {location} · {weeks} week(s) · {price}. Publishing follows API integration.",
    "Kampagne vorbereitet: {location} · {weeks} Woche(n) · {price}. Veröffentlichung folgt mit API-Anbindung.",
    "Campagne préparée : {location} · {weeks} semaine(s) · {price}. La publication suivra l'intégration API."
  ),
  sellerBannerEmptyTitle: L(
    "Geen banners",
    "No banners",
    "Keine Banner",
    "Aucune bannière"
  ),
  sellerBannerEmptyDesc: L(
    "Maak hierboven een campagne aan om een bannerpositie te kopen.",
    "Create a campaign above to buy a banner position.",
    "Erstelle oben eine Kampagne, um eine Bannerposition zu kaufen.",
    "Créez une campagne ci-dessus pour acheter une position bannière."
  ),
  sellerBannerActive: L(
    "Actieve campagnes",
    "Active campaigns",
    "Aktive Kampagnen",
    "Campagnes actives"
  ),
  sellerBannerInvoiceStatus: L(
    "Factuurstatus",
    "Invoice status",
    "Rechnungsstatus",
    "Statut de facture"
  ),
  sellerBannerPosHomepage: L(
    "Homepage Hero",
    "Homepage hero",
    "Homepage-Hero",
    "Hero page d'accueil"
  ),
  sellerBannerPosCategory: L(
    "Categoriepagina",
    "Category page",
    "Kategorieseite",
    "Page catégorie"
  ),
  sellerBannerPosSearch: L(
    "Zoekresultaat",
    "Search result",
    "Suchergebnis",
    "Résultat de recherche"
  ),
  sellerBannerPosProduct: L(
    "Productpagina",
    "Product page",
    "Produktseite",
    "Page produit"
  ),
  sellerBannerUpload: L(
    "Banner uploaden",
    "Upload banner",
    "Banner hochladen",
    "Téléverser la bannière"
  ),
  sellerBannerUploadReq: L(
    "JPG of PNG, max. 10 MB",
    "JPG or PNG, max. 10 MB",
    "JPG oder PNG, max. 10 MB",
    "JPG ou PNG, max. 10 Mo"
  ),
  sellerBannerPerWeekOption: L(
    "{label} ({price}/week)",
    "{label} ({price}/week)",
    "{label} ({price}/Woche)",
    "{label} ({price}/semaine)"
  ),

  sellerSponsoredIntro: L(
    "Campagnes aanmaken, budgetteren, pauzeren en beëindigen.",
    "Create, budget, pause and end campaigns.",
    "Kampagnen erstellen, budgetieren, pausieren und beenden.",
    "Créer, budgétiser, mettre en pause et terminer des campagnes."
  ),
  sellerSponsoredStats: L(
    "Statistieken",
    "Statistics",
    "Statistiken",
    "Statistiques"
  ),
  sellerSponsoredActive: L(
    "Actieve campagnes",
    "Active campaigns",
    "Aktive Kampagnen",
    "Campagnes actives"
  ),
  sellerSponsoredSpend: L(
    "Besteed totaal",
    "Total spend",
    "Ausgaben gesamt",
    "Dépenses totales"
  ),
  sellerSponsoredClicks: L("Klikken", "Clicks", "Klicks", "Clics"),
  sellerSponsoredCreate: L(
    "Campagne aanmaken",
    "Create campaign",
    "Kampagne erstellen",
    "Créer une campagne"
  ),
  sellerSponsoredName: L(
    "Campagnenaam",
    "Campaign name",
    "Kampagnenname",
    "Nom de campagne"
  ),
  sellerSponsoredCpc: L("CPC (€)", "CPC (€)", "CPC (€)", "CPC (€)"),
  sellerSponsoredBudget: L(
    "Dagelijks budget (€)",
    "Daily budget (€)",
    "Tagesbudget (€)",
    "Budget quotidien (€)"
  ),
  sellerSponsoredNeedFields: L(
    "Vul alle verplichte velden in.",
    "Fill in all required fields.",
    "Fülle alle Pflichtfelder aus.",
    "Renseignez tous les champs obligatoires."
  ),
  sellerSponsoredCreated: L(
    "Campagne aangemaakt en gestart.",
    "Campaign created and started.",
    "Kampagne erstellt und gestartet.",
    "Campagne créée et démarrée."
  ),
  sellerSponsoredEmptyTitle: L(
    "Geen sponsored campagnes",
    "No sponsored campaigns",
    "Keine Sponsored-Kampagnen",
    "Aucune campagne sponsorisée"
  ),
  sellerSponsoredEmptyDesc: L(
    "Maak hierboven een campagne aan om producten in gesponsorde slots te tonen.",
    "Create a campaign above to show products in sponsored slots.",
    "Erstelle oben eine Kampagne, um Produkte in gesponserten Slots zu zeigen.",
    "Créez une campagne ci-dessus pour afficher des produits dans des emplacements sponsorisés."
  ),
  sellerSponsoredCampaign: L(
    "Campagne",
    "Campaign",
    "Kampagne",
    "Campagne"
  ),
  sellerSponsoredDuration: L(
    "Looptijd",
    "Duration",
    "Laufzeit",
    "Durée"
  ),
  sellerSponsoredStatsCol: L("Stats", "Stats", "Stats", "Stats"),
  sellerSponsoredStatsLine: L(
    "{clicks} klikken · {spend} · {conversions} conv.",
    "{clicks} clicks · {spend} · {conversions} conv.",
    "{clicks} Klicks · {spend} · {conversions} Conv.",
    "{clicks} clics · {spend} · {conversions} conv."
  ),
  sellerSponsoredStarted: L(
    "Campagne gestart.",
    "Campaign started.",
    "Kampagne gestartet.",
    "Campagne démarrée."
  ),
  sellerSponsoredPaused: L(
    "Campagne gepauzeerd.",
    "Campaign paused.",
    "Kampagne pausiert.",
    "Campagne mise en pause."
  ),
  sellerSponsoredEnded: L(
    "Campagne beëindigd.",
    "Campaign ended.",
    "Kampagne beendet.",
    "Campagne terminée."
  ),

  sellerAffiliateIntro: L(
    "Stel commissies in per product, categorie of algemeen. Beheer affiliates en bekijk statistieken.",
    "Set commissions per product, category or default. Manage affiliates and view statistics.",
    "Lege Provisionen pro Produkt, Kategorie oder allgemein fest. Verwalte Affiliates und sieh Statistiken.",
    "Définissez les commissions par produit, catégorie ou par défaut. Gérez les affiliés et consultez les statistiques."
  ),
  sellerAffiliateStats: L(
    "Affiliate statistieken",
    "Affiliate statistics",
    "Affiliate-Statistiken",
    "Statistiques d'affiliation"
  ),
  sellerAffiliateCount: L(
    "Aantal affiliates",
    "Number of affiliates",
    "Anzahl Affiliates",
    "Nombre d'affiliés"
  ),
  sellerAffiliateActiveNote: L(
    "{count} actief",
    "{count} active",
    "{count} aktiv",
    "{count} actifs"
  ),
  sellerAffiliateSales: L(
    "Verkopen via affiliates",
    "Sales via affiliates",
    "Verkäufe über Affiliates",
    "Ventes via affiliés"
  ),
  sellerAffiliatePaid: L(
    "Uitgekeerde commissies",
    "Paid commissions",
    "Ausgezahlte Provisionen",
    "Commissions versées"
  ),
  sellerAffiliateOpen: L(
    "Openstaande commissies",
    "Outstanding commissions",
    "Offene Provisionen",
    "Commissions en attente"
  ),
  sellerAffiliateManage: L(
    "Affiliatebeheer",
    "Affiliate management",
    "Affiliate-Verwaltung",
    "Gestion des affiliés"
  ),
  sellerAffiliateEmptyTitle: L(
    "Geen affiliates",
    "No affiliates",
    "Keine Affiliates",
    "Aucun affilié"
  ),
  sellerAffiliateEmptyDesc: L(
    "Affiliates die jouw producten promoten verschijnen hier.",
    "Affiliates promoting your products appear here.",
    "Affiliates, die deine Produkte bewerben, erscheinen hier.",
    "Les affiliés qui promeuvent vos produits apparaissent ici."
  ),
  sellerAffiliateCol: L(
    "Affiliate",
    "Affiliate",
    "Affiliate",
    "Affilié"
  ),
  sellerAffiliateSalesCount: L(
    "Verkopen",
    "Sales",
    "Verkäufe",
    "Ventes"
  ),
  sellerAffiliatePaidCol: L(
    "Uitgekeerd",
    "Paid out",
    "Ausgezahlt",
    "Versé"
  ),
  sellerAffiliateOpenCol: L("Open", "Open", "Offen", "Ouvert"),
  sellerAffiliatePriority: L(
    "Commissieprioriteit",
    "Commission priority",
    "Provisionspriorität",
    "Priorité des commissions"
  ),
  sellerAffiliatePriorityTip: L(
    "Bij een verkoop wordt eerst gekeken of er een productcommissie is. Zo niet, dan categoriecommissie. Anders geldt de algemene commissie.",
    "On a sale, product commission is checked first. If none, category commission. Otherwise the default commission applies.",
    "Bei einem Verkauf wird zuerst die Produktprovision geprüft. Sonst die Kategorieprovision. Andernfalls gilt die allgemeine Provision.",
    "Lors d'une vente, la commission produit est vérifiée d'abord. Sinon la commission catégorie. Sinon la commission générale s'applique."
  ),
  sellerAffiliatePriority1: L(
    "Productcommissie",
    "Product commission",
    "Produktprovision",
    "Commission produit"
  ),
  sellerAffiliatePriority2: L(
    "Categoriecommissie",
    "Category commission",
    "Kategorieprovision",
    "Commission catégorie"
  ),
  sellerAffiliatePriority3: L(
    "Algemene commissie",
    "Default commission",
    "Allgemeine Provision",
    "Commission générale"
  ),
  sellerAffiliatePriorityNote: L(
    "De hoogste prioriteit die van toepassing is, bepaalt de effectieve commissie voor een verkoop.",
    "The highest applicable priority determines the effective commission for a sale.",
    "Die höchste zutreffende Priorität bestimmt die effektive Provision für einen Verkauf.",
    "La priorité la plus élevée applicable détermine la commission effective d'une vente."
  ),
  sellerAffiliateDefault: L(
    "Algemene commissie",
    "Default commission",
    "Allgemeine Provision",
    "Commission générale"
  ),
  sellerAffiliateDefaultPct: L(
    "Standaard commissie (%)",
    "Default commission (%)",
    "Standardprovision (%)",
    "Commission standard (%)"
  ),
  sellerAffiliateDefaultPlaceholder: L(
    "bijv. 8",
    "e.g. 8",
    "z. B. 8",
    "ex. 8"
  ),
  sellerAffiliatePerCategory: L(
    "Commissie per categorie",
    "Commission per category",
    "Provision pro Kategorie",
    "Commission par catégorie"
  ),
  sellerAffiliatePerProduct: L(
    "Commissie per product",
    "Commission per product",
    "Provision pro Produkt",
    "Commission par produit"
  ),
  sellerAffiliateCategoryName: L(
    "Categorienaam",
    "Category name",
    "Kategoriename",
    "Nom de catégorie"
  ),
  sellerAffiliateCommissionPct: L(
    "Commissie %",
    "Commission %",
    "Provision %",
    "Commission %"
  ),
  sellerAffiliateProductTitle: L(
    "Producttitel",
    "Product title",
    "Produkttitel",
    "Titre du produit"
  ),
  sellerAffiliateSaved: L(
    "Instellingen lokaal bijgewerkt (demo).",
    "Settings updated locally (demo).",
    "Einstellungen lokal aktualisiert (Demo).",
    "Paramètres mis à jour localement (démo)."
  ),

  sellerBillingIntro: L(
    "Openstaand, betaald en historie van marketingkosten.",
    "Outstanding, paid and history of marketing costs.",
    "Offen, bezahlt und Historie der Marketingkosten.",
    "Ouvert, payé et historique des coûts marketing."
  ),
  sellerBillingOutstanding: L(
    "Openstaand",
    "Outstanding",
    "Offen",
    "Ouvert"
  ),
  sellerBillingTotal: L(
    "Totaal marketingkosten",
    "Total marketing costs",
    "Marketingkosten gesamt",
    "Total des coûts marketing"
  ),
  sellerBillingTypeBanner: L(
    "Bannercampagnes",
    "Banner campaigns",
    "Bannerkampagnen",
    "Campagnes bannières"
  ),
  sellerBillingTypeAffiliate: L(
    "Affiliate commissies",
    "Affiliate commissions",
    "Affiliate-Provisionen",
    "Commissions d'affiliation"
  ),
  sellerBillingTypePremium: L(
    "Premium opties",
    "Premium options",
    "Premium-Optionen",
    "Options premium"
  ),

  // —— Buyer pages ——
  buyerOrdersIntro: L(
    "Overzicht van al je bestellingen bij verschillende verkopers.",
    "Overview of all your orders with different sellers.",
    "Überblick über alle Ihre Bestellungen bei verschiedenen Verkäufern.",
    "Aperçu de toutes vos commandes auprès de différents vendeurs."
  ),
  buyerOrdersSearchPlaceholder: L(
    "Zoek op ordernummer of product…",
    "Search by order number or product…",
    "Nach Bestellnummer oder Produkt suchen…",
    "Rechercher par numéro de commande ou produit…"
  ),
  buyerOrdersLoadError: L(
    "Bestellingen laden mislukt.",
    "Failed to load orders.",
    "Bestellungen konnten nicht geladen werden.",
    "Échec du chargement des commandes."
  ),
  buyerOrdersEmptyFilter: L(
    "Geen bestellingen in dit filter.",
    "No orders in this filter.",
    "Keine Bestellungen in diesem Filter.",
    "Aucune commande dans ce filtre."
  ),
  buyerReturnsIntro: L(
    "Volg en beheer je retouraanvragen.",
    "Track and manage your return requests.",
    "Verfolgen und verwalten Sie Ihre Retourenanfragen.",
    "Suivez et gérez vos demandes de retour."
  ),
  buyerReturnsEmpty: L(
    "Nog geen retouren.",
    "No returns yet.",
    "Noch keine Retouren.",
    "Pas encore de retours."
  ),
  buyerMessagesIntro: L(
    "Berichten over je bestellingen met verkopers.",
    "Messages about your orders with sellers.",
    "Nachrichten zu Ihren Bestellungen mit Verkäufern.",
    "Messages concernant vos commandes avec les vendeurs."
  ),
  buyerMessagesEmpty: L(
    "Nog geen berichten.",
    "No messages yet.",
    "Noch keine Nachrichten.",
    "Pas encore de messages."
  ),
  buyerReviewsIntro: L(
    "Beoordeel producten en verkopers na levering.",
    "Rate products and sellers after delivery.",
    "Bewerten Sie Produkte und Verkäufer nach der Lieferung.",
    "Évaluez les produits et vendeurs après livraison."
  ),
  buyerReviewsToReview: L(
    "Te reviewen",
    "To review",
    "Zu bewerten",
    "À évaluer"
  ),
  buyerReviewsEmpty: L(
    "Geen openstaande reviews.",
    "No pending reviews.",
    "Keine offenen Bewertungen.",
    "Aucun avis en attente."
  ),
  buyerSettingsIntro: L(
    "Beheer je accountgegevens en sessie.",
    "Manage your account details and session.",
    "Verwalten Sie Ihre Kontodaten und Sitzung.",
    "Gérez les détails de votre compte et votre session."
  ),
  buyerLogout: L("Uitloggen", "Sign out", "Abmelden", "Se déconnecter"),
  buyerShippingAddress: L(
    "Verzendadres",
    "Shipping address",
    "Lieferadresse",
    "Adresse de livraison"
  ),
  buyerBillingAddress: L(
    "Factuuradres",
    "Billing address",
    "Rechnungsadresse",
    "Adresse de facturation"
  ),
  buyerRequestReturn: L(
    "Retour aanvragen",
    "Request return",
    "Retoure beantragen",
    "Demander un retour"
  ),
  buyerEscalate: L(
    "Escaleren naar Beheerder",
    "Escalate to admin",
    "An Admin eskalieren",
    "Escalader vers l’admin"
  ),
  buyerReturnStatus: L(
    "Retourstatus",
    "Return status",
    "Retourenstatus",
    "Statut du retour"
  ),
  buyerNewReturn: L(
    "Nieuwe retour",
    "New return",
    "Neue Retoure",
    "Nouveau retour"
  ),
  buyerWriteReview: L(
    "Review schrijven",
    "Write review",
    "Bewertung schreiben",
    "Écrire un avis"
  ),
  buyerProductReview: L(
    "Productreview",
    "Product review",
    "Produktbewertung",
    "Avis produit"
  ),
  buyerSellerReview: L(
    "Verkopersreview",
    "Seller review",
    "Verkäuferbewertung",
    "Avis vendeur"
  ),
  buyerTabReturn: L("Retour", "Returns", "Retoure", "Retours"),
  buyerReturnsLoadError: L(
    "Retouren laden mislukt.",
    "Failed to load returns.",
    "Retouren konnten nicht geladen werden.",
    "Échec du chargement des retours."
  ),
  buyerGoToOrders: L(
    "Ga naar bestellingen",
    "Go to orders",
    "Zu Bestellungen",
    "Aller aux commandes"
  ),
  buyerMessagesLoadError: L(
    "Berichten laden mislukt.",
    "Failed to load messages.",
    "Nachrichten konnten nicht geladen werden.",
    "Échec du chargement des messages."
  ),
  buyerNoMessagesStart: L(
    "Nog geen berichten — start een gesprek",
    "No messages yet — start a conversation",
    "Noch keine Nachrichten — starten Sie ein Gespräch",
    "Pas encore de messages — démarrez une conversation"
  ),
  buyerMessageCount: L(
    "{count} berichten",
    "{count} messages",
    "{count} Nachrichten",
    "{count} messages"
  ),
  buyerReviewsLoadError: L(
    "Reviews laden mislukt.",
    "Failed to load reviews.",
    "Bewertungen konnten nicht geladen werden.",
    "Échec du chargement des avis."
  ),
  buyerMyReviews: L(
    "Mijn reviews",
    "My reviews",
    "Meine Bewertungen",
    "Mes avis"
  ),
  buyerNoReviewsYet: L(
    "Nog geen reviews geplaatst.",
    "No reviews submitted yet.",
    "Noch keine Bewertungen abgegeben.",
    "Aucun avis publié pour le moment."
  ),
  buyerViewProductLink: L(
    "Product bekijken",
    "View product",
    "Produkt ansehen",
    "Voir le produit"
  ),
  buyerToProduct: L(
    "Naar product",
    "Go to product",
    "Zum Produkt",
    "Vers le produit"
  ),
  buyerProfileLoadError: L(
    "Kon je profiel niet laden.",
    "Could not load your profile.",
    "Profil konnte nicht geladen werden.",
    "Impossible de charger votre profil."
  ),
  buyerLoginAgain: L(
    "Opnieuw inloggen",
    "Sign in again",
    "Erneut anmelden",
    "Se reconnecter"
  ),
  buyerOrderDetail: L(
    "Orderdetail",
    "Order detail",
    "Bestelldetails",
    "Détail de la commande"
  ),
  buyerOrderTitle: L(
    "Bestelling #{number}",
    "Order #{number}",
    "Bestellung #{number}",
    "Commande #{number}"
  ),
  buyerPaymentStatus: L(
    "Betaling: {status}",
    "Payment: {status}",
    "Zahlung: {status}",
    "Paiement : {status}"
  ),
  buyerTrackTraceNote: L(
    "Track & trace volgt zodra Shipment (Blueprint Status Open) is uitgewerkt.",
    "Track & trace will follow once Shipment (Blueprint Status Open) is implemented.",
    "Track & Trace folgt, sobald Shipment (Blueprint Status Open) ausgearbeitet ist.",
    "Le suivi sera disponible une fois Shipment (Blueprint Status Open) mis en place."
  ),
  buyerMessagesForOrder: L(
    "Berichten over deze bestelling →",
    "Messages about this order →",
    "Nachrichten zu dieser Bestellung →",
    "Messages concernant cette commande →"
  ),
  buyerOrderLines: L(
    "Orderregels",
    "Order lines",
    "Bestellpositionen",
    "Lignes de commande"
  ),
  buyerViewReturn: L(
    "Retour bekijken",
    "View return",
    "Retoure ansehen",
    "Voir le retour"
  ),
  buyerReturnBadge: L(
    "Retour: {status}",
    "Return: {status}",
    "Retoure: {status}",
    "Retour : {status}"
  ),
  buyerOrderLoadError: L(
    "Order laden mislukt.",
    "Failed to load order.",
    "Bestellung konnte nicht geladen werden.",
    "Échec du chargement de la commande."
  ),
  buyerReturnLoadError: L(
    "Retour laden mislukt.",
    "Failed to load return.",
    "Retoure konnte nicht geladen werden.",
    "Échec du chargement du retour."
  ),
  buyerEscalateFailed: L(
    "Escaleren mislukt.",
    "Escalation failed.",
    "Eskalation fehlgeschlagen.",
    "Échec de l’escalade."
  ),
  buyerReason: L("Reden", "Reason", "Grund", "Motif"),
  buyerSellerDecision: L(
    "Seller-besluit",
    "Seller decision",
    "Verkäuferentscheidung",
    "Décision du vendeur"
  ),
  buyerRefund: L("Refund", "Refund", "Erstattung", "Remboursement"),
  buyerDetail: L("Detail", "Detail", "Detail", "Détail"),
  buyerReturnWindowNote: L(
    "Alleen binnen de wettelijke herroepingstermijn van 14 dagen.",
    "Only within the legal 14-day withdrawal period.",
    "Nur innerhalb der gesetzlichen Widerrufsfrist von 14 Tagen.",
    "Uniquement dans le délai légal de rétractation de 14 jours."
  ),
  buyerNoOrderLineSelected: L(
    "Geen orderregel geselecteerd.",
    "No order line selected.",
    "Keine Bestellposition ausgewählt.",
    "Aucune ligne de commande sélectionnée."
  ),
  buyerSelectOrderLine: L(
    "Selecteer een orderregel via orderdetail.",
    "Select an order line from the order detail.",
    "Wählen Sie eine Bestellposition über die Bestelldetails.",
    "Sélectionnez une ligne de commande via le détail de commande."
  ),
  buyerOrderLineLabel: L(
    "Orderregel",
    "Order line",
    "Bestellposition",
    "Ligne de commande"
  ),
  buyerReasonPlaceholder: L(
    "Waarom wil je dit product retourneren?",
    "Why do you want to return this product?",
    "Warum möchten Sie dieses Produkt zurückgeben?",
    "Pourquoi souhaitez-vous retourner ce produit ?"
  ),
  buyerSubmitReturn: L(
    "Retourverzoek versturen",
    "Submit return request",
    "Retourenantrag senden",
    "Envoyer la demande de retour"
  ),
  buyerSubmitting: L("Versturen…", "Sending…", "Senden…", "Envoi…"),
  buyerReturnRequestFailed: L(
    "Retour aanmelden mislukt.",
    "Failed to request return.",
    "Retoure anmelden fehlgeschlagen.",
    "Échec de la demande de retour."
  ),
  buyerConversation: L(
    "Conversatie",
    "Conversation",
    "Konversation",
    "Conversation"
  ),
  buyerConversationForOrder: L(
    "Conversatie bij bestelling #{number}",
    "Conversation for order #{number}",
    "Konversation zu Bestellung #{number}",
    "Conversation pour la commande #{number}"
  ),
  buyerThreadEmpty: L(
    "Nog geen berichten in deze thread.",
    "No messages in this thread yet.",
    "Noch keine Nachrichten in diesem Thread.",
    "Pas encore de messages dans ce fil."
  ),
  buyerNewMessage: L(
    "Nieuw bericht",
    "New message",
    "Neue Nachricht",
    "Nouveau message"
  ),
  buyerSendFailed: L(
    "Versturen mislukt.",
    "Failed to send.",
    "Senden fehlgeschlagen.",
    "Échec de l’envoi."
  ),
  buyerThreadLoadFailed: L(
    "Thread laden mislukt.",
    "Failed to load thread.",
    "Thread konnte nicht geladen werden.",
    "Échec du chargement du fil."
  ),
  buyerReviewFieldsRequired: L(
    "Orderregel en reviewtype zijn verplicht.",
    "Order line and review type are required.",
    "Bestellposition und Bewertungstyp sind erforderlich.",
    "La ligne de commande et le type d’avis sont obligatoires."
  ),
  buyerReviewSubmitFailed: L(
    "Review plaatsen mislukt.",
    "Failed to submit review.",
    "Bewertung konnte nicht abgegeben werden.",
    "Échec de la publication de l’avis."
  ),
  buyerReviewFormIntro: L(
    "Score (1–5) en optionele toelichting. Product- en verkopersreviews zijn gescheiden formulieren.",
    "Score (1–5) and optional comments. Product and seller reviews are separate forms.",
    "Bewertung (1–5) und optionale Erläuterung. Produkt- und Verkäuferbewertungen sind getrennte Formulare.",
    "Note (1–5) et commentaire facultatif. Les avis produit et vendeur sont des formulaires séparés."
  ),
  buyerInvalidReviewLink: L(
    "Ongeldige link. Kies een review vanaf Mijn reviews.",
    "Invalid link. Choose a review from My reviews.",
    "Ungültiger Link. Wählen Sie eine Bewertung unter Meine Bewertungen.",
    "Lien invalide. Choisissez un avis depuis Mes avis."
  ),
  buyerScore: L("Score", "Score", "Bewertung", "Note"),
  buyerExplanation: L(
    "Toelichting",
    "Comments",
    "Erläuterung",
    "Commentaire"
  ),
  buyerOptional: L("Optioneel", "Optional", "Optional", "Facultatif"),
  buyerSubmitReview: L(
    "Review plaatsen",
    "Submit review",
    "Bewertung abgeben",
    "Publier l’avis"
  ),
  buyerPlaceReview: L(
    "{type} plaatsen",
    "Submit {type}",
    "{type} abgeben",
    "Publier {type}"
  ),
  buyerNewReview: L(
    "Nieuwe review",
    "New review",
    "Neue Bewertung",
    "Nouvel avis"
  ),
  buyerBusy: L("Bezig…", "Working…", "Wird ausgeführt…", "En cours…"),

  // —— Auth (non-login) ——
  authRegisterTitle: L(
    "Account aanmaken",
    "Create account",
    "Konto erstellen",
    "Créer un compte"
  ),
  authRegisterSubtitle: L(
    "Eén account voor kopen — en later, als je dat wilt, ook verkopen",
    "One account for buying — and later, if you want, also selling",
    "Ein Konto zum Kaufen — und später, wenn Sie möchten, auch zum Verkaufen",
    "Un compte pour acheter — et plus tard, si vous le souhaitez, aussi pour vendre"
  ),
  authFullName: L("Naam", "Name", "Name", "Nom"),
  authFullNamePlaceholder: L(
    "Voor- en achternaam",
    "First and last name",
    "Vor- und Nachname",
    "Prénom et nom"
  ),
  authPasswordHint: L(
    "Minimaal 8 tekens",
    "At least 8 characters",
    "Mindestens 8 Zeichen",
    "Au moins 8 caractères"
  ),
  authPasswordHintLong: L(
    "Minimaal 8 tekens, combinatie van letters en cijfers aanbevolen.",
    "At least 8 characters; a mix of letters and numbers is recommended.",
    "Mindestens 8 Zeichen; eine Kombination aus Buchstaben und Zahlen wird empfohlen.",
    "Au moins 8 caractères ; un mélange de lettres et de chiffres est recommandé."
  ),
  authConfirmPasswordPlaceholder: L(
    "Herhaal je nieuwe wachtwoord",
    "Repeat your new password",
    "Wiederholen Sie Ihr neues Passwort",
    "Répétez votre nouveau mot de passe"
  ),
  authAcceptTerms: L(
    "Ik ga akkoord met de voorwaarden en het privacybeleid",
    "I agree to the terms and the privacy policy",
    "Ich stimme den Bedingungen und der Datenschutzrichtlinie zu",
    "J’accepte les conditions et la politique de confidentialité"
  ),
  authRecoveryCodePlaceholder: L(
    "e.g. 7F3K-9X2M",
    "e.g. 7F3K-9X2M",
    "z. B. 7F3K-9X2M",
    "p. ex. 7F3K-9X2M"
  ),
  authBackToForgot: L(
    "← Terug naar Wachtwoord vergeten",
    "← Back to Forgot password",
    "← Zurück zu Passwort vergessen",
    "← Retour à Mot de passe oublié"
  ),
  authYourEmail: L(
    "je e-mailadres",
    "your email address",
    "Ihre E-Mail-Adresse",
    "votre adresse e-mail"
  ),
  authCreatingAccount: L(
    "Bezig…",
    "Working…",
    "Wird ausgeführt…",
    "En cours…"
  ),
  authAlreadyHaveAccount: L(
    "Al een account?",
    "Already have an account?",
    "Bereits ein Konto?",
    "Déjà un compte ?"
  ),
  authEmailExists: L(
    "Dit e-mailadres is al geregistreerd.",
    "This email address is already registered.",
    "Diese E-Mail-Adresse ist bereits registriert.",
    "Cette adresse e-mail est déjà enregistrée."
  ),
  authRegisterFailed: L(
    "Registreren is niet gelukt. Probeer het opnieuw.",
    "Registration failed. Please try again.",
    "Registrierung fehlgeschlagen. Bitte erneut versuchen.",
    "L’inscription a échoué. Veuillez réessayer."
  ),
  authForgotTitle: L(
    "Wachtwoord vergeten",
    "Forgot password",
    "Passwort vergessen",
    "Mot de passe oublié"
  ),
  authForgotSubtitle: L(
    "Vul je e-mailadres in. We sturen een resetlink als het account bestaat.",
    "Enter your email address. We’ll send a reset link if the account exists.",
    "Geben Sie Ihre E-Mail-Adresse ein. Wir senden einen Reset-Link, falls das Konto existiert.",
    "Saisissez votre adresse e-mail. Nous enverrons un lien de réinitialisation si le compte existe."
  ),
  authSendResetLink: L(
    "Verstuur resetlink",
    "Send reset link",
    "Reset-Link senden",
    "Envoyer le lien de réinitialisation"
  ),
  authBackToLogin: L(
    "← Terug naar Inloggen",
    "← Back to Sign in",
    "← Zurück zur Anmeldung",
    "← Retour à la connexion"
  ),
  authResetTitle: L(
    "Nieuw wachtwoord instellen",
    "Set a new password",
    "Neues Passwort festlegen",
    "Définir un nouveau mot de passe"
  ),
  authResetSubtitle: L(
    "Kies een nieuw wachtwoord voor je account.",
    "Choose a new password for your account.",
    "Wählen Sie ein neues Passwort für Ihr Konto.",
    "Choisissez un nouveau mot de passe pour votre compte."
  ),
  authNewPassword: L(
    "Nieuw wachtwoord",
    "New password",
    "Neues Passwort",
    "Nouveau mot de passe"
  ),
  authConfirmPassword: L(
    "Bevestig wachtwoord",
    "Confirm password",
    "Passwort bestätigen",
    "Confirmer le mot de passe"
  ),
  authSavePassword: L(
    "Wachtwoord opslaan",
    "Save password",
    "Passwort speichern",
    "Enregistrer le mot de passe"
  ),
  authPasswordMismatch: L(
    "Wachtwoorden komen niet overeen.",
    "Passwords do not match.",
    "Passwörter stimmen nicht überein.",
    "Les mots de passe ne correspondent pas."
  ),
  authResetLinkExpired: L(
    "Deze resetlink is ongeldig of verlopen.",
    "This reset link is invalid or expired.",
    "Dieser Reset-Link ist ungültig oder abgelaufen.",
    "Ce lien de réinitialisation est invalide ou expiré."
  ),
  authCheckEmailTitle: L(
    "Controleer je e-mail",
    "Check your email",
    "Prüfen Sie Ihre E-Mail",
    "Vérifiez votre e-mail"
  ),
  authCheckEmailBody: L(
    "We hebben een link gestuurd naar {email}. Klik op de link om verder te gaan.",
    "We’ve sent a link to {email}. Click the link to continue.",
    "Wir haben einen Link an {email} gesendet. Klicken Sie auf den Link, um fortzufahren.",
    "Nous avons envoyé un lien à {email}. Cliquez sur le lien pour continuer."
  ),
  authCheckEmailBodyRegister: L(
    "We hebben een verificatielink gestuurd naar {email}. Klik op de link om verder te gaan.",
    "We’ve sent a verification link to {email}. Click the link to continue.",
    "Wir haben einen Bestätigungslink an {email} gesendet. Klicken Sie auf den Link, um fortzufahren.",
    "Nous avons envoyé un lien de vérification à {email}. Cliquez sur le lien pour continuer."
  ),
  authCheckEmailBodyReset: L(
    "We hebben een resetlink gestuurd naar {email}. Klik op de link om verder te gaan.",
    "We’ve sent a reset link to {email}. Click the link to continue.",
    "Wir haben einen Reset-Link an {email} gesendet. Klicken Sie auf den Link, um fortzufahren.",
    "Nous avons envoyé un lien de réinitialisation à {email}. Cliquez sur le lien pour continuer."
  ),
  authResend: L("Opnieuw versturen", "Resend", "Erneut senden", "Renvoyer"),
  authResent: L(
    "Opnieuw verstuurd",
    "Resent",
    "Erneut gesendet",
    "Renvoyé"
  ),
  authVerifyPending: L(
    "Bezig met bevestigen",
    "Confirming…",
    "Bestätigung läuft",
    "Confirmation en cours"
  ),
  authVerifyPendingBody: L(
    "Een moment geduld terwijl we je e-mailadres bevestigen.",
    "Please wait while we confirm your email address.",
    "Einen Moment bitte, während wir Ihre E-Mail-Adresse bestätigen.",
    "Veuillez patienter pendant que nous confirmons votre adresse e-mail."
  ),
  authVerifySuccess: L(
    "E-mailadres bevestigd!",
    "Email address confirmed!",
    "E-Mail-Adresse bestätigt!",
    "Adresse e-mail confirmée !"
  ),
  authVerifySuccessBody: L(
    "Je account is helemaal klaar. Je kunt nu inloggen en beginnen met winkelen op EuropMade.",
    "Your account is ready. You can now sign in and start shopping on EuropMade.",
    "Ihr Konto ist bereit. Sie können sich jetzt anmelden und bei EuropMade einkaufen.",
    "Votre compte est prêt. Vous pouvez maintenant vous connecter et faire vos achats sur EuropMade."
  ),
  authVerifyError: L(
    "Deze link is niet (meer) geldig",
    "This link is no longer valid",
    "Dieser Link ist nicht (mehr) gültig",
    "Ce lien n’est plus valide"
  ),
  authVerifyErrorBody: L(
    "E-mailverificatie blokkeert het winkelen niet — je kunt gewoon inloggen en verdergaan.",
    "Email verification does not block shopping — you can sign in and continue.",
    "E-Mail-Verifizierung blockiert das Einkaufen nicht — Sie können sich anmelden und fortfahren.",
    "La vérification de l’e-mail n’empêche pas les achats — vous pouvez vous connecter et continuer."
  ),
  authGoToLogin: L(
    "Naar inloggen",
    "Go to sign in",
    "Zur Anmeldung",
    "Aller à la connexion"
  ),
  authGoToAccount: L(
    "Naar mijn account",
    "Go to my account",
    "Zu meinem Konto",
    "Aller à mon compte"
  ),

  // —— Partner onboarding ——
  partnerStepChoose: L(
    "Partner kiezen",
    "Choose partner type",
    "Partnertyp wählen",
    "Choisir le type de partenaire"
  ),
  partnerStepCompany: L(
    "Bedrijfsgegevens",
    "Company details",
    "Unternehmensdaten",
    "Coordonnées de l’entreprise"
  ),
  partnerStepVerification: L(
    "Verificatie",
    "Verification",
    "Verifizierung",
    "Vérification"
  ),
  partnerStepDocuments: L(
    "Documenten",
    "Documents",
    "Dokumente",
    "Documents"
  ),
  partnerStepSummary: L(
    "Samenvatting",
    "Summary",
    "Zusammenfassung",
    "Résumé"
  ),
  partnerStart: L(
    "Start aanmelding",
    "Start application",
    "Anmeldung starten",
    "Démarrer l’inscription"
  ),
  partnerSubmit: L(
    "Aanvraag indienen",
    "Submit application",
    "Antrag einreichen",
    "Soumettre la demande"
  ),
  partnerSubmitAddition: L(
    "Aanvulling versturen",
    "Send additional info",
    "Ergänzung senden",
    "Envoyer le complément"
  ),
  partnerWelcomeSubtitle: L(
    "Verkoop je producten aan miljoenen Europese consumenten — meestal binnen één werkdag live.",
    "Sell your products to millions of European consumers — usually live within one business day.",
    "Verkaufen Sie Ihre Produkte an Millionen europäischer Verbraucher — meist innerhalb eines Werktags live.",
    "Vendez vos produits à des millions de consommateurs européens — généralement en ligne sous un jour ouvrable."
  ),
  partnerWelcomeNeeds: L(
    "Je hebt nodig: bedrijfsgegevens, een geldig identiteitsbewijs, een KvK-uittreksel, en — als je zelf producten produceert of een merk vertegenwoordigt — bewijs van Europese productie.",
    "You need: company details, a valid ID, a chamber of commerce extract, and — if you produce products or represent a brand — proof of European production.",
    "Sie benötigen: Unternehmensdaten, einen gültigen Ausweis, einen Handelsregisterauszug und — wenn Sie Produkte herstellen oder eine Marke vertreten — Nachweis europäischer Produktion.",
    "Vous aurez besoin de : coordonnées d’entreprise, une pièce d’identité valide, un extrait du registre du commerce, et — si vous produisez ou représentez une marque — une preuve de production européenne."
  ),
  partnerVerifyEmailGate: L(
    "Bevestig eerst je e-mailadres om partner te worden.",
    "Confirm your email address first to become a partner.",
    "Bestätigen Sie zuerst Ihre E-Mail-Adresse, um Partner zu werden.",
    "Confirmez d’abord votre adresse e-mail pour devenir partenaire."
  ),
  partnerResendVerification: L(
    "Verstuur de verificatiemail opnieuw",
    "Resend verification email",
    "Bestätigungs-E-Mail erneut senden",
    "Renvoyer l’e-mail de vérification"
  ),
  partnerVerificationResent: L(
    "Verificatiemail opnieuw verstuurd",
    "Verification email resent",
    "Bestätigungs-E-Mail erneut gesendet",
    "E-mail de vérification renvoyé"
  ),
  partnerRoleRetailer: L("Retailer", "Retailer", "Händler", "Détaillant"),
  partnerRoleRetailerDesc: L(
    "Ik verkoop producten, van eigen of andermans merk",
    "I sell products of my own or another brand",
    "Ich verkaufe Produkte eigener oder fremder Marken",
    "Je vends des produits de ma marque ou d’une autre"
  ),
  partnerRoleProducer: L(
    "Producent / Merkhouder",
    "Producer / Brand owner",
    "Produzent / Markeninhaber",
    "Producteur / Propriétaire de marque"
  ),
  partnerRoleProducerDesc: L(
    "Ik produceer en/of bezit een eigen merk",
    "I produce and/or own a brand",
    "Ich produziere und/oder besitze eine eigene Marke",
    "Je produis et/ou possède une marque"
  ),
  partnerRoleDistributor: L(
    "Distributeur",
    "Distributor",
    "Distributor",
    "Distributeur"
  ),
  partnerRoleDistributorDesc: L(
    "Ik verkoop namens een ander merk, met autorisatie",
    "I sell on behalf of another brand, with authorisation",
    "Ich verkaufe im Namen einer anderen Marke mit Autorisierung",
    "Je vends pour le compte d’une autre marque, avec autorisation"
  ),
  partnerRoleQuestion: L(
    "Hoe wil je verkopen op EuropMade?",
    "How do you want to sell on EuropMade?",
    "Wie möchten Sie auf EuropMade verkaufen?",
    "Comment souhaitez-vous vendre sur EuropMade ?"
  ),
  partnerRoleHint: L(
    "Kies één of meerdere rollen — je kunt bijvoorbeeld tegelijk Producent én Retailer zijn.",
    "Choose one or more roles — for example you can be both Producer and Retailer.",
    "Wählen Sie eine oder mehrere Rollen — Sie können z. B. Produzent und Händler zugleich sein.",
    "Choisissez un ou plusieurs rôles — par exemple Producteur et Détaillant à la fois."
  ),
  partnerSelectRoles: L(
    "Rol(len) selecteren",
    "Select role(s)",
    "Rolle(n) auswählen",
    "Sélectionner le(s) rôle(s)"
  ),
  partnerSelectRoleError: L(
    "Kies ten minste één rol (Retailer, Producent/Merkhouder en/of Distributeur).",
    "Choose at least one role (Retailer, Producer/Brand owner and/or Distributor).",
    "Wählen Sie mindestens eine Rolle (Händler, Produzent/Markeninhaber und/oder Distributor).",
    "Choisissez au moins un rôle (Détaillant, Producteur/Propriétaire de marque et/ou Distributeur)."
  ),
  partnerSaveFailed: L(
    "Opslaan is niet gelukt.",
    "Saving failed.",
    "Speichern fehlgeschlagen.",
    "L’enregistrement a échoué."
  ),
  partnerCompanyName: L("Bedrijfsnaam", "Company name", "Firmenname", "Nom de l’entreprise"),
  partnerCompanyNamePlaceholder: L(
    "Merknaam BV",
    "Brand name Ltd",
    "Markenname GmbH",
    "Nom de marque SARL"
  ),
  partnerLegalForm: L("Rechtsvorm", "Legal form", "Rechtsform", "Forme juridique"),
  partnerLegalFormPlaceholder: L("BV", "Ltd", "GmbH", "SARL"),
  partnerChamberNumber: L(
    "KvK-/bedrijfsregistratienummer",
    "Chamber of commerce / company registration number",
    "Handelsregister-/Unternehmensnummer",
    "Numéro de registre du commerce / d’entreprise"
  ),
  partnerCompanyAddress: L(
    "Bedrijfsadres",
    "Company address",
    "Firmenadresse",
    "Adresse de l’entreprise"
  ),
  partnerCompanyAddressPlaceholder: L(
    "Straat, huisnummer, postcode, plaats",
    "Street, number, postal code, city",
    "Straße, Hausnummer, PLZ, Ort",
    "Rue, numéro, code postal, ville"
  ),
  partnerCountryCode: L(
    "Land (ISO-landcode)",
    "Country (ISO country code)",
    "Land (ISO-Ländercode)",
    "Pays (code ISO)"
  ),
  partnerCountryCodePlaceholder: L(
    "e.g. NL, DE, FR",
    "e.g. NL, DE, FR",
    "z. B. NL, DE, FR",
    "p. ex. NL, DE, FR"
  ),
  partnerCountryCodeHint: L(
    "Twee letters, conform ISO 3166-1 — bepaalt het vestigingsland van je bedrijf.",
    "Two letters per ISO 3166-1 — determines your company’s country of establishment.",
    "Zwei Buchstaben gemäß ISO 3166-1 — bestimmt das Niederlassungsland Ihres Unternehmens.",
    "Deux lettres selon ISO 3166-1 — détermine le pays d’établissement de votre entreprise."
  ),
  partnerVatNumber: L("BTW-nummer", "VAT number", "USt-IdNr.", "Numéro de TVA"),
  partnerContactName: L(
    "Contactpersoon — naam",
    "Contact person — name",
    "Ansprechpartner — Name",
    "Personne de contact — nom"
  ),
  partnerContactPhone: L(
    "Contactpersoon — telefoonnummer",
    "Contact person — phone number",
    "Ansprechpartner — Telefonnummer",
    "Personne de contact — téléphone"
  ),
  partnerContactEmail: L(
    "Contactpersoon — e-mailadres",
    "Contact person — email address",
    "Ansprechpartner — E-Mail-Adresse",
    "Personne de contact — adresse e-mail"
  ),
  partnerContactEmailHint: L(
    "Mag afwijken van je inlog-e-mailadres.",
    "May differ from your login email address.",
    "Darf von Ihrer Login-E-Mail-Adresse abweichen.",
    "Peut différer de votre adresse e-mail de connexion."
  ),
  partnerContactEmailPlaceholder: L(
    "contact@brandname.eu",
    "contact@brandname.eu",
    "kontakt@markenname.eu",
    "contact@nomdemarque.eu"
  ),
  partnerContactPhonePlaceholder: L(
    "+31 6 12345678",
    "+31 6 12345678",
    "+49 170 1234567",
    "+33 6 12 34 56 78"
  ),
  partnerVatPlaceholder: L(
    "NL123456789B01",
    "NL123456789B01",
    "DE123456789",
    "FR12345678901"
  ),
  partnerIbanPlaceholder: L(
    "NL91 ABNA 0417 1643 00",
    "NL91 ABNA 0417 1643 00",
    "DE89 3704 0044 0532 0130 00",
    "FR14 2004 1010 0505 0001 3M02 606"
  ),
  partnerReviewCompanyLine: L(
    "{name} · KvK {chamber} · {vat}",
    "{name} · CoC {chamber} · {vat}",
    "{name} · HR {chamber} · {vat}",
    "{name} · RCS {chamber} · {vat}"
  ),
  partnerReviewIbanLine: L(
    "IBAN {iban}",
    "IBAN {iban}",
    "IBAN {iban}",
    "IBAN {iban}"
  ),
  partnerIban: L(
    "IBAN (uitbetalingsgegevens)",
    "IBAN (payout details)",
    "IBAN (Auszahlungsdaten)",
    "IBAN (coordonnées de paiement)"
  ),
  partnerAccountHolder: L(
    "Rekeninghouder",
    "Account holder",
    "Kontoinhaber",
    "Titulaire du compte"
  ),
  partnerAccountHolderHint: L(
    "Moet overeenkomen met de bedrijfsnaam.",
    "Must match the company name.",
    "Muss mit dem Firmennamen übereinstimmen.",
    "Doit correspondre au nom de l’entreprise."
  ),
  partnerIdentityCheck: L(
    "Identiteitscontrole",
    "Identity check",
    "Identitätsprüfung",
    "Contrôle d’identité"
  ),
  partnerRepName: L(
    "Naam bevoegde vertegenwoordiger",
    "Name of authorised representative",
    "Name des bevollmächtigten Vertreters",
    "Nom du représentant autorisé"
  ),
  partnerRepRole: L("Functie", "Role / title", "Funktion", "Fonction"),
  partnerRepRolePlaceholder: L(
    "Directeur / Eigenaar",
    "Director / Owner",
    "Geschäftsführer / Eigentümer",
    "Directeur / Propriétaire"
  ),
  partnerEuProductionTitle: L(
    "Europese productieverificatie",
    "European production verification",
    "Europäische Produktionsverifizierung",
    "Vérification de la production européenne"
  ),
  partnerEuProductionReason: L(
    "— getoond omdat Producent/Merkhouder en/of Distributeur is gekozen",
    "— shown because Producer/Brand owner and/or Distributor is selected",
    "— angezeigt, weil Produzent/Markeninhaber und/oder Distributor gewählt wurde",
    "— affiché car Producteur/Propriétaire de marque et/ou Distributeur est sélectionné"
  ),
  partnerProductionCountry: L(
    "Land van productie (hoofdlocatie)",
    "Country of production (main location)",
    "Produktionsland (Hauptstandort)",
    "Pays de production (site principal)"
  ),
  partnerManufacturer: L("Fabrikant", "Manufacturer", "Hersteller", "Fabricant"),
  partnerManufacturerPlaceholder: L(
    "Merknaam BV — eigen fabriek",
    "Brand name Ltd — own factory",
    "Markenname GmbH — eigene Fabrik",
    "Nom de marque SARL — usine propre"
  ),
  partnerProductionLocations: L(
    "Productielocatie(s)",
    "Production location(s)",
    "Produktionsstandort(e)",
    "Site(s) de production"
  ),
  partnerProductionLocationsHint: L(
    "Minimaal één verplicht, meerdere locaties toegestaan.",
    "At least one required; multiple locations allowed.",
    "Mindestens einer erforderlich; mehrere Standorte erlaubt.",
    "Au moins un obligatoire ; plusieurs sites autorisés."
  ),
  partnerBrandOwnership: L(
    "Eigendom van het merk",
    "Brand ownership",
    "Markeneigentum",
    "Propriété de la marque"
  ),
  partnerBrandOwnershipPlaceholder: L(
    "Eigen merk",
    "Own brand",
    "Eigene Marke",
    "Marque propre"
  ),
  partnerManufacturerOwnership: L(
    "Eigendom van de fabrikant (optioneel)",
    "Manufacturer ownership (optional)",
    "Eigentum am Hersteller (optional)",
    "Propriété du fabricant (optionnel)"
  ),
  partnerManufacturerOwnershipPlaceholder: L(
    "Eigen faciliteit / externe contractfabrikant",
    "Own facility / external contract manufacturer",
    "Eigene Anlage / externer Lohnhersteller",
    "Installation propre / fabricant sous contrat externe"
  ),
  partnerRepresentedBrands: L(
    "Vertegenwoordigde merk(en)",
    "Represented brand(s)",
    "Vertretene Marke(n)",
    "Marque(s) représentée(s)"
  ),
  partnerRepresentedBrandsPlaceholder: L(
    "Naam van het/de merk(en) waarvoor je verkoopt",
    "Name of the brand(s) you sell for",
    "Name der Marke(n), für die Sie verkaufen",
    "Nom de la/des marque(s) pour laquelle/lesquelles vous vendez"
  ),
  partnerRepresentedBrandsHint: L(
    "Verplicht voor Distributeur — samen met het autorisatiebewijs bij Documenten.",
    "Required for Distributor — together with the authorisation proof under Documents.",
    "Erforderlich für Distributor — zusammen mit dem Autorisierungsnachweis unter Dokumente.",
    "Obligatoire pour Distributeur — avec la preuve d’autorisation sous Documents."
  ),
  partnerUploadDocuments: L(
    "Upload documenten",
    "Upload documents",
    "Dokumente hochladen",
    "Téléverser des documents"
  ),
  partnerUploadDocumentsHint: L(
    "Op basis van je gekozen rol(len) is het volgende nodig:",
    "Based on your selected role(s), the following is required:",
    "Basierend auf Ihrer/Ihren gewählten Rolle(n) ist Folgendes erforderlich:",
    "En fonction de votre/vos rôle(s) choisi(s), voici ce qui est requis :"
  ),
  partnerDocIdentity: L(
    "Identiteitsbewijs (bevoegde vertegenwoordiger)",
    "Identity document (authorised representative)",
    "Ausweisdokument (bevollmächtigter Vertreter)",
    "Pièce d’identité (représentant autorisé)"
  ),
  partnerDocChamber: L(
    "KvK-/bedrijfsregistratie-uittreksel",
    "Chamber of commerce / company registration extract",
    "Handelsregister-/Unternehmensauszug",
    "Extrait du registre du commerce / d’entreprise"
  ),
  partnerDocProduction: L(
    "Productiebewijsstuk",
    "Production proof",
    "Produktionsnachweis",
    "Preuve de production"
  ),
  partnerDocAuthorization: L(
    "Autorisatiebewijs (distributieovereenkomst)",
    "Authorisation proof (distribution agreement)",
    "Autorisierungsnachweis (Vertriebsvereinbarung)",
    "Preuve d’autorisation (accord de distribution)"
  ),
  partnerDocCertifications: L(
    "Aanvullende certificeringen (optioneel)",
    "Additional certifications (optional)",
    "Zusätzliche Zertifizierungen (optional)",
    "Certifications complémentaires (optionnel)"
  ),
  partnerReqAllRoles: L(
    "Verplicht — alle rollen",
    "Required — all roles",
    "Erforderlich — alle Rollen",
    "Obligatoire — tous les rôles"
  ),
  partnerReqProducer: L(
    "Verplicht — Producent/Merkhouder",
    "Required — Producer/Brand owner",
    "Erforderlich — Produzent/Markeninhaber",
    "Obligatoire — Producteur/Propriétaire de marque"
  ),
  partnerReqDistributor: L(
    "Verplicht — Distributeur",
    "Required — Distributor",
    "Erforderlich — Distributor",
    "Obligatoire — Distributeur"
  ),
  partnerReqOptional: L(
    "Optioneel — alle rollen",
    "Optional — all roles",
    "Optional — alle Rollen",
    "Optionnel — tous les rôles"
  ),
  partnerDocumentsRequiredError: L(
    "Upload alle voor je gekozen rol(len) verplichte documenten voordat je verdergaat.",
    "Upload all documents required for your selected role(s) before continuing.",
    "Laden Sie alle für Ihre gewählte(n) Rolle(n) erforderlichen Dokumente hoch, bevor Sie fortfahren.",
    "Téléversez tous les documents obligatoires pour votre/vos rôle(s) avant de continuer."
  ),
  partnerUploadFailed: L(
    "Documentupload is niet gelukt.",
    "Document upload failed.",
    "Dokument-Upload fehlgeschlagen.",
    "Le téléversement du document a échoué."
  ),
  partnerReviewTitle: L(
    "Controleer je aanvraag",
    "Review your application",
    "Prüfen Sie Ihren Antrag",
    "Vérifiez votre demande"
  ),
  partnerReviewRoles: L(
    "Gekozen rollen",
    "Selected roles",
    "Gewählte Rollen",
    "Rôles choisis"
  ),
  partnerReviewNoRole: L(
    "Geen rol gekozen",
    "No role selected",
    "Keine Rolle gewählt",
    "Aucun rôle sélectionné"
  ),
  partnerReviewProduction: L(
    "Productie: {country} · {manufacturer}",
    "Production: {country} · {manufacturer}",
    "Produktion: {country} · {manufacturer}",
    "Production : {country} · {manufacturer}"
  ),
  partnerReviewRetailerOnly: L(
    "Niet van toepassing (uitsluitend Retailer gekozen)",
    "Not applicable (Retailer only selected)",
    "Nicht zutreffend (nur Händler gewählt)",
    "Non applicable (uniquement Détaillant sélectionné)"
  ),
  partnerReviewDocumentsCount: L(
    "{count} document(en) geüpload",
    "{count} document(s) uploaded",
    "{count} Dokument(e) hochgeladen",
    "{count} document(s) téléversé(s)"
  ),
  partnerAcceptPartnerTerms: L(
    "Ik ga akkoord met de Partnervoorwaarden en het verwerkersaddendum",
    "I agree to the Partner Terms and the data processing addendum",
    "Ich stimme den Partnerbedingungen und dem Auftragsverarbeitungszusatz zu",
    "J’accepte les Conditions partenaires et l’avenant de traitement des données"
  ),
  partnerTermsRequiredError: L(
    "Je moet akkoord gaan met de Partnervoorwaarden en het verwerkersaddendum.",
    "You must agree to the Partner Terms and the data processing addendum.",
    "Sie müssen den Partnerbedingungen und dem Auftragsverarbeitungszusatz zustimmen.",
    "Vous devez accepter les Conditions partenaires et l’avenant de traitement des données."
  ),
  partnerSubmitFailed: L(
    "Indienen is niet gelukt.",
    "Submission failed.",
    "Einreichung fehlgeschlagen.",
    "L’envoi a échoué."
  ),
  partnerCurrentStatus: L(
    "Huidige status:",
    "Current status:",
    "Aktueller Status:",
    "Statut actuel :"
  ),
  partnerStatusPendingTitle: L(
    "Je aanvraag wordt beoordeeld",
    "Your application is under review",
    "Ihr Antrag wird geprüft",
    "Votre demande est en cours d’examen"
  ),
  partnerStatusPendingBody: L(
    "Dit duurt meestal minder dan één werkdag. Je ontvangt een e-mail zodra er een beslissing is.",
    "This usually takes less than one business day. You’ll receive an email once a decision is made.",
    "Das dauert in der Regel weniger als einen Werktag. Sie erhalten eine E-Mail, sobald eine Entscheidung vorliegt.",
    "Cela prend généralement moins d’un jour ouvrable. Vous recevrez un e-mail dès qu’une décision est prise."
  ),
  partnerStatusApprovedTitle: L(
    "Welkom als partner!",
    "Welcome as a partner!",
    "Willkommen als Partner!",
    "Bienvenue en tant que partenaire !"
  ),
  partnerStatusApprovedBody: L(
    "Voordat je naar je Dashboard kunt, stel je eerst tweestapsverificatie in — verplicht voor Retailer- en Producent-accounts.",
    "Before you can open your Dashboard, set up two-factor authentication — required for Retailer and Producer accounts.",
    "Bevor Sie Ihr Dashboard öffnen können, richten Sie die Zwei-Faktor-Authentifizierung ein — erforderlich für Händler- und Produzentenkonten.",
    "Avant d’ouvrir votre tableau de bord, configurez l’authentification à deux facteurs — obligatoire pour les comptes Détaillant et Producteur."
  ),
  partnerSetup2fa: L(
    "Tweestapsverificatie instellen",
    "Set up two-factor authentication",
    "Zwei-Faktor-Authentifizierung einrichten",
    "Configurer l’authentification à deux facteurs"
  ),
  partnerStatusRejectedTitle: L(
    "Je aanvraag is (nog) niet goedgekeurd",
    "Your application is not (yet) approved",
    "Ihr Antrag ist (noch) nicht genehmigt",
    "Votre demande n’est pas (encore) approuvée"
  ),
  partnerStatusRejectedFallback: L(
    "Er is geen specifieke afkeurreden vastgelegd. Pas je gegevens aan en dien de aanvraag opnieuw in, of neem contact op met EuropMade.",
    "No specific rejection reason was recorded. Update your details and resubmit, or contact EuropMade.",
    "Es wurde kein spezifischer Ablehnungsgrund erfasst. Passen Sie Ihre Angaben an und reichen Sie erneut ein, oder kontaktieren Sie EuropMade.",
    "Aucune raison de refus spécifique n’a été enregistrée. Modifiez vos données et renvoyez la demande, ou contactez EuropMade."
  ),
  partnerStatusRejectedCta: L(
    "Aanpassen en opnieuw indienen",
    "Edit and resubmit",
    "Anpassen und erneut einreichen",
    "Modifier et renvoyer"
  ),
  partnerStatusAdditionTitle: L(
    "We hebben nog iets van je nodig",
    "We still need something from you",
    "Wir brauchen noch etwas von Ihnen",
    "Nous avons encore besoin de quelque chose de votre part"
  ),
  partnerStatusAdditionFallback: L(
    "Controleer de gevraagde onderdelen in je aanvraag en dien opnieuw in.",
    "Check the requested parts of your application and resubmit.",
    "Prüfen Sie die angeforderten Teile Ihres Antrags und reichen Sie erneut ein.",
    "Vérifiez les éléments demandés de votre dossier et renvoyez-le."
  ),
  sellerTranslationsTitle: L(
    "Productvertalingen",
    "Product translations",
    "Produktübersetzungen",
    "Traductions produit"
  ),
  sellerTranslationsIntro: L(
    "Stel de bron-taal in en bekijk de status van vertalingen. Productteksten lopen via Product Cloud, niet via UI-i18n.",
    "Set the source language and view translation status. Product copy uses Product Cloud, not UI i18n.",
    "Legen Sie die Ausgangssprache fest und prüfen Sie den Übersetzungsstatus. Produkttexte laufen über Product Cloud, nicht über UI-i18n.",
    "Définissez la langue source et consultez le statut des traductions. Les textes produit passent par Product Cloud, pas l’i18n UI."
  ),
  sellerTranslationsSourceLanguage: L(
    "Bron-taal",
    "Source language",
    "Ausgangssprache",
    "Langue source"
  ),
  sellerTranslationsPrepare: L(
    "Vertalingen voorbereiden",
    "Prepare translations",
    "Übersetzungen vorbereiten",
    "Préparer les traductions"
  ),
  sellerTranslationsSaveSource: L(
    "Bron-taal opslaan",
    "Save source language",
    "Ausgangssprache speichern",
    "Enregistrer la langue source"
  ),
  sellerTranslationsStatusHeading: L(
    "Status per taal",
    "Status by language",
    "Status pro Sprache",
    "Statut par langue"
  ),
  sellerTranslationsProviderOff: L(
    "Automatische vertaling nog niet geactiveerd",
    "Automatic translation not activated yet",
    "Automatische Übersetzung noch nicht aktiviert",
    "Traduction automatique pas encore activée"
  ),
  sellerTranslationsBack: L(
    "Terug naar producten",
    "Back to products",
    "Zurück zu Produkten",
    "Retour aux produits"
  ),
  sellerTranslationsCloudHeading: L(
    "Product Cloud — vertalingen",
    "Product Cloud — translations",
    "Product Cloud — Übersetzungen",
    "Product Cloud — traductions"
  ),
  sellerTranslationsOpen: L(
    "Vertalingen",
    "Translations",
    "Übersetzungen",
    "Traductions"
  ),
  sellerTranslationsLangNl: L("Nederlands", "Dutch", "Niederländisch", "Néerlandais"),
  sellerTranslationsLangEn: L("Engels", "English", "Englisch", "Anglais"),
  sellerTranslationsLangDe: L("Duits", "German", "Deutsch", "Allemand"),
  sellerTranslationsLangFr: L("Frans", "French", "Französisch", "Français"),
  sellerTranslationsSaved: L(
    "Bron-taal opgeslagen.",
    "Source language saved.",
    "Ausgangssprache gespeichert.",
    "Langue source enregistrée."
  ),
  sellerTranslationsPrepared: L(
    "Vertalingen voorbereid voor de andere actieve talen.",
    "Translations prepared for the other active languages.",
    "Übersetzungen für die anderen aktiven Sprachen vorbereitet.",
    "Traductions préparées pour les autres langues actives."
  ),
  sellerTranslationsLoadError: L(
    "Vertalingen laden mislukt.",
    "Failed to load translations.",
    "Übersetzungen konnten nicht geladen werden.",
    "Échec du chargement des traductions."
  ),
  sellerTranslationsForbidden: L(
    "Je mag dit product niet beheren.",
    "You are not allowed to manage this product.",
    "Sie dürfen dieses Produkt nicht verwalten.",
    "Vous n’êtes pas autorisé à gérer ce produit."
  ),
  sellerTranslationsNoProducts: L(
    "Nog geen Product Cloud-producten. Maak eerst een product aan.",
    "No Product Cloud products yet. Create a product first.",
    "Noch keine Product-Cloud-Produkte. Legen Sie zuerst ein Produkt an.",
    "Pas encore de produits Product Cloud. Créez d’abord un produit."
  ),
} as const satisfies Record<string, LocalizedString>

export type StorefrontMessageKey = keyof typeof M

/** Nav taxonomy slug → message key (UI labels, not Product Cloud data). */
export const CATEGORY_NAV_MESSAGE_KEYS: Record<string, StorefrontMessageKey> = {
  tuin: "catTuin",
  elektronica: "catElektronica",
  mode: "catMode",
  wonen: "catWonen",
  sport: "catSport",
  voeding: "catVoeding",
  keuken: "catKeuken",
  huishouden: "catHuishouden",
  "beauty-verzorging": "catBeautyVerzorging",
  "baby-kind": "catBabyKind",
  speelgoed: "catSpeelgoed",
  dieren: "catDieren",
  "klus-gereedschap": "catKlusGereedschap",
  "auto-motor": "catAutoMotor",
  kantoor: "catKantoor",
  "boeken-media": "catBoekenMedia",
  gezondheid: "catGezondheid",
  verlichting: "catVerlichting",
  badkamer: "catBadkamer",
  slaapkamer: "catSlaapkamer",
  outdoor: "catOutdoor",
  duurzaam: "catDuurzaam",
  cadeaus: "catCadeaus",
  "juwelen-horloges": "catJuwelenHorloges",
  "tassen-accessoires": "catTassenAccessoires",
  schoenen: "catSchoenen",
  "plant-bloem": "catPlantBloem",
  "feest-seizoen": "catFeestSeizoen",
  ambacht: "catAmbacht",
  algemeen: "catAlgemeen",
}

export function categoryNavLabel(
  slug: string,
  fallback: string,
  locale: StorefrontLocale
): string {
  const key = CATEGORY_NAV_MESSAGE_KEYS[slug]
  return key ? t(key, locale) : fallback
}

const COUNTRY_MESSAGE_KEYS: Record<string, StorefrontMessageKey> = {
  NL: "countryNL",
  DE: "countryDE",
  BE: "countryBE",
  FR: "countryFR",
  IT: "countryIT",
  ES: "countryES",
  PL: "countryPL",
  AT: "countryAT",
  SE: "countrySE",
  DK: "countryDK",
  IE: "countryIE",
  PT: "countryPT",
  FI: "countryFI",
  EU: "countryEU",
}

export function countryDisplayLabel(
  code: string,
  locale: StorefrontLocale
): string {
  const key = COUNTRY_MESSAGE_KEYS[code.toUpperCase()]
  return key ? t(key, locale) : code.toUpperCase()
}

export function t(
  key: StorefrontMessageKey,
  locale: StorefrontLocale
): string {
  return pickLocalized(M[key], locale)
}

/** Replace `{name}` placeholders in a message. */
export function tFormat(
  key: StorefrontMessageKey,
  locale: StorefrontLocale,
  vars: Record<string, string | number>
): string {
  let out = t(key, locale)
  for (const [name, value] of Object.entries(vars)) {
    out = out.split(`{${name}}`).join(String(value))
  }
  return out
}
