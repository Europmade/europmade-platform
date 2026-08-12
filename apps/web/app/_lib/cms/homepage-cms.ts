/**
 * Homepage CMS mock document — Admin-editable shape (frontend-only for now).
 * Every section supports title/subtitle/image/sort/visibility/publish/expiry.
 */

import { L, type LocalizedString } from "../i18n/locales"
import { manufacturerLogoSrc } from "../product-mockup"
import type { CmsPublishMeta } from "./publish"

export type HomepageHeroCms = CmsPublishMeta & {
  id: string
  title: LocalizedString
  subtitle: LocalizedString
  cta1: { label: LocalizedString; href: string }
  cta2: { label: LocalizedString; href: string }
  /** Optional injected hero image; empty → composition placeholder. */
  heroImage?: string | null
  heroImageAlt: LocalizedString
  backgroundGradient: string
  trustBullets: LocalizedString[]
  captionTitle?: LocalizedString
  captionBody?: LocalizedString
}

export type HomepageCampaignCms = CmsPublishMeta & {
  id: string
  slug: string
  title: LocalizedString
  subtitle: LocalizedString
  ctaLabel: LocalizedString
  href: string
  image?: string | null
  imageAlt: LocalizedString
  accentHue: number
}

export type HomepageBannerCms = CmsPublishMeta & {
  id: string
  position: 1 | 2
  location: "homepage" | "category" | "search" | "product"
  title: LocalizedString
  subtitle: LocalizedString
  ctaLabel: LocalizedString
  destinationUrl: string
  linkType: "product" | "category" | "partner" | "collection" | "external"
  image?: string | null
  imageAlt: LocalizedString
  background: string
  logo?: string | null
  /** Active campaign window (also mirrored in publishAt/expiresAt). */
  activeFrom?: string | null
  activeTo?: string | null
}

export type HomepageSectionCms = CmsPublishMeta & {
  id: string
  key:
    | "featured"
    | "newest"
    | "best_sellers"
    | "categories"
    | "campaigns"
    | "partners"
    | "why"
    | "newsletter"
  title: LocalizedString
  subtitle: LocalizedString
  image?: string | null
}

export type HomepageCategoryCms = CmsPublishMeta & {
  id: string
  slug: string
  title: LocalizedString
  subtitle?: LocalizedString
  image?: string | null
  productCountHint: number
}

export type HomepageWhyItemCms = CmsPublishMeta & {
  id: string
  title: LocalizedString
  subtitle: LocalizedString
  image?: string | null
}

export type HomepageNewsletterCms = CmsPublishMeta & {
  id: string
  title: LocalizedString
  subtitle: LocalizedString
  image?: string | null
  placeholder: LocalizedString
  submitLabel: LocalizedString
  invalidEmail: LocalizedString
  successMessage: LocalizedString
}

export type HomepagePartnerSpotlightCms = CmsPublishMeta & {
  id: string
  slug: string
  title: LocalizedString
  subtitle: LocalizedString
  image?: string | null
  country: LocalizedString
  rating: number
  productCount: number
}

export type HomepageCmsDocument = {
  hero: HomepageHeroCms
  campaigns: HomepageCampaignCms[]
  banners: HomepageBannerCms[]
  sections: HomepageSectionCms[]
  categories: HomepageCategoryCms[]
  whyItems: HomepageWhyItemCms[]
  newsletter: HomepageNewsletterCms
  partnerSpotlight: HomepagePartnerSpotlightCms[]
}

/** Temporary mock payload — replace with Admin/CMS fetch later. */
export const HOMEPAGE_CMS_MOCK: HomepageCmsDocument = {
  hero: {
    id: "hero_main",
    visible: true,
    sortOrder: 0,
    publishAt: null,
    expiresAt: null,
    title: L(
      "De grootste marketplace voor Europese producten.",
      "Europe’s marketplace for European-made products.",
      "Der Marktplatz für europäische Produkte.",
      "La marketplace des produits européens."
    ),
    subtitle: L(
      "Koop rechtstreeks bij Europese producenten én officiële retailers. Vergelijk prijzen, ontdek Verified™ merken en houd waarde, innovatie en werkgelegenheid binnen Europa.",
      "Buy directly from European producers and official retailers. Compare prices, discover Verified™ brands, and keep value, innovation and jobs in Europe.",
      "Kaufen Sie direkt bei europäischen Produzenten und offiziellen Händlern. Vergleichen Sie Preise, entdecken Sie Verified™-Marken und halten Sie Wertschöpfung in Europa.",
      "Achetez directement auprès de producteurs européens et de détaillants officiels. Comparez les prix, découvrez les marques Verified™ et gardez la valeur en Europe."
    ),
    cta1: {
      label: L(
        "Bekijk producten",
        "Browse products",
        "Produkte ansehen",
        "Voir les produits"
      ),
      href: "/categorie",
    },
    cta2: {
      label: L(
        "Word verkoper",
        "Become a seller",
        "Verkäufer werden",
        "Devenir vendeur"
      ),
      href: "/partner-onboarding",
    },
    heroImage: null,
    heroImageAlt: L(
      "Europese producten, verpakking en Verified™ marketplace",
      "European products, packaging and Verified™ marketplace",
      "Europäische Produkte, Verpackung und Verified™-Marktplatz",
      "Produits européens, emballage et marketplace Verified™"
    ),
    backgroundGradient:
      "linear-gradient(165deg, #ffffff 0%, #f7f8fa 42%, #f2f3f5 100%)",
    trustBullets: [
      L(
        "Geproduceerd in Europa",
        "Produced in Europe",
        "Hergestellt in Europa",
        "Fabriqué en Europe"
      ),
      L(
        "Geverifieerde productinformatie",
        "Verified product information",
        "Verifizierte Produktinformationen",
        "Informations produit vérifiées"
      ),
      L(
        "Vergelijk meerdere aanbieders",
        "Compare multiple sellers",
        "Mehrere Anbieter vergleichen",
        "Comparer plusieurs vendeurs"
      ),
      L(
        "Veilig betalen",
        "Secure payments",
        "Sicher bezahlen",
        "Paiement sécurisé"
      ),
    ],
    captionTitle: L(
      "Verified™ · Made in Europe",
      "Verified™ · Made in Europe",
      "Verified™ · Made in Europe",
      "Verified™ · Made in Europe"
    ),
    captionBody: L(
      "Producenten én officiële retailers",
      "Producers and official retailers",
      "Produzenten und offizielle Händler",
      "Producteurs et détaillants officiels"
    ),
  },

  campaigns: [
    {
      id: "camp_back_to_school",
      slug: "back-to-school",
      visible: true,
      sortOrder: 10,
      title: L("Back to School", "Back to School", "Back to School", "Rentrée"),
      subtitle: L(
        "Europese schoolspullen, tassen en elektronica — klaar voor het nieuwe jaar.",
        "European school supplies, bags and electronics — ready for the new year.",
        "Europäische Schulartikel, Taschen und Elektronik — bereit für das neue Jahr.",
        "Fournitures scolaires, sacs et électronique européens — prêts pour la rentrée."
      ),
      ctaLabel: L("Shop nu", "Shop now", "Jetzt shoppen", "Acheter"),
      href: "/zoeken?q=school&collectie=back-to-school",
      image: null,
      imageAlt: L(
        "Back to School campagne",
        "Back to School campaign",
        "Back-to-School-Kampagne",
        "Campagne Rentrée"
      ),
      accentHue: 210,
    },
    {
      id: "camp_zomerdeals",
      slug: "zomerdeals",
      visible: true,
      sortOrder: 20,
      title: L("Zomerdeals", "Summer deals", "Sommerangebote", "Offres d’été"),
      subtitle: L(
        "Tuin, outdoor en keukenware met Europese herkomst — tijdelijke kortingen.",
        "Garden, outdoor and kitchenware with European origin — limited deals.",
        "Garten, Outdoor und Küche mit europäischer Herkunft — zeitlich begrenzt.",
        "Jardin, outdoor et cuisine d’origine européenne — offres limitées."
      ),
      ctaLabel: L("Shop nu", "Shop now", "Jetzt shoppen", "Acheter"),
      href: "/zoeken?q=zomer&collectie=zomerdeals",
      image: null,
      imageAlt: L("Zomerdeals campagne", "Summer deals campaign", "Sommer-Kampagne", "Campagne été"),
      accentHue: 42,
    },
    {
      id: "camp_black_friday",
      slug: "black-friday",
      visible: true,
      sortOrder: 30,
      title: L("Black Friday", "Black Friday", "Black Friday", "Black Friday"),
      subtitle: L(
        "De beste totale aanbiedingen van Europese makers — nooit gesponsorde Buy Box.",
        "The best total offers from European makers — never a sponsored Buy Box.",
        "Die besten Gesamtangebote europäischer Hersteller — nie gesponserte Buy Box.",
        "Les meilleures offres totales de fabricants européens — jamais de Buy Box sponsorisée."
      ),
      ctaLabel: L("Shop nu", "Shop now", "Jetzt shoppen", "Acheter"),
      href: "/zoeken?collectie=black-friday",
      image: null,
      imageAlt: L("Black Friday campagne", "Black Friday campaign", "Black-Friday-Kampagne", "Campagne Black Friday"),
      accentHue: 0,
    },
    {
      id: "camp_weekend",
      slug: "weekend-deals",
      visible: true,
      sortOrder: 40,
      title: L("Weekend Deals", "Weekend Deals", "Wochenend-Deals", "Offres week-end"),
      subtitle: L(
        "Elk weekend geselecteerde deals van producenten en officiële retailers.",
        "Selected weekend deals from producers and official retailers.",
        "Ausgewählte Wochenend-Deals von Produzenten und offiziellen Händlern.",
        "Offres week-end sélectionnées de producteurs et détaillants officiels."
      ),
      ctaLabel: L("Shop nu", "Shop now", "Jetzt shoppen", "Acheter"),
      href: "/zoeken?collectie=weekend-deals",
      image: null,
      imageAlt: L("Weekend Deals campagne", "Weekend Deals campaign", "Wochenend-Kampagne", "Campagne week-end"),
      accentHue: 160,
    },
    {
      id: "camp_kerst",
      slug: "kerstcadeaus",
      visible: true,
      sortOrder: 50,
      title: L("Kerstcadeaus", "Holiday gifts", "Weihnachtsgeschenke", "Cadeaux de Noël"),
      subtitle: L(
        "Duurzame cadeaus met Verified™ herkomst — voor elk budget en elke leeftijd.",
        "Sustainable gifts with Verified™ origin — for every budget and age.",
        "Nachhaltige Geschenke mit Verified™-Herkunft — für jedes Budget und Alter.",
        "Cadeaux durables avec origine Verified™ — pour tous les budgets et âges."
      ),
      ctaLabel: L("Shop nu", "Shop now", "Jetzt shoppen", "Acheter"),
      href: "/zoeken?q=cadeau&collectie=kerstcadeaus",
      image: null,
      imageAlt: L("Kerstcadeaus campagne", "Holiday gifts campaign", "Weihnachts-Kampagne", "Campagne Noël"),
      accentHue: 350,
    },
    {
      id: "camp_nieuwe_merken",
      slug: "nieuwe-europese-merken",
      visible: true,
      sortOrder: 60,
      title: L(
        "Nieuwe Europese merken",
        "New European brands",
        "Neue europäische Marken",
        "Nouvelles marques européennes"
      ),
      subtitle: L(
        "Ontdek recent aangesloten producenten en merken uit heel Europa.",
        "Discover recently joined producers and brands from across Europe.",
        "Entdecken Sie neu beigetretene Produzenten und Marken aus ganz Europa.",
        "Découvrez des producteurs et marques récemment rejoints partout en Europe."
      ),
      ctaLabel: L("Shop nu", "Shop now", "Jetzt shoppen", "Acheter"),
      href: "/zoeken?collectie=nieuwe-merken",
      image: null,
      imageAlt: L(
        "Nieuwe Europese merken campagne",
        "New European brands campaign",
        "Neue-Marken-Kampagne",
        "Campagne nouvelles marques"
      ),
      accentHue: 280,
    },
  ],

  banners: [
    {
      id: "ban_01",
      position: 1,
      location: "homepage",
      visible: true,
      sortOrder: 10,
      publishAt: "2025-01-01T00:00:00.000Z",
      expiresAt: null,
      activeFrom: "2025-01-01T00:00:00.000Z",
      activeTo: null,
      title: L(
        "Europese tuin, rechtstreeks van de makers",
        "European garden, straight from the makers",
        "Europäischer Garten, direkt vom Hersteller",
        "Jardin européen, directement des fabricants"
      ),
      subtitle: L(
        "Vergelijk Verified™ aanbieders en kies de beste totale deal — nooit gesponsord.",
        "Compare Verified™ sellers and choose the best total deal — never sponsored.",
        "Vergleichen Sie Verified™-Anbieter und wählen Sie das beste Gesamtangebot — nie gesponsert.",
        "Comparez les vendeurs Verified™ et choisissez la meilleure offre totale — jamais sponsorisé."
      ),
      ctaLabel: L("Ontdek tuin", "Explore garden", "Garten entdecken", "Découvrir le jardin"),
      destinationUrl: "/categorie/tuin",
      linkType: "category",
      image: null,
      imageAlt: L(
        "Advertentie: Europese tuinproducten",
        "Ad: European garden products",
        "Anzeige: Europäische Gartenprodukte",
        "Pub: produits de jardin européens"
      ),
      background:
        "linear-gradient(135deg, #f4f7f2 0%, #e6efe4 45%, #d8e8d6 100%)",
      logo: manufacturerLogoSrc("verdetech"),
    },
    {
      id: "ban_02",
      position: 2,
      location: "homepage",
      visible: true,
      sortOrder: 20,
      publishAt: "2025-01-01T00:00:00.000Z",
      expiresAt: null,
      activeFrom: "2025-01-01T00:00:00.000Z",
      activeTo: null,
      title: L(
        "Partner spotlight: VerdeTech",
        "Partner spotlight: VerdeTech",
        "Partner-Spotlight: VerdeTech",
        "Coup de projecteur: VerdeTech"
      ),
      subtitle: L(
        "EU Verified assortiment van een Nederlandse producent — ontdek hun collectie.",
        "EU Verified assortment from a Dutch producer — explore their collection.",
        "EU-Verified-Sortiment eines niederländischen Produzenten — entdecken Sie die Kollektion.",
        "Assortiment EU Verified d’un producteur néerlandais — découvrez leur collection."
      ),
      ctaLabel: L("Bekijk partner", "View partner", "Partner ansehen", "Voir le partenaire"),
      destinationUrl: "/merk/verdetech",
      linkType: "partner",
      image: null,
      imageAlt: L(
        "Advertentie: Partner VerdeTech",
        "Ad: Partner VerdeTech",
        "Anzeige: Partner VerdeTech",
        "Pub: partenaire VerdeTech"
      ),
      background:
        "linear-gradient(135deg, #f3f6fb 0%, #e4ebf6 45%, #d4e0f0 100%)",
      logo: manufacturerLogoSrc("verdetech"),
    },
  ],

  sections: [
    {
      id: "sec_categories",
      key: "categories",
      visible: true,
      sortOrder: 10,
      title: L(
        "Populaire categorieën",
        "Popular categories",
        "Beliebte Kategorien",
        "Catégories populaires"
      ),
      subtitle: L("", "", "", ""),
      image: null,
    },
    {
      id: "sec_campaigns",
      key: "campaigns",
      visible: true,
      sortOrder: 20,
      title: L("Acties & thema’s", "Deals & themes", "Aktionen & Themen", "Promos & thèmes"),
      subtitle: L("", "", "", ""),
      image: null,
    },
    {
      id: "sec_featured",
      key: "featured",
      visible: true,
      sortOrder: 30,
      title: L(
        "Uitgelicht deze week",
        "Featured this week",
        "Diese Woche hervorgehoben",
        "À la une cette semaine"
      ),
      subtitle: L(
        "Best beoordeeld en meest gekozen — nooit gesponsord.",
        "Top rated and most chosen — never sponsored.",
        "Am besten bewertet und am häufigsten gewählt — nie gesponsert.",
        "Mieux notés et les plus choisis — jamais sponsorisé."
      ),
      image: null,
    },
    {
      id: "sec_partners",
      key: "partners",
      visible: true,
      sortOrder: 40,
      title: L(
        "Populaire Europese merken",
        "Popular European brands",
        "Beliebte europäische Marken",
        "Marques européennes populaires"
      ),
      subtitle: L(
        "Ontdek makers en merken met geverifieerde herkomst.",
        "Discover makers and brands with verified origin.",
        "Entdecken Sie Hersteller und Marken mit verifizierter Herkunft.",
        "Découvrez des fabricants et marques d’origine vérifiée."
      ),
      image: null,
    },
    {
      id: "sec_why",
      key: "why",
      visible: true,
      sortOrder: 50,
      title: L(
        "Waarom kiezen voor EuropMade?",
        "Why choose EuropMade?",
        "Warum EuropMade?",
        "Pourquoi EuropMade ?"
      ),
      subtitle: L(
        "Een rustige marketplace met focus op herkomst, makers en eerlijke keuze.",
        "A calm marketplace focused on origin, makers and fair choice.",
        "Ein ruhiger Marktplatz mit Fokus auf Herkunft, Hersteller und faire Wahl.",
        "Une marketplace calme axée sur l’origine, les fabricants et un choix équitable."
      ),
      image: null,
    },
    {
      id: "sec_newest",
      key: "newest",
      visible: true,
      sortOrder: 60,
      title: L("Nieuw binnen", "New arrivals", "Neu eingetroffen", "Nouveautés"),
      subtitle: L(
        "Recent toegevoegd aan de EuropMade marketplace.",
        "Recently added to the EuropMade marketplace.",
        "Kürzlich zum EuropMade-Marktplatz hinzugefügt.",
        "Récemment ajoutés à la marketplace EuropMade."
      ),
      image: null,
    },
    {
      id: "sec_best",
      key: "best_sellers",
      visible: true,
      sortOrder: 70,
      title: L("Best verkocht", "Best sellers", "Bestseller", "Meilleures ventes"),
      subtitle: L(
        "Populair bij klanten op basis van aanbieders en beoordelingen.",
        "Popular with customers based on sellers and reviews.",
        "Beliebt bei Kunden anhand von Anbietern und Bewertungen.",
        "Populaire auprès des clients selon vendeurs et avis."
      ),
      image: null,
    },
    {
      id: "sec_newsletter",
      key: "newsletter",
      visible: true,
      sortOrder: 80,
      title: L("Blijf op de hoogte", "Stay in the loop", "Bleiben Sie informiert", "Restez informé"),
      subtitle: L(
        "Nieuwe Europese merken en producten, direct in je inbox.",
        "New European brands and products, straight to your inbox.",
        "Neue europäische Marken und Produkte direkt in Ihren Posteingang.",
        "Nouvelles marques et produits européens, directement dans votre boîte mail."
      ),
      image: null,
    },
  ],

  categories: [
    {
      id: "cat_tuin",
      slug: "tuin",
      visible: true,
      sortOrder: 10,
      title: L("Tuin", "Garden", "Garten", "Jardin"),
      subtitle: L("", "", "", ""),
      image: null,
      productCountHint: 128,
    },
    {
      id: "cat_elektronica",
      slug: "elektronica",
      visible: true,
      sortOrder: 20,
      title: L("Elektronica", "Electronics", "Elektronik", "Électronique"),
      image: null,
      productCountHint: 96,
    },
    {
      id: "cat_mode",
      slug: "mode",
      visible: true,
      sortOrder: 30,
      title: L("Mode", "Fashion", "Mode", "Mode"),
      image: null,
      productCountHint: 84,
    },
    {
      id: "cat_wonen",
      slug: "wonen",
      visible: true,
      sortOrder: 40,
      title: L("Wonen", "Home", "Wohnen", "Maison"),
      image: null,
      productCountHint: 112,
    },
    {
      id: "cat_sport",
      slug: "sport",
      visible: true,
      sortOrder: 50,
      title: L("Sport", "Sports", "Sport", "Sport"),
      image: null,
      productCountHint: 64,
    },
    {
      id: "cat_voeding",
      slug: "voeding",
      visible: true,
      sortOrder: 60,
      title: L("Voeding", "Food", "Lebensmittel", "Alimentation"),
      image: null,
      productCountHint: 72,
    },
  ],

  whyItems: [
    {
      id: "why_1",
      visible: true,
      sortOrder: 10,
      title: L(
        "Alleen Europese productie",
        "European production only",
        "Nur europäische Produktion",
        "Production européenne uniquement"
      ),
      subtitle: L(
        "Geen verborgen import — herkomst is altijd zichtbaar.",
        "No hidden imports — origin is always visible.",
        "Kein versteckter Import — Herkunft ist immer sichtbar.",
        "Pas d’import caché — l’origine est toujours visible."
      ),
      image: null,
    },
    {
      id: "why_2",
      visible: true,
      sortOrder: 20,
      title: L(
        "Officiële producenten",
        "Official producers",
        "Offizielle Produzenten",
        "Producteurs officiels"
      ),
      subtitle: L(
        "Koop bij geverifieerde makers en merken.",
        "Shop verified makers and brands.",
        "Kaufen Sie bei verifizierten Herstellern und Marken.",
        "Achetez auprès de fabricants et marques vérifiés."
      ),
      image: null,
    },
    {
      id: "why_3",
      visible: true,
      sortOrder: 30,
      title: L(
        "Meerdere aanbieders vergelijken",
        "Compare multiple sellers",
        "Mehrere Anbieter vergleichen",
        "Comparer plusieurs vendeurs"
      ),
      subtitle: L(
        "Kies de beste totale aanbieding voor jou.",
        "Choose the best total offer for you.",
        "Wählen Sie das beste Gesamtangebot für sich.",
        "Choisissez la meilleure offre totale pour vous."
      ),
      image: null,
    },
    {
      id: "why_4",
      visible: true,
      sortOrder: 40,
      title: L(
        "Transparantie over herkomst",
        "Origin transparency",
        "Transparenz über die Herkunft",
        "Transparence sur l’origine"
      ),
      subtitle: L(
        "Duidelijke productinformatie, Verified™ waar van toepassing.",
        "Clear product information, Verified™ where applicable.",
        "Klare Produktinformationen, Verified™ wo zutreffend.",
        "Informations produit claires, Verified™ le cas échéant."
      ),
      image: null,
    },
  ],

  newsletter: {
    id: "newsletter_main",
    visible: true,
    sortOrder: 0,
    title: L("Blijf op de hoogte", "Stay in the loop", "Bleiben Sie informiert", "Restez informé"),
    subtitle: L(
      "Nieuwe Europese merken en producten, direct in je inbox.",
      "New European brands and products, straight to your inbox.",
      "Neue europäische Marken und Produkte direkt in Ihren Posteingang.",
      "Nouvelles marques et produits européens, directement dans votre boîte mail."
    ),
    image: null,
    placeholder: L(
      "naam@voorbeeld.nl",
      "name@example.com",
      "name@beispiel.de",
      "nom@exemple.fr"
    ),
    submitLabel: L("Aanmelden", "Subscribe", "Anmelden", "S’inscrire"),
    invalidEmail: L(
      "Vul een geldig e-mailadres in.",
      "Enter a valid email address.",
      "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
      "Saisissez une adresse e-mail valide."
    ),
    successMessage: L(
      "Bedankt — nieuwsbrief-inschrijving volgt zodra de notificatieservice live is.",
      "Thanks — newsletter signup will go live with the notification service.",
      "Danke — die Newsletter-Anmeldung folgt, sobald der Benachrichtigungsdienst live ist.",
      "Merci — l’inscription à la newsletter arrivera avec le service de notification."
    ),
  },

  partnerSpotlight: [
    {
      id: "ps_verdetech",
      slug: "verdetech",
      visible: true,
      sortOrder: 10,
      title: L("VerdeTech", "VerdeTech", "VerdeTech", "VerdeTech"),
      subtitle: L(
        "Producent van tuingereedschap, actief sinds 2015.",
        "Garden tools producer, active since 2015.",
        "Produzent von Gartengeräten, aktiv seit 2015.",
        "Producteur d’outils de jardin, actif depuis 2015."
      ),
      image: null,
      country: L("Nederland", "Netherlands", "Niederlande", "Pays-Bas"),
      rating: 4.6,
      productCount: 24,
    },
    {
      id: "ps_atelier",
      slug: "atelier-rossi",
      visible: true,
      sortOrder: 20,
      title: L("Atelier Rossi", "Atelier Rossi", "Atelier Rossi", "Atelier Rossi"),
      subtitle: L(
        "Keramiek en keukenwaar, familiebedrijf sinds 1962.",
        "Ceramics and kitchenware, family business since 1962.",
        "Keramik und Küchenwaren, Familienbetrieb seit 1962.",
        "Céramique et arts de la table, entreprise familiale depuis 1962."
      ),
      image: null,
      country: L("Italië", "Italy", "Italien", "Italie"),
      rating: 4.8,
      productCount: 18,
    },
    {
      id: "ps_wolf",
      slug: "wolfabriek-b",
      visible: true,
      sortOrder: 30,
      title: L("Wolfabriek B.", "Wolfabriek B.", "Wolfabriek B.", "Wolfabriek B."),
      subtitle: L(
        "Wollen producten, ambachtelijk vervaardigd.",
        "Wool products, craft-made.",
        "Wollprodukte, handwerklich gefertigt.",
        "Produits en laine, fabriqués artisanalement."
      ),
      image: null,
      country: L("België", "Belgium", "Belgien", "Belgique"),
      rating: 4.5,
      productCount: 15,
    },
  ],
}
