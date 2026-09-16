/**
 * Seed documents for fixed CMS pages — sourced from existing storefront
 * fallbacks (i18n / legal DOCS). Never invent new marketing copy.
 *
 * Used when creating stubs or hydrating empty/generic concept pages in the studio.
 */

import type { LocalizedCms } from "./cms-admin-api"
import { emptyLocalized } from "./cms-admin-api"
import {
  cmsSectionHasMeaningfulContent,
  type CmsPageDocument,
  type PageSectionKey,
} from "./cms-page-document"

function L(nl: string, en: string, de: string, fr: string): LocalizedCms {
  return { nl, en, de, fr }
}

function paragraphsHtml(parts: LocalizedCms[]): LocalizedCms {
  const out = emptyLocalized()
  for (const lang of ["nl", "en", "de", "fr"] as const) {
    out[lang] = parts
      .map((p) => p[lang].trim())
      .filter(Boolean)
      .map((t) => `<p>${escapeText(t)}</p>`)
      .join("")
  }
  return out
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function section(
  id: string,
  key: PageSectionKey,
  title: LocalizedCms,
  body: LocalizedCms,
  sortOrder: number
) {
  return {
    id,
    key,
    visible: true,
    sortOrder,
    title,
    body,
    image: null as string | null,
    href: "",
    ctaLabel: emptyLocalized(),
    bannerId: null as string | null,
    items: [],
    ctas: [],
    stages: [],
  }
}

function pageDoc(
  heroTitle: LocalizedCms,
  body: LocalizedCms,
  extra: ReturnType<typeof section>[] = []
): CmsPageDocument {
  return {
    sections: [
      section("pg_hero", "hero", heroTitle, emptyLocalized(), 0),
      section("pg_text", "text", emptyLocalized(), body, 10),
      ...extra,
    ],
  }
}

/** True when document has no meaningful body/items (empty stub). */
export function isCmsPageDocumentEmpty(document: unknown): boolean {
  if (!document || typeof document !== "object") return true
  const sections = (document as { sections?: unknown }).sections
  if (!Array.isArray(sections) || sections.length === 0) return true
  for (const raw of sections) {
    const s = (raw ?? {}) as Record<string, unknown>
    // Prefer typed helper when shape matches
    try {
      if (
        cmsSectionHasMeaningfulContent({
          id: typeof s.id === "string" ? s.id : "x",
          key: (typeof s.key === "string" ? s.key : "text") as PageSectionKey,
          visible: s.visible !== false,
          sortOrder: Number(s.sortOrder ?? 0) || 0,
          title: (s.title as LocalizedCms) ?? emptyLocalized(),
          body: (s.body as LocalizedCms) ?? emptyLocalized(),
          items: Array.isArray(s.items) ? (s.items as never[]) : [],
          ctas: Array.isArray(s.ctas) ? (s.ctas as never[]) : [],
          stages: Array.isArray(s.stages) ? (s.stages as never[]) : [],
          totalScore: typeof s.totalScore === "string" ? s.totalScore : "",
          maxScore: typeof s.maxScore === "string" ? s.maxScore : "",
          leftLabel: (s.leftLabel as LocalizedCms) ?? emptyLocalized(),
          rightLabel: (s.rightLabel as LocalizedCms) ?? emptyLocalized(),
          offerValue: (s.offerValue as LocalizedCms) ?? emptyLocalized(),
          note: (s.note as LocalizedCms) ?? emptyLocalized(),
          eyebrow: (s.eyebrow as LocalizedCms) ?? emptyLocalized(),
          image: typeof s.image === "string" ? s.image : null,
          href: typeof s.href === "string" ? s.href : "",
          ctaLabel: (s.ctaLabel as LocalizedCms) ?? emptyLocalized(),
        })
      ) {
        return false
      }
    } catch {
      const body = s.body
      if (body && typeof body === "object") {
        const b = body as Record<string, unknown>
        for (const lang of ["nl", "en", "de", "fr"]) {
          if (
            typeof b[lang] === "string" &&
            b[lang].replace(/<[^>]+>/g, "").trim()
          ) {
            return false
          }
        }
      }
    }
  }
  return true
}

const STRUCTURED_MARKERS: Record<string, PageSectionKey[]> = {
  "made-in-europe": ["score_breakdown", "threshold"],
  "waarom-kopen": ["steps", "cards"],
  "waarom-verkopen": ["funnel", "faq", "offer_band"],
}

/**
 * Generic Fase-2A stub: short hero+text without the structured section types
 * that represent the real storefront page. Safe to re-hydrate from seed.
 */
export function isGenericFixedPageStub(
  slug: string,
  document: unknown
): boolean {
  const key = slug.trim().toLowerCase()
  const markers = STRUCTURED_MARKERS[key]
  if (!markers) return isCmsPageDocumentEmpty(document)
  if (!document || typeof document !== "object") return true
  const sections = (document as { sections?: unknown }).sections
  if (!Array.isArray(sections) || sections.length === 0) return true
  const keys = new Set(
    sections.map((raw) => {
      const s = (raw ?? {}) as Record<string, unknown>
      return typeof s.key === "string" ? s.key : ""
    })
  )
  return !markers.every((m) => keys.has(m))
}


const ABOUT_TITLE = L(
  "Over EuropMade",
  "About EuropMade",
  "Über EuropMade",
  "À propos d’EuropMade"
)
const ABOUT_BODY = paragraphsHtml([
  L(
    "EuropMade is het marketplace-platform voor producten die daadwerkelijk in Europa zijn geproduceerd. Wij verkopen zelf geen producten: onafhankelijke retailers en producenten bieden hun aanbod aan, en jij koopt rechtstreeks bij hen.",
    "EuropMade is the marketplace platform for products that are actually produced in Europe. We do not sell products ourselves: independent retailers and producers list their offers, and you buy directly from them.",
    "EuropMade ist die Marketplace-Plattform für Produkte, die tatsächlich in Europa hergestellt werden. Wir verkaufen selbst keine Produkte: unabhängige Händler und Produzenten bieten an, und Sie kaufen direkt bei ihnen.",
    "EuropMade est la marketplace des produits réellement fabriqués en Europe. Nous ne vendons pas nous-mêmes : des détaillants et producteurs indépendants proposent leurs offres, et vous achetez directement auprès d’eux."
  ),
  L(
    "Elke productpagina bevat gecontroleerde informatie over herkomst, producent en materiaal. De Buy Box selecteert automatisch de beste totale aanbieding voor jou — nooit op basis van advertenties of commissies.",
    "Every product page includes verified information about origin, producer and materials. The Buy Box automatically selects the best overall offer for you — never based on ads or commissions.",
    "Jede Produktseite enthält geprüfte Informationen zu Herkunft, Produzent und Material. Die Buy Box wählt automatisch das beste Gesamtangebot — nie auf Basis von Anzeigen oder Provisionen.",
    "Chaque page produit contient des informations vérifiées sur l’origine, le producteur et les matériaux. La Buy Box sélectionne automatiquement la meilleure offre globale — jamais sur la base de publicités ou de commissions."
  ),
  L(
    "Ons doel: het meest transparante, betrouwbare en eerlijke marketplace-platform van Europa.",
    "Our goal: Europe’s most transparent, reliable and fair marketplace platform.",
    "Unser Ziel: Europas transparenteste, zuverlässigste und fairste Marketplace-Plattform.",
    "Notre objectif : la marketplace la plus transparente, fiable et équitable d’Europe."
  ),
])

const SUPPORT_TITLE = L(
  "Klantenservice",
  "Customer service",
  "Kundenservice",
  "Service client"
)
const SUPPORT_BODY = paragraphsHtml([
  L(
    "Heb je een vraag over een bestelling, retour of je account? Gebruik de onderstaande routes — zo helpen we je sneller.",
    "Have a question about an order, return or your account? Use the routes below — that helps us assist you faster.",
    "Haben Sie eine Frage zu einer Bestellung, Retoure oder Ihrem Konto? Nutzen Sie die unten stehenden Wege — so helfen wir Ihnen schneller.",
    "Une question sur une commande, un retour ou votre compte ? Utilisez les liens ci-dessous — nous pourrons vous aider plus rapidement."
  ),
  L(
    "Bestellen: Mijn bestellingen — status, tracking en berichten met de verkoper.",
    "Ordering: My orders — status, tracking and messages with the seller.",
    "Bestellen: Meine Bestellungen — Status, Sendungsverfolgung und Nachrichten mit dem Verkäufer.",
    "Commander : Mes commandes — statut, suivi et messages avec le vendeur."
  ),
  L(
    "Verzenden: zie /juridisch/verzending. Retour: Mijn retouren of /juridisch/retourneren.",
    "Shipping: see /juridisch/verzending. Returns: My returns or /juridisch/retourneren.",
    "Versand: siehe /juridisch/verzending. Retoure: Meine Retouren oder /juridisch/retourneren.",
    "Livraison : voir /juridisch/verzending. Retours : Mes retours ou /juridisch/retourneren."
  ),
  L(
    "Voor productspecifieke vragen is de verkoper je eerste aanspreekpunt via de berichtenfunctie bij je bestelling.",
    "For product-specific questions, the seller is your first contact via the messaging feature on your order.",
    "Bei produktspezifischen Fragen ist der Verkäufer Ihr erster Ansprechpartner über die Nachrichtenfunktion bei Ihrer Bestellung.",
    "Pour les questions spécifiques au produit, le vendeur est votre premier contact via la messagerie de votre commande."
  ),
])

const CAREERS_TITLE = L(
  "Werken bij EuropMade",
  "Careers at EuropMade",
  "Karriere bei EuropMade",
  "Carrières chez EuropMade"
)
const CAREERS_BODY = paragraphsHtml([
  L(
    "Deze pagina is in voorbereiding.",
    "This page is being prepared.",
    "Diese Seite wird vorbereitet.",
    "Cette page est en préparation."
  ),
])

const VERIFIED_TITLE = L("Verified™", "Verified™", "Verified™", "Verified™")
const VERIFIED_BODY = paragraphsHtml([
  L(
    "Verified™ betekent dat herkomst- en productinformatie is gecontroleerd volgens de EuropMade-regels: productie in Europa, traceerbare producentgegevens en geen misleidende claims.",
    "Verified™ means origin and product information has been checked under EuropMade rules: production in Europe, traceable producer data and no misleading claims.",
    "Verified™ bedeutet, dass Herkunfts- und Produktinformationen nach EuropMade-Regeln geprüft wurden: Produktion in Europa, nachvollziehbare Produzentendaten und keine irreführenden Angaben.",
    "Verified™ signifie que les informations d’origine et produit ont été vérifiées selon les règles EuropMade : production en Europe, données producteur traçables et aucune allégation trompeuse."
  ),
  L(
    "Verified™ zegt iets over de productinformatie — niet over welke aanbieder de Buy Box wint.",
    "Verified™ is about product information — not about which seller wins the Buy Box.",
    "Verified™ betrifft die Produktinformationen — nicht, welcher Anbieter die Buy Box gewinnt.",
    "Verified™ concerne les informations produit — pas le vendeur qui gagne la Buy Box."
  ),
  L(
    "Voor de Made in Europe-beoordelingsscore zie /made-in-europe.",
    "For the Made in Europe scoring see /made-in-europe.",
    "Zur Made-in-Europe-Bewertung siehe /made-in-europe.",
    "Pour le score Made in Europe, voir /made-in-europe."
  ),
])

const DUURZAAM_TITLE = L(
  "Duurzame producten",
  "Sustainable products",
  "Nachhaltige Produkte",
  "Produits durables"
)
const DUURZAAM_BODY = paragraphsHtml([
  L(
    "EuropMade toont uitsluitend producten die in Europa zijn geproduceerd. Daarmee verkorten we onnodige importketens en maken we herkomst inzichtelijk.",
    "EuropMade only shows products produced in Europe. That shortens unnecessary import chains and makes origin transparent.",
    "EuropMade zeigt ausschließlich in Europa hergestellte Produkte. So verkürzen wir unnötige Importketten und machen Herkunft nachvollziehbar.",
    "EuropMade n’affiche que des produits fabriqués en Europe. Cela raccourcit les chaînes d’import inutiles et rend l’origine transparente."
  ),
  L(
    "Duurzaamheidskenmerken (materialen, certificeringen) verschijnen op de productpagina wanneer de producent die heeft aangeleverd en gecontroleerd.",
    "Sustainability attributes (materials, certifications) appear on the product page when the producer has supplied and verified them.",
    "Nachhaltigkeitsmerkmale (Materialien, Zertifizierungen) erscheinen auf der Produktseite, wenn der Produzent sie geliefert und geprüft hat.",
    "Les attributs de durabilité (matériaux, certifications) apparaissent sur la page produit lorsque le producteur les a fournis et vérifiés."
  ),
])

const AFF_TITLE = L(
  "Affiliateprogramma",
  "Affiliate programme",
  "Affiliate-Programm",
  "Programme d’affiliation"
)
const AFF_BODY = paragraphsHtml([
  L(
    "Verdien commissie door EuropMade-producten te delen. Registratie, tracking en uitbetaling verlopen via het affiliate-dashboard.",
    "Earn commission by sharing EuropMade products. Registration, tracking and payouts run via the affiliate dashboard.",
    "Verdienen Sie Provision, indem Sie EuropMade-Produkte teilen. Registrierung, Tracking und Auszahlung laufen über das Affiliate-Dashboard.",
    "Gagnez une commission en partageant les produits EuropMade. Inscription, suivi et paiements via le tableau de bord affilié."
  ),
])

type LegalSeed = { slug: string; title: LocalizedCms; paragraphs: LocalizedCms[] }

const LEGAL: LegalSeed[] = [
  {
    slug: "algemene-voorwaarden",
    title: L(
      "Algemene voorwaarden",
      "Terms and conditions",
      "Allgemeine Geschäftsbedingungen",
      "Conditions générales"
    ),
    paragraphs: [
      L(
        "Deze voorwaarden gelden voor het gebruik van het EuropMade-platform. Door een account aan te maken of een bestelling te plaatsen, ga je akkoord met deze voorwaarden.",
        "These terms apply to the use of the EuropMade platform. By creating an account or placing an order, you agree to these terms.",
        "Diese Bedingungen gelten für die Nutzung der EuropMade-Plattform. Mit der Erstellung eines Kontos oder einer Bestellung stimmen Sie diesen Bedingungen zu.",
        "Ces conditions s’appliquent à l’utilisation de la plateforme EuropMade. En créant un compte ou en passant une commande, vous acceptez ces conditions."
      ),
      L(
        "EuropMade is geen verkoper van de getoonde producten. De koopovereenkomst komt tot stand tussen koper en de betreffende retailer/producent.",
        "EuropMade is not a seller of the products shown. The purchase agreement is concluded between the buyer and the relevant retailer/producer.",
        "EuropMade ist kein Verkäufer der angezeigten Produkte. Der Kaufvertrag kommt zwischen Käufer und dem jeweiligen Händler/Produzenten zustande.",
        "EuropMade n’est pas vendeur des produits affichés. Le contrat de vente est conclu entre l’acheteur et le détaillant/producteur concerné."
      ),
      L(
        "Misbruik van het platform, fraude of schending van wet- en regelgeving kan leiden tot opschorting of beëindiging van toegang.",
        "Misuse of the platform, fraud or breach of laws and regulations may lead to suspension or termination of access.",
        "Missbrauch der Plattform, Betrug oder Verstöße gegen Gesetze und Vorschriften können zur Aussetzung oder Beendigung des Zugangs führen.",
        "L’abus de la plateforme, la fraude ou le non-respect des lois et règlements peuvent entraîner la suspension ou la résiliation de l’accès."
      ),
    ],
  },
  {
    slug: "verzending",
    title: L("Verzending", "Shipping", "Versand", "Livraison"),
    paragraphs: [
      L(
        "Verzendkosten, levertijden en vervoerders worden per aanbieding door de verkoper bepaald en getoond in de Buy Box en bij checkout.",
        "Shipping costs, delivery times and carriers are set by the seller per offer and shown in the Buy Box and at checkout.",
        "Versandkosten, Lieferzeiten und Transporteure werden je Angebot vom Verkäufer festgelegt und in der Buy Box sowie beim Checkout angezeigt.",
        "Les frais d’expédition, délais et transporteurs sont définis par le vendeur par offre et affichés dans la Buy Box et au paiement."
      ),
      L(
        "Bij bestellingen met meerdere verkopers kan de levering in deelzendingen plaatsvinden.",
        "For orders with multiple sellers, delivery may take place in partial shipments.",
        "Bei Bestellungen mit mehreren Verkäufern kann die Lieferung in Teilsendungen erfolgen.",
        "Pour les commandes auprès de plusieurs vendeurs, la livraison peut avoir lieu en envois partiels."
      ),
      L(
        "Eventuele vertragingen of beschadigingen meld je via de berichtenfunctie bij je bestelling.",
        "Report any delays or damage via the messaging feature on your order.",
        "Verzögerungen oder Beschädigungen melden Sie über die Nachrichtenfunktion bei Ihrer Bestellung.",
        "Signalez tout retard ou dommage via la messagerie de votre commande."
      ),
    ],
  },
  {
    slug: "retourneren",
    title: L("Retourneren", "Returns", "Retouren", "Retours"),
    paragraphs: [
      L(
        "Je hebt in beginsel 14 of 30 dagen herroepingsrecht, afhankelijk van de voorwaarden van de gekozen verkoper (zichtbaar op de productpagina).",
        "You generally have a 14- or 30-day right of withdrawal, depending on the terms of the chosen seller (shown on the product page).",
        "Sie haben grundsätzlich ein Widerrufsrecht von 14 oder 30 Tagen, abhängig von den Bedingungen des gewählten Verkäufers (sichtbar auf der Produktseite).",
        "Vous disposez en principe d’un droit de rétractation de 14 ou 30 jours, selon les conditions du vendeur choisi (visibles sur la page produit)."
      ),
      L(
        "Retouraanvragen dien je in via Mijn EuropMade → Retouren. De verkoper bevestigt de retourinstructies.",
        "Submit return requests via My EuropMade → Returns. The seller confirms the return instructions.",
        "Retouranfragen reichen Sie über Mein EuropMade → Retouren ein. Der Verkäufer bestätigt die Retouranweisungen.",
        "Soumettez les demandes de retour via Mon EuropMade → Retours. Le vendeur confirme les instructions de retour."
      ),
      L(
        "Producten die hygiënisch verzegeld of gepersonaliseerd zijn, kunnen van retourrecht zijn uitgesloten — dit staat vermeld bij de aanbieding.",
        "Products that are sealed for hygiene or personalised may be excluded from return rights — this is stated with the offer.",
        "Hygieneversiegelte oder personalisierte Produkte können vom Rückgaberecht ausgeschlossen sein — dies steht beim Angebot.",
        "Les produits scellés pour des raisons d’hygiène ou personnalisés peuvent être exclus du droit de retour — cela est indiqué sur l’offre."
      ),
    ],
  },
  {
    slug: "privacybeleid",
    title: L("Privacybeleid", "Privacy policy", "Datenschutz", "Politique de confidentialité"),
    paragraphs: [
      L(
        "We verwerken persoonsgegevens om je account, bestellingen, klantenservice en — met toestemming — affiliate-tracking te laten werken.",
        "We process personal data to operate your account, orders, customer service and — with consent — affiliate tracking.",
        "Wir verarbeiten personenbezogene Daten, um Ihr Konto, Bestellungen, Kundenservice und — mit Einwilligung — Affiliate-Tracking zu betreiben.",
        "Nous traitons des données personnelles pour faire fonctionner votre compte, commandes, service client et — avec consentement — le suivi d’affiliation."
      ),
      L(
        "Noodzakelijke cookies zijn altijd actief. Overige cookies (zoals affiliate-tracking) alleen na jouw toestemming. Beheer dit via Cookievoorkeuren.",
        "Necessary cookies are always active. Other cookies (such as affiliate tracking) only after your consent. Manage this via Cookie preferences.",
        "Erforderliche Cookies sind immer aktiv. Weitere Cookies (z. B. Affiliate-Tracking) nur nach Ihrer Einwilligung. Verwalten Sie dies unter Cookie-Einstellungen.",
        "Les cookies nécessaires sont toujours actifs. Les autres cookies (comme le suivi d’affiliation) uniquement après votre consentement. Gérez-les via Préférences de cookies."
      ),
      L(
        "Je kunt inzage, correctie of verwijdering verzoeken via de AVG-routes in je account of via contact.",
        "You can request access, correction or deletion via the GDPR routes in your account or via contact.",
        "Sie können Auskunft, Berichtigung oder Löschung über die DSGVO-Wege in Ihrem Konto oder über Kontakt verlangen.",
        "Vous pouvez demander l’accès, la rectification ou la suppression via les voies RGPD de votre compte ou via le contact."
      ),
    ],
  },
  {
    slug: "contact",
    title: L("Contact", "Contact", "Kontakt", "Contact"),
    paragraphs: [
      L(
        "Voor ordergerelateerde vragen: gebruik eerst Berichten bij je bestelling (direct naar de verkoper).",
        "For order-related questions: first use Messages on your order (directly to the seller).",
        "Für bestellbezogene Fragen: nutzen Sie zuerst Nachrichten bei Ihrer Bestellung (direkt an den Verkäufer).",
        "Pour les questions liées à une commande : utilisez d’abord Messages sur votre commande (directement au vendeur)."
      ),
      L(
        "Voor platformvragen: via Klantenservice of e-mail info@europmade.eu (reactietijd doorgaans binnen 2 werkdagen).",
        "For platform questions: via Customer service or email info@europmade.eu (response time usually within 2 working days).",
        "Für Plattformfragen: über Kundenservice oder E-Mail info@europmade.eu (Antwortzeit in der Regel innerhalb von 2 Werktagen).",
        "Pour les questions plateforme : via Service client ou e-mail info@europmade.eu (délai de réponse généralement sous 2 jours ouvrés)."
      ),
      L(
        "Postadres en KvK-gegevens worden aangevuld zodra de ondernemingsregistratie voor productie definitief is.",
        "Postal address and chamber of commerce details will be added once company registration for production is final.",
        "Postanschrift und Handelsregisterdaten werden ergänzt, sobald die Unternehmensregistrierung für die Produktion endgültig ist.",
        "L’adresse postale et les données d’immatriculation seront complétées une fois l’enregistrement de l’entreprise pour la production définitif."
      ),
    ],
  },
  {
    slug: "betaalmethoden",
    title: L("Betaalmethoden", "Payment methods", "Zahlungsmethoden", "Moyens de paiement"),
    paragraphs: [
      L(
        "Beschikbare betaalmethoden worden bij checkout getoond en kunnen per markt verschillen.",
        "Available payment methods are shown at checkout and may differ by market.",
        "Verfügbare Zahlungsmethoden werden beim Checkout angezeigt und können je Markt unterschiedlich sein.",
        "Les moyens de paiement disponibles s’affichent au paiement et peuvent varier selon le marché."
      ),
    ],
  },
  {
    slug: "disclaimer",
    title: L("Disclaimer", "Disclaimer", "Haftungsausschluss", "Avertissement"),
    paragraphs: [
      L(
        "Informatie op EuropMade wordt met zorg gepresenteerd. Productclaims blijven de verantwoordelijkheid van de verkoper/producent.",
        "Information on EuropMade is presented with care. Product claims remain the responsibility of the seller/producer.",
        "Informationen auf EuropMade werden sorgfältig dargestellt. Produktaussagen bleiben Verantwortung von Verkäufer/Produzent.",
        "Les informations sur EuropMade sont présentées avec soin. Les allégations produit restent la responsabilité du vendeur/producteur."
      ),
    ],
  },
  {
    slug: "copyright",
    title: L("Copyright", "Copyright", "Urheberrecht", "Droit d’auteur"),
    paragraphs: [
      L(
        "Teksten, merknaam, logo en vormgeving van EuropMade zijn beschermd. Niets mag zonder toestemming worden gekopieerd voor commercieel gebruik.",
        "Texts, brand name, logo and design of EuropMade are protected. Nothing may be copied for commercial use without permission.",
        "Texte, Markenname, Logo und Gestaltung von EuropMade sind geschützt. Nichts darf ohne Erlaubnis für kommerzielle Zwecke kopiert werden.",
        "Les textes, le nom de marque, le logo et le design d’EuropMade sont protégés. Rien ne peut être copié à des fins commerciales sans autorisation."
      ),
      L(
        "Productafbeeldingen en merkinhoud blijven eigendom van de betreffende rechthebbenden (producenten/retailers).",
        "Product images and brand content remain the property of the respective rights holders (producers/retailers).",
        "Produktbilder und Markeninhalte bleiben Eigentum der jeweiligen Rechteinhaber (Produzenten/Händler).",
        "Les images produit et contenus de marque restent la propriété des ayants droit (producteurs/détaillants)."
      ),
    ],
  },
  {
    slug: "garanties",
    title: L("Garanties", "Warranties", "Garantien", "Garanties"),
    paragraphs: [
      L(
        "Wettelijke garantie jegens de verkoper blijft van toepassing. Aanvullende producentgarantie staat vermeld op de productpagina.",
        "Statutory warranty towards the seller remains applicable. Additional manufacturer warranty is stated on the product page.",
        "Die gesetzliche Gewährleistung gegenüber dem Verkäufer bleibt bestehen. Zusätzliche Herstellergarantie steht auf der Produktseite.",
        "La garantie légale envers le vendeur reste applicable. Une garantie fabricant complémentaire est indiquée sur la page produit."
      ),
    ],
  },
  {
    slug: "terugbetalingsbeleid",
    title: L(
      "Terugbetalingsbeleid",
      "Refund policy",
      "Rückerstattungsrichtlinie",
      "Politique de remboursement"
    ),
    paragraphs: [
      L(
        "Na een goedgekeurde retour of geannuleerde bestelling volgt terugbetaling volgens de betaalmethode en de termijnen van de verkoper/PSP.",
        "After an approved return or cancelled order, refund follows according to the payment method and the timelines of the seller/PSP.",
        "Nach einer genehmigten Retoure oder stornierten Bestellung folgt die Rückerstattung gemäß Zahlungsmethode und Fristen von Verkäufer/PSP.",
        "Après un retour approuvé ou une commande annulée, le remboursement suit selon le moyen de paiement et les délais du vendeur/PSP."
      ),
    ],
  },
]



function seedMadeInEurope(): CmsPageDocument {
  return {
    sections: [
      {
        id: "mie_hero",
        key: "hero",
        visible: true,
        sortOrder: 0,
        title: L(
"Hoe bepaalt EuropMade Made in Europe?",
"How does EuropMade determine Made in Europe?",
"Wie bestimmt EuropMade Made in Europe?",
"Comment EuropMade détermine-t-il Made in Europe ?"
),
        body: L(
"<p>Transparante, vaste criteria — zodat je niet zelf hoeft te gissen of een ‘European brand’-claim klopt.</p>",
"<p>Transparent, fixed criteria — so you do not have to guess whether a “European brand” claim is real.</p>",
"<p>Transparente, feste Kriterien — damit Sie nicht raten müssen, ob eine „European brand“-Behauptung stimmt.</p>",
"<p>Des critères fixes et transparents — pour ne plus devoir deviner si une promesse de marque européenne est réelle.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        ctas: [],
        stages: [],
      },
      {
        id: "mie_score",
        key: "score_breakdown",
        visible: true,
        sortOrder: 10,
        title: L(
"Made in Europe-score",
"Made in Europe score",
"Made-in-Europe-Score",
"Score Made in Europe"
),
        body: L(
"<p>De EuropMade-score laat zien in hoeverre een product volgens vaste criteria in Europa wordt geproduceerd (assemblage, onderdelen, materialen). Dit is geen percentage van de verkoopprijs en geen exacte berekening van Europese grondstoffen.</p>",
"<p>The EuropMade score shows how far a product is produced in Europe by fixed criteria (assembly, parts, materials). It is not a share of the selling price and not an exact European raw-materials percentage.</p>",
"<p>Der EuropMade-Score zeigt, inwieweit ein Produkt nach festen Kriterien in Europa hergestellt wird (Montage, Teile, Materialien). Es ist kein Anteil am Verkaufspreis und keine exakte EU-Rohstoffquote.</p>",
"<p>Le score EuropMade indique dans quelle mesure un produit est fabriqué en Europe selon des critères fixes (assemblage, composants, matériaux). Ce n'est pas un pourcentage du prix de vente ni un calcul exact de matières premières européennes.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        totalScore: "100",
        maxScore: "100",
        maxScoreLabel: L(
"max. 100",
"max. 100",
"max. 100",
"max. 100"
),
        items: [
          {
            id: "mie_score_assembly",
            icon: "factory",
            title: L(
"Assemblage",
"Assembly",
"Montage",
"Assemblage"
),
            body: emptyLocalized(),
            href: "",
            value: L(
"75",
"75",
"75",
"75"
),
            detail: L(
"100% assemblage in EU",
"100% assembly in the EU",
"100 % Montage in der EU",
"100 % d'assemblage dans l'UE"
),
          },
          {
            id: "mie_score_parts",
            icon: "parts",
            title: L(
"Onderdelen",
"Parts",
"Teile",
"Composants"
),
            body: emptyLocalized(),
            href: "",
            value: L(
"15",
"15",
"15",
"15"
),
            detail: L(
"Overwegend EU",
"Predominantly EU",
"Überwiegend EU",
"Majoritairement UE"
),
          },
          {
            id: "mie_score_materials",
            icon: "materials",
            title: L(
"Materialen",
"Materials",
"Materialien",
"Matériaux"
),
            body: emptyLocalized(),
            href: "",
            value: L(
"10",
"10",
"10",
"10"
),
            detail: L(
"Overwegend EU",
"Predominantly EU",
"Überwiegend EU",
"Majoritairement UE"
),
          },
        ],
        ctas: [],
        stages: [],
      },
      {
        id: "mie_threshold",
        key: "threshold",
        visible: true,
        sortOrder: 20,
        title: L(
"Minimale toelatingsgrens: 50% substantiële assemblage in de EU",
"Minimum threshold: 50% substantial assembly in the EU",
"Mindestschwelle: 50 % wesentliche Montage in der EU",
"Seuil minimum : 50 % d'assemblage substantiel dans l'UE"
),
        body: emptyLocalized(),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        leftRange: L(
"0–49%",
"0–49%",
"0–49%",
"0–49%"
),
        leftLabel: L(
"Onder 50% — geen Made in Europe",
"Below 50% — not Made in Europe",
"Unter 50 % — kein Made in Europe",
"Moins de 50 % — pas Made in Europe"
),
        rightRange: L(
"50–100%",
"50–100%",
"50–100%",
"50–100%"
),
        rightLabel: L(
"50% of meer — kan Made in Europe zijn",
"50% or more — can be Made in Europe",
"50 % oder mehr — kann Made in Europe sein",
"50 % ou plus — peut être Made in Europe"
),
        boundaryPercent: 50,
        items: [],
        ctas: [],
        stages: [],
      },
      {
        id: "mie_not_count",
        key: "cards",
        visible: true,
        sortOrder: 30,
        title: L(
"Dit telt niet als substantiële assemblage",
"This does not count as substantial assembly",
"Das zählt nicht als wesentliche Montage",
"Ceci ne compte pas comme assemblage substantiel"
),
        body: L(
"<p>Minimaal 50% van de substantiële assemblagehandelingen moet in de EU plaatsvinden. Alleen verpakken of etiketteren telt niet.</p>",
"<p>At least 50% of substantial assembly steps must take place in the EU. Packaging or labelling alone does not count.</p>",
"<p>Mindestens 50 % der wesentlichen Montageschritte müssen in der EU stattfinden. Nur Verpacken oder Etikettieren zählt nicht.</p>",
"<p>Au moins 50 % des étapes d'assemblage substantielles doivent avoir lieu dans l'UE. L'emballage ou l'étiquetage seuls ne comptent pas.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        layout: "grid",
        items: [
          {
            id: "mie_nc1",
            icon: "cross",
            title: L(
"Alleen verpakken",
"Packaging only",
"Nur Verpacken",
"Emballage seul"
),
            body: emptyLocalized(),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "mie_nc2",
            icon: "cross",
            title: L(
"Alleen sticker of logo aanbrengen",
"Applying a sticker or logo only",
"Nur Aufkleber oder Logo anbringen",
"Pose d'autocollant ou logo seule"
),
            body: emptyLocalized(),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "mie_nc3",
            icon: "cross",
            title: L(
"Minimale of symbolische assemblage",
"Minimal or symbolic assembly",
"Minimale oder symbolische Montage",
"Assemblage minimal ou symbolique"
),
            body: emptyLocalized(),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
        ],
        ctas: [],
        stages: [],
      },
      {
        id: "mie_bands",
        key: "text",
        visible: true,
        sortOrder: 40,
        title: emptyLocalized(),
        body: L(
"<p>Producenten leveren de productiegegevens aan. EuropMade kan informatie en bewijs controleren. Jij ziet de uitkomst — niet de marketingpraat.</p><ol><li>Assemblage: 100% assemblage in EU (75), 75–99% assemblage in EU (56), 50–74% assemblage in EU (38).</li><li>Onderdelen: Overwegend EU (15), Gedeeltelijk EU (8), Niet of nauwelijks EU (0).</li><li>Materialen: Overwegend EU (10), Gedeeltelijk EU (5), Niet of nauwelijks EU (0).</li></ol>",
"<p>Producers provide production data. EuropMade can review information and evidence. You see the outcome — not the marketing spin.</p><ol><li>Assembly: 100% assembly in the EU (75), 75–99% assembly in the EU (56), 50–74% assembly in the EU (38).</li><li>Parts: Predominantly EU (15), Partially EU (8), Little or no EU (0).</li><li>Materials: Predominantly EU (10), Partially EU (5), Little or no EU (0).</li></ol>",
"<p>Hersteller liefern Produktionsdaten. EuropMade kann Informationen und Nachweise prüfen. Sie sehen das Ergebnis — nicht das Marketing.</p><ol><li>Montage: 100 % Montage in der EU (75), 75–99 % Montage in der EU (56), 50–74 % Montage in der EU (38).</li><li>Teile: Überwiegend EU (15), Teilweise EU (8), Kaum oder nicht EU (0).</li><li>Materialien: Überwiegend EU (10), Teilweise EU (5), Kaum oder nicht EU (0).</li></ol>",
"<p>Les producteurs fournissent les données de production. EuropMade peut contrôler informations et preuves. Vous voyez le résultat — pas le discours marketing.</p><ol><li>Assemblage: 100 % d'assemblage dans l'UE (75), 75–99 % d'assemblage dans l'UE (56), 50–74 % d'assemblage dans l'UE (38).</li><li>Composants: Majoritairement UE (15), Partiellement UE (8), Peu ou pas d'UE (0).</li><li>Matériaux: Majoritairement UE (10), Partiellement UE (5), Peu ou pas d'UE (0).</li></ol>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        ctas: [],
        stages: [],
      },
      {
        id: "mie_ctas",
        key: "cta_group",
        visible: true,
        sortOrder: 50,
        title: emptyLocalized(),
        body: emptyLocalized(),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        stages: [],
        ctas: [
          {
            id: "mie_cta_buy",
            label: L(
"Waarom kopen bij EuropMade?",
"Why buy on EuropMade?",
"Warum bei EuropMade kaufen?",
"Pourquoi acheter sur EuropMade ?"
),
            href: "/waarom-kopen",
            variant: "primary",
          },
          {
            id: "mie_cta_sell",
            label: L(
"Waarom verkopen via EuropMade?",
"Why sell on EuropMade?",
"Warum über EuropMade verkaufen?",
"Pourquoi vendre via EuropMade ?"
),
            href: "/waarom-verkopen",
            variant: "secondary",
          },
          {
            id: "mie_cta_browse",
            label: L(
"Ontdek Europese producten",
"Discover European products",
"Europäische Produkte entdecken",
"Découvrir des produits européens"
),
            href: "/zoeken",
            variant: "secondary",
          },
        ],
      },
    ],
  }
}


function seedWaaromKopen(): CmsPageDocument {
  return {
    sections: [
      {
        id: "wb_hero",
        key: "hero",
        visible: true,
        sortOrder: 0,
        title: L(
"Je weet eindelijk waar je product vandaan komt.",
"You finally know where your product comes from.",
"Sie wissen endlich, woher Ihr Produkt kommt.",
"Vous savez enfin d'où vient votre produit."
),
        body: L(
"<p>EuropMade is de plek voor producten die aantoonbaar in Europa worden gemaakt — met een duidelijke Made in Europe-score, echte productinformatie en meerdere aanbieders.</p>",
"<p>EuropMade is the place for products that are demonstrably made in Europe — with a clear Made in Europe score, real product information and multiple sellers.</p>",
"<p>EuropMade ist der Ort für Produkte, die nachweislich in Europa hergestellt werden — mit klarem Made-in-Europe-Score, echten Produktinformationen und mehreren Anbietern.</p>",
"<p>EuropMade est l'endroit pour des produits démontrablement fabriqués en Europe — avec un score Made in Europe clair, de vraies fiches produit et plusieurs vendeurs.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        stages: [],
        ctas: [],
      },
      {
        id: "wb_ctas",
        key: "cta_group",
        visible: true,
        sortOrder: 5,
        title: emptyLocalized(),
        body: emptyLocalized(),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        stages: [],
        ctas: [
          {
            id: "wb_cta_browse",
            label: L(
"Ontdek Europese producten",
"Discover European products",
"Europäische Produkte entdecken",
"Découvrir des produits européens"
),
            href: "/zoeken",
            variant: "primary",
          },
          {
            id: "wb_cta_mie",
            label: L(
"Lees hoe Made in Europe werkt",
"Read how Made in Europe works",
"Lesen Sie, wie Made in Europe funktioniert",
"Lire comment fonctionne Made in Europe"
),
            href: "/made-in-europe",
            variant: "secondary",
          },
        ],
      },
      {
        id: "wb_flow",
        key: "steps",
        visible: true,
        sortOrder: 10,
        title: L(
"Van herkomst tot aankoop — in één oogopslag",
"From origin to purchase — at a glance",
"Von Herkunft bis Kauf — auf einen Blick",
"De l'origine à l'achat — en un coup d'œil"
),
        body: emptyLocalized(),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        layout: "horizontal",
        items: [
          { id: "wb_f1", icon: "globe", title: L(
"Europese productie",
"European production",
"Europäische Produktion",
"Production européenne"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "wb_f2", icon: "search", title: L(
"Transparante herkomst",
"Transparent origin",
"Transparente Herkunft",
"Origine transparente"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "wb_f3", icon: "factory", title: L(
"Productie zichtbaar",
"Production visible",
"Produktion sichtbar",
"Production visible"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "wb_f4", icon: "star", title: L(
"Made in Europe-score",
"Made in Europe score",
"Made-in-Europe-Score",
"Score Made in Europe"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "wb_f5", icon: "cart", title: L(
"Product kopen",
"Buy the product",
"Produkt kaufen",
"Acheter le produit"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
        ],
        ctas: [],
        stages: [],
      },
      {
        id: "wb_points",
        key: "cards",
        visible: true,
        sortOrder: 20,
        title: emptyLocalized(),
        body: emptyLocalized(),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        layout: "grid",
        items: [
          { id: "wb_p1", icon: "globe", title: L(
"Europese productie, geen vage claims",
"European production, not vague claims",
"Europäische Produktion, keine vagen Claims",
"Production européenne, pas de promesses floues"
), body: L(
"<p>Alleen producten die voldoen aan onze vaste assemblage-eis (minimaal 50% substantiële assemblage in de EU) kunnen als Made in Europe verschijnen.</p>",
"<p>Only products that meet our fixed assembly rule (at least 50% substantial assembly in the EU) can appear as Made in Europe.</p>",
"<p>Nur Produkte, die unsere feste Montageregel erfüllen (mindestens 50 % wesentliche Montage in der EU), können als Made in Europe erscheinen.</p>",
"<p>Seuls les produits qui respectent notre règle d'assemblage fixe (au moins 50 % d'assemblage substantiel dans l'UE) peuvent apparaître comme Made in Europe.</p>"
), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "wb_p2", icon: "search", title: L(
"Een score die je kunt begrijpen",
"A score you can understand",
"Ein Score, den Sie verstehen",
"Un score que vous comprenez"
), body: L(
"<p>Assemblage, onderdelen en materialen tellen mee. Geen verkoopprijs-trucjes en geen verborgen herkomst.</p>",
"<p>Assembly, parts and materials count. No selling-price tricks and no hidden origin.</p>",
"<p>Montage, Teile und Materialien zählen. Keine Verkaufspreis-Tricks und keine versteckte Herkunft.</p>",
"<p>Assemblage, composants et matériaux comptent. Pas de tours de prix de vente ni d'origine cachée.</p>"
), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "wb_p3", icon: "factory", title: L(
"Europese merken ontdekken",
"Discover European brands",
"Europäische Marken entdecken",
"Découvrir des marques européennes"
), body: L(
"<p>Bekijk waar producten worden gemaakt, wie de maker is, en vergelijk aanbiedingen van meerdere retailers.</p>",
"<p>See where products are made, who the maker is, and compare offers from multiple retailers.</p>",
"<p>Sehen Sie, wo Produkte hergestellt werden, wer der Hersteller ist, und vergleichen Sie Angebote mehrerer Händler.</p>",
"<p>Voyez où les produits sont fabriqués, qui est le fabricant, et comparez les offres de plusieurs détaillants.</p>"
), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "wb_p4", icon: "star", title: L(
"Transparantie voor de consument",
"Transparency for the consumer",
"Transparenz für Verbraucher",
"Transparence pour le consommateur"
), body: L(
"<p>Producenten leveren de productiegegevens aan. EuropMade kan informatie en bewijs controleren. Jij ziet de uitkomst — niet de marketingpraat.</p>",
"<p>Producers provide production data. EuropMade can review information and evidence. You see the outcome — not the marketing spin.</p>",
"<p>Hersteller liefern Produktionsdaten. EuropMade kann Informationen und Nachweise prüfen. Sie sehen das Ergebnis — nicht das Marketing.</p>",
"<p>Les producteurs fournissent les données de production. EuropMade peut contrôler informations et preuves. Vous voyez le résultat — pas le discours marketing.</p>"
), href: "", value: emptyLocalized(), detail: emptyLocalized() },
        ],
        ctas: [],
        stages: [],
      },
      {
        id: "wb_mie_teaser",
        key: "text",
        visible: true,
        sortOrder: 30,
        title: L(
"Hoe bepaalt EuropMade Made in Europe?",
"How does EuropMade determine Made in Europe?",
"Wie bestimmt EuropMade Made in Europe?",
"Comment EuropMade détermine-t-il Made in Europe ?"
),
        body: L(
"<p>De EuropMade-score laat zien in hoeverre een product volgens vaste criteria in Europa wordt geproduceerd (assemblage, onderdelen, materialen). Dit is geen percentage van de verkoopprijs en geen exacte berekening van Europese grondstoffen.</p>",
"<p>The EuropMade score shows how far a product is produced in Europe by fixed criteria (assembly, parts, materials). It is not a share of the selling price and not an exact European raw-materials percentage.</p>",
"<p>Der EuropMade-Score zeigt, inwieweit ein Produkt nach festen Kriterien in Europa hergestellt wird (Montage, Teile, Materialien). Es ist kein Anteil am Verkaufspreis und keine exakte EU-Rohstoffquote.</p>",
"<p>Le score EuropMade indique dans quelle mesure un produit est fabriqué en Europe selon des critères fixes (assemblage, composants, matériaux). Ce n'est pas un pourcentage du prix de vente ni un calcul exact de matières premières européennes.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        stages: [],
        ctas: [
          {
            id: "wb_mie_link",
            label: L(
"Hoe wordt deze score bepaald?",
"How is this score determined?",
"Wie wird dieser Score bestimmt?",
"Comment ce score est-il déterminé ?"
),
            href: "/made-in-europe",
            variant: "link",
          },
        ],
      },
    ],
  }
}


function seedWaaromVerkopen(): CmsPageDocument {
  return {
    sections: [
      {
        id: "ws_hero",
        key: "hero",
        visible: true,
        sortOrder: 0,
        title: L(
"Verkoop Europese producten in heel Europa.",
"Sell European products across Europe.",
"Verkaufen Sie europäische Produkte in ganz Europa.",
"Vendez des produits européens dans toute l'Europe."
),
        body: L(
"<p>EuropMade brengt Europese producenten, merken en consumenten samen op één marketplace — met duidelijke herkomst, één productcatalogus en ruimte om te groeien naar meerdere EU-markten.</p>",
"<p>EuropMade brings European producers, brands and consumers together on one marketplace — with clear origin, one product catalogue and room to grow into multiple EU markets.</p>",
"<p>EuropMade bringt europäische Produzenten, Marken und Verbraucher auf einem Marketplace zusammen — mit klarer Herkunft, einem Produktkatalog und Raum zum Wachsen in mehrere EU-Märkte.</p>",
"<p>EuropMade réunit producteurs, marques et consommateurs européens sur une marketplace — avec une origine claire, un catalogue produit unique et de la place pour grandir vers plusieurs marchés de l'UE.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        stages: [],
        ctas: [],
      },
      {
        id: "ws_funnel",
        key: "funnel",
        visible: true,
        sortOrder: 10,
        title: emptyLocalized(),
        body: emptyLocalized(),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        ctas: [],
        stages: [
          { id: "ws_f_product", kind: "pill", label: L(
"Jouw product",
"Your product",
"Ihr Produkt",
"Votre produit"
), icon: "none", markets: [] },
          { id: "ws_f_hub", kind: "hub", label: L(
"EuropMade",
"EuropMade",
"EuropMade",
"EuropMade"
), icon: "none", markets: [] },
          { id: "ws_f_markets", kind: "markets", label: emptyLocalized(), icon: "none", markets: [
L(
"Nederland",
"Netherlands",
"Niederlande",
"Pays-Bas"
),
L(
"Duitsland",
"Germany",
"Deutschland",
"Allemagne"
),
L(
"Frankrijk",
"France",
"Frankreich",
"France"
),
L(
"België",
"Belgium",
"Belgien",
"Belgique"
),
L(
"Oostenrijk",
"Austria",
"Österreich",
"Autriche"
),
L(
"Spanje",
"Spain",
"Spanien",
"Espagne"
),
L(
"Italië",
"Italy",
"Italien",
"Italie"
)
] },
          { id: "ws_f_customers", kind: "customers", label: L(
"Europese klanten",
"European customers",
"Europäische Kunden",
"Clients européens"
), icon: "users", markets: [] },
          { id: "ws_f_tagline", kind: "tagline", label: L(
"Één platform. Europese klanten.",
"One platform. European customers.",
"Eine Plattform. Europäische Kunden.",
"Une plateforme. Des clients européens."
), icon: "none", markets: [] },
        ],
      },
      {
        id: "ws_hero_ctas",
        key: "cta_group",
        visible: true,
        sortOrder: 20,
        title: emptyLocalized(),
        body: emptyLocalized(),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        stages: [],
        ctas: [
          { id: "ws_cta_start", label: L(
"Start verkopen",
"Start selling",
"Verkauf starten",
"Commencer à vendre"
), href: "/register?redirect=/partner-onboarding", variant: "primary" },
          { id: "ws_cta_how", label: L(
"Ontdek hoe het werkt",
"See how it works",
"So funktioniert es",
"Voir comment ça marche"
), href: "#hoe-het-werkt", variant: "secondary" },
          { id: "ws_cta_login", label: L(
"Ik ben al partner — inloggen",
"I'm already a partner — sign in",
"Ich bin bereits Partner — anmelden",
"Je suis déjà partenaire — connexion"
), href: "/login?redirect=/partner-onboarding", variant: "link" },
        ],
      },
      {
        id: "ws_quick",
        key: "text",
        visible: true,
        sortOrder: 30,
        title: L(
"Van aanmelden naar je eerste producten: eenvoudig en snel",
"From sign-up to your first products: simple and fast",
"Von der Anmeldung zu Ihren ersten Produkten: einfach und schnell",
"De l'inscription à vos premiers produits : simple et rapide"
),
        body: L(
"<p>Je start met een account, vult partnergegevens in en voegt producten toe via de Product Cloud. Exacte doorlooptijd hangt af van je catalogus en documenten.</p>",
"<p>You start with an account, enter partner details and add products via the Product Cloud. Exact timing depends on your catalogue and documents.</p>",
"<p>Sie starten mit einem Konto, geben Partnerdaten ein und fügen Produkte über die Product Cloud hinzu. Die genaue Dauer hängt von Katalog und Dokumenten ab.</p>",
"<p>Vous commencez avec un compte, renseignez les données partenaire et ajoutez des produits via le Product Cloud. Le délai exact dépend de votre catalogue et documents.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        ctas: [],
        stages: [],
      },
      {
        id: "ws_pricing",
        key: "pricing_highlight",
        visible: true,
        sortOrder: 40,
        title: L(
"Geen verkoop = geen kosten",
"No sales = no fees",
"Kein Verkauf = keine Kosten",
"Pas de vente = pas de frais"
),
        body: L(
"<p>Je betaalt alleen wanneer je verkoopt: een vaste verkoopcommissie van 10%. Er is geen verplichte maandelijkse seller fee in het MVP-model.</p>",
"<p>You only pay when you sell: a fixed 10% sales commission. There is no mandatory monthly seller fee in the MVP model.</p>",
"<p>Sie zahlen nur bei Verkauf: eine feste Verkaufsprovision von 10 %. Im MVP-Modell gibt es keine verpflichtende monatliche Seller-Gebühr.</p>",
"<p>Vous ne payez que lorsque vous vendez : une commission fixe de 10 %. Pas de frais vendeur mensuels obligatoires dans le modèle MVP.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        note: L(
"<p>Optionele kosten (banners, sponsored products, campagnes) kies je zelf — die zijn geen vaste abonnementskosten.</p>",
"<p>Optional costs (banners, sponsored products, campaigns) are your choice — not a fixed subscription fee.</p>",
"<p>Optionale Kosten (Banner, Sponsored Products, Kampagnen) wählen Sie selbst — keine feste Abo-Gebühr.</p>",
"<p>Les coûts optionnels (bannières, produits sponsorisés, campagnes) sont à votre choix — pas d'abonnement fixe.</p>"
),
        items: [
          { id: "ws_price0", icon: "euro", title: L(
"€0 bij geen verkoop",
"€0 when you don't sell",
"0 € ohne Verkauf",
"0 € sans vente"
), body: emptyLocalized(), href: "", value: L(
"€0",
"€0",
"€0",
"€0"
), detail: emptyLocalized() },
          { id: "ws_price10", icon: "none", title: L(
"10% commissie bij verkoop",
"10% commission when you sell",
"10 % Provision bei Verkauf",
"10 % de commission à la vente"
), body: emptyLocalized(), href: "", value: L(
"10%",
"10%",
"10%",
"10%"
), detail: emptyLocalized() },
        ],
        ctas: [],
        stages: [],
      },
      {
        id: "ws_problem",
        key: "text",
        visible: true,
        sortOrder: 50,
        title: L(
"Europa is één markt. Verkoop is dat vaak nog niet.",
"Europe is one market. Selling often is not.",
"Europa ist ein Markt. Verkauf oft noch nicht.",
"L'Europe est un marché. La vente, souvent pas encore."
),
        body: L(
"<p>Veel producenten en merken moeten vandaag nog per land of per kanaal opnieuw beginnen: andere marketplaces, andere talen, andere productfeeds en andere commerciële processen. Dat versnippert tijd, content en bereik.</p><p>EuropMade brengt dit samen op één platform — zodat je toe kunt bouwen naar Europese zichtbaarheid zonder voor ieder land een volledig aparte marketplace-strategie te moeten opzetten.</p>",
"<p>Many producers and brands still start over for each country or channel: other marketplaces, other languages, other product feeds and other commercial processes. That fragments time, content and reach.</p><p>EuropMade brings this together on one platform — so you can build toward European visibility without a fully separate marketplace strategy for every country.</p>",
"<p>Viele Produzenten und Marken beginnen heute noch pro Land oder Kanal neu: andere Marktplätze, andere Sprachen, andere Produktfeeds und andere kommerzielle Prozesse. Das zersplittert Zeit, Inhalte und Reichweite.</p><p>EuropMade bündelt das auf einer Plattform — damit Sie europäische Sichtbarkeit aufbauen können, ohne für jedes Land eine komplett eigene Marketplace-Strategie zu brauchen.</p>",
"<p>Beaucoup de producteurs et marques recommencent encore par pays ou canal : autres marketplaces, autres langues, autres flux produits et autres processus commerciaux. Cela fragmente temps, contenu et portée.</p><p>EuropMade regroupe cela sur une plateforme — pour construire une visibilité européenne sans stratégie marketplace entièrement séparée pour chaque pays.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        ctas: [],
        stages: [],
      },
      {
        id: "ws_platform",
        key: "text",
        visible: true,
        sortOrder: 60,
        title: L(
"Een Europese markt. Eén platform.",
"One European market. One platform.",
"Ein europäischer Markt. Eine Plattform.",
"Un marché européen. Une plateforme."
),
        body: L(
"<p>Met EuropMade bouw je toe naar één platform waarmee je Europese consumenten in meerdere EU-landen kunt bereiken — één account, één productaanbod, één centrale plek voor productinformatie.</p><p>Ontworpen om vanuit één platform meerdere Europese markten te bedienen.</p><p>Welke landen, talen, logistieke opties en verkoopvoorwaarden beschikbaar zijn, hangt af van de betreffende product-, seller- en marktconfiguratie. EuropMade is de Europese groeivisie: één marketplace in plaats van een versnipperde land-per-land aanpak.</p>",
"<p>With EuropMade you build toward one platform to reach European consumers in multiple EU countries — one account, one product range, one central place for product information.</p><p>Designed to serve multiple European markets from one platform.</p><p>Which countries, languages, logistics options and selling terms are available depends on the relevant product, seller and market configuration. EuropMade is the European growth vision: one marketplace instead of a fragmented country-by-country approach.</p>",
"<p>Mit EuropMade bauen Sie auf eine Plattform hin, mit der Sie europäische Verbraucher in mehreren EU-Ländern erreichen — ein Konto, ein Sortiment, ein zentraler Ort für Produktinformationen.</p><p>Darauf ausgelegt, mehrere europäische Märkte von einer Plattform aus zu bedienen.</p><p>Welche Länder, Sprachen, Logistikoptionen und Verkaufsbedingungen verfügbar sind, hängt von der jeweiligen Produkt-, Seller- und Marktkonfiguration ab. EuropMade ist die europäische Wachstumsvision: ein Marketplace statt eines fragmentierten Land-für-Land-Ansatzes.</p>",
"<p>Avec EuropMade, vous construisez une plateforme pour atteindre des consommateurs européens dans plusieurs pays de l'UE — un compte, une offre, un lieu central pour l'information produit.</p><p>Conçu pour servir plusieurs marchés européens depuis une seule plateforme.</p><p>Les pays, langues, options logistiques et conditions de vente disponibles dépendent de la configuration produit, vendeur et marché. EuropMade est la vision de croissance européenne : une marketplace plutôt qu'une approche pays par pays fragmentée.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        ctas: [],
        stages: [],
      },
      {
        id: "ws_platform_funnel",
        key: "funnel",
        visible: true,
        sortOrder: 65,
        title: L(
"EuropMade",
"EuropMade",
"EuropMade",
"EuropMade"
),
        body: emptyLocalized(),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        ctas: [],
        stages: [
          { id: "ws_pf_hub", kind: "hub", label: L(
"EuropMade",
"EuropMade",
"EuropMade",
"EuropMade"
), icon: "none", markets: [] },
          { id: "ws_pf_markets", kind: "markets", label: emptyLocalized(), icon: "none", markets: [
L(
"Nederland",
"Netherlands",
"Niederlande",
"Pays-Bas"
),
L(
"Duitsland",
"Germany",
"Deutschland",
"Allemagne"
),
L(
"Frankrijk",
"France",
"Frankreich",
"France"
),
L(
"België",
"Belgium",
"Belgien",
"Belgique"
),
L(
"Oostenrijk",
"Austria",
"Österreich",
"Autriche"
),
L(
"Spanje",
"Spain",
"Spanien",
"Espagne"
),
L(
"Italië",
"Italy",
"Italien",
"Italie"
)
] },
          { id: "ws_pf_customers", kind: "customers", label: L(
"Europese klanten",
"European customers",
"Europäische Kunden",
"Clients européens"
), icon: "users", markets: [] },
        ],
      },
      {
        id: "ws_translate",
        key: "steps",
        visible: true,
        sortOrder: 70,
        title: L(
"Automatische vertalingen voor Europese talen",
"Automatic translations for European languages",
"Automatische Übersetzungen für europäische Sprachen",
"Traductions automatiques pour les langues européennes"
),
        body: L(
"<p>Je hoeft niet voor ieder land zelf alle productteksten opnieuw te schrijven. Productinformatie kan via de Product Cloud-vertaallaag worden voorbereid voor de actieve talen.</p>",
"<p>You do not have to rewrite all product texts yourself for every country. Product information can be prepared via the Product Cloud translation layer for the active languages.</p>",
"<p>Sie müssen nicht für jedes Land alle Produkttexte selbst neu schreiben. Produktinformationen können über die Product-Cloud-Übersetzungsschicht für die aktiven Sprachen vorbereitet werden.</p>",
"<p>Vous n'avez pas à réécrire tous les textes produit pour chaque pays. L'information produit peut être préparée via la couche de traduction Product Cloud pour les langues actives.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        layout: "vertical",
        items: [
          { id: "ws_tr1", icon: "none", title: L(
"Productinformatie",
"Product information",
"Produktinformationen",
"Information produit"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_tr2", icon: "translate", title: L(
"EuropMade vertaallaag",
"EuropMade translation layer",
"EuropMade-Übersetzungsschicht",
"Couche de traduction EuropMade"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_tr3", icon: "none", title: L(
"NL · EN · DE · FR",
"NL · EN · DE · FR",
"NL · EN · DE · FR",
"NL · EN · DE · FR"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
        ],
        ctas: [],
        stages: [],
      },
      {
        id: "ws_data",
        key: "cards",
        visible: true,
        sortOrder: 80,
        title: L(
"Hoe komt je productdata online?",
"How does your product data go online?",
"Wie kommen Ihre Produktdaten online?",
"Comment vos données produit passent-elles en ligne ?"
),
        body: L(
"<p>Je beheert producten in de Product Cloud. Made in Europe-gegevens kun je per product of in bulk/CSV koppelen. Handmatig toevoegen is beschikbaar; bredere cataloguskoppelingen volgen de tools in je seller-account.</p>",
"<p>You manage products in the Product Cloud. Made in Europe data can be linked per product or via bulk/CSV. Manual add is available; broader catalogue connectors follow the tools in your seller account.</p>",
"<p>Sie verwalten Produkte in der Product Cloud. Made-in-Europe-Daten können pro Produkt oder per Bulk/CSV verknüpft werden. Manuelles Hinzufügen ist verfügbar; breitere Kataloganbindungen folgen den Tools in Ihrem Seller-Konto.</p>",
"<p>Vous gérez les produits dans le Product Cloud. Les données Made in Europe se lient par produit ou en bulk/CSV. L'ajout manuel est disponible ; les connecteurs catalogue plus larges suivent les outils de votre compte vendeur.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        layout: "grid",
        items: [
          { id: "ws_d1", icon: "package", title: L(
"Handmatig toevoegen",
"Add manually",
"Manuell hinzufügen",
"Ajout manuel"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_d2", icon: "file", title: L(
"CSV / bulk (Made in Europe)",
"CSV / bulk (Made in Europe)",
"CSV / Bulk (Made in Europe)",
"CSV / bulk (Made in Europe)"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_d3", icon: "store", title: L(
"Bestaande productdata in Product Cloud",
"Existing product data in Product Cloud",
"Bestehende Produktdaten in der Product Cloud",
"Données produit existantes dans le Product Cloud"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_d4", icon: "globe", title: L(
"API / koppeling (toekomstige uitbreiding)",
"API / connector (future expansion)",
"API / Anbindung (künftige Erweiterung)",
"API / connecteur (extension future)"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
        ],
        ctas: [
          { id: "ws_data_online", label: L(
"Producten online op EuropMade",
"Products live on EuropMade",
"Produkte online auf EuropMade",
"Produits en ligne sur EuropMade"
), href: "", variant: "link" },
        ],
        stages: [],
      },
      {
        id: "ws_bulk",
        key: "steps",
        visible: true,
        sortOrder: 90,
        title: L(
"Veel producten? Eén productieprofiel volstaat",
"Many products? One production profile is enough",
"Viele Produkte? Ein Produktionsprofil reicht",
"Beaucoup de produits ? Un profil de production suffit"
),
        body: L(
"<p>Koppel dezelfde productiefaciliteit of Made in Europe-keuzes aan meerdere producten tegelijk — via bulk of CSV. Je hoeft niet elk product één voor één opnieuw in te stellen.</p>",
"<p>Attach the same production facility or Made in Europe choices to many products at once — via bulk or CSV. You do not have to set every product one by one again.</p>",
"<p>Verknüpfen Sie dieselbe Produktionsstätte oder Made-in-Europe-Angaben mit vielen Produkten gleichzeitig — per Bulk oder CSV. Sie müssen nicht jedes Produkt einzeln neu setzen.</p>",
"<p>Liez le même site de production ou les choix Made in Europe à plusieurs produits à la fois — via bulk ou CSV. Pas besoin de tout refaire produit par produit.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        layout: "vertical",
        items: [
          { id: "ws_b1", icon: "factory", title: L(
"1 productiefaciliteit / profiel",
"1 production facility / profile",
"1 Produktionsstätte / Profil",
"1 site / profil de production"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_b2", icon: "package", title: L(
"Veel producten gekoppeld",
"Many products linked",
"Viele Produkte verknüpft",
"De nombreux produits liés"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
        ],
        ctas: [
          { id: "ws_bulk_mie", label: L(
"Bekijk Made in Europe",
"View Made in Europe",
"Made in Europe ansehen",
"Voir Made in Europe"
), href: "/made-in-europe", variant: "link" },
        ],
        stages: [],
      },
      {
        id: "ws_roles",
        key: "roles",
        visible: true,
        sortOrder: 100,
        title: L(
"Producent, merkeigenaar of verkoper",
"Producer, brand owner or seller",
"Produzent, Markeninhaber oder Verkäufer",
"Producteur, propriétaire de marque ou vendeur"
),
        body: emptyLocalized(),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [
          { id: "ws_r1", icon: "factory", title: L(
"Producent",
"Producer",
"Produzent",
"Producteur"
), body: L(
"<p>Eigen productie, productiefaciliteit, Made in Europe en merkpresentatie.</p>",
"<p>Own production, facility, Made in Europe and brand presentation.</p>",
"<p>Eigene Produktion, Produktionsstätte, Made in Europe und Markenauftritt.</p>",
"<p>Production propre, site, Made in Europe et présentation de marque.</p>"
), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_r2", icon: "tag", title: L(
"Merkeigenaar",
"Brand owner",
"Markeninhaber",
"Propriétaire de marque"
), body: L(
"<p>Merkbeheer, producten, merkverhaal en landgebonden content waar toegestaan.</p>",
"<p>Brand management, products, brand story and market content where allowed.</p>",
"<p>Markenverwaltung, Produkte, Markengeschichte und landesspezifische Inhalte wo erlaubt.</p>",
"<p>Gestion de marque, produits, histoire de marque et contenu marché selon les droits.</p>"
), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_r3", icon: "store", title: L(
"Verkoper",
"Seller",
"Verkäufer",
"Vendeur"
), body: L(
"<p>Producten aanbieden, productdata beheren en verkopen via EuropMade.</p>",
"<p>Offer products, manage product data and sell on EuropMade.</p>",
"<p>Produkte anbieten, Produktdaten verwalten und über EuropMade verkaufen.</p>",
"<p>Proposer des produits, gérer les données et vendre via EuropMade.</p>"
), href: "", value: emptyLocalized(), detail: emptyLocalized() },
        ],
        ctas: [],
        stages: [],
      },
      {
        id: "ws_position",
        key: "text",
        visible: true,
        sortOrder: 110,
        title: L(
"Concurreren op meer dan prijs",
"Compete on more than price",
"Auf mehr als den Preis konkurrieren",
"Concourir sur plus que le prix"
),
        body: L(
"<p>EuropMade is niet zomaar een marketplace met producten uit de hele wereld. Het platform kiest bewust voor Europese productie, duidelijke productherkomst en transparantie over hoe iets wordt gemaakt.</p><p>EuropMade kiest bewust voor een model waarin prijs niet het enige criterium is. Europese producenten concurreren binnen een omgeving waarin herkomst, transparantie en verantwoord produceren zichtbaar onderdeel zijn van de waarde van een product.</p>",
"<p>EuropMade is not just a marketplace with products from everywhere. The platform deliberately chooses European production, clear product origin and transparency about how something is made.</p><p>EuropMade deliberately chooses a model where price is not the only criterion. European producers compete in an environment where origin, transparency and responsible production are a visible part of a product’s value.</p>",
"<p>EuropMade ist nicht einfach ein Marketplace mit Produkten aus der ganzen Welt. Die Plattform setzt bewusst auf europäische Produktion, klare Produktherkunft und Transparenz darüber, wie etwas hergestellt wird.</p><p>EuropMade wählt bewusst ein Modell, in dem Preis nicht das einzige Kriterium ist. Europäische Produzenten konkurrieren in einem Umfeld, in dem Herkunft, Transparenz und verantwortungsvolle Produktion sichtbarer Teil des Produktwerts sind.</p>",
"<p>EuropMade n'est pas une marketplace avec des produits du monde entier. La plateforme choisit délibérément la production européenne, une origine claire et la transparence sur la façon dont un produit est fabriqué.</p><p>EuropMade choisit un modèle où le prix n'est pas le seul critère. Les producteurs européens concurrencent dans un environnement où l'origine, la transparence et la production responsable font partie visible de la valeur d'un produit.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        ctas: [],
        stages: [],
      },
      {
        id: "ws_offer",
        key: "offer_band",
        visible: true,
        sortOrder: 120,
        title: L(
"Start als één van de eerste Europese partners",
"Start as one of the first European partners",
"Starten Sie als einer der ersten europäischen Partner",
"Démarrez comme l'un des premiers partenaires européens"
),
        body: L(
"<p>EuropMade werkt met een duidelijk commercieel model: 10% verkoopcommissie, plus optionele advertentie- en marketingmogelijkheden zoals banners, sponsored products en affiliate.</p>",
"<p>EuropMade works with a clear commercial model: 10% sales commission, plus optional advertising and marketing options such as banners, sponsored products and affiliate.</p>",
"<p>EuropMade arbeitet mit einem klaren kommerziellen Modell: 10 % Verkaufsprovision plus optionale Werbe- und Marketingmöglichkeiten wie Banner, Sponsored Products und Affiliate.</p>",
"<p>EuropMade fonctionne avec un modèle commercial clair : 10 % de commission sur les ventes, plus des options publicitaires et marketing optionnelles (bannières, produits sponsorisés, affiliation).</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        offerValue: L(
"De eerste 50 actieve partners ontvangen €500 advertentietegoed.",
"The first 50 active partners receive €500 in advertising credit.",
"Die ersten 50 aktiven Partner erhalten 500 € Werbeguthaben.",
"Les 50 premiers partenaires actifs reçoivent 500 € de crédit publicitaire."
),
        note: L(
"<p>Dit is een introductieprogramma, geen onbeperkte permanente belofte. Toekenning gebeurt onder de voorwaarden van het introductieprogramma (onder meer actief account, complete bedrijfsgegevens en verdere deelnamecriteria).</p>",
"<p>This is an introduction programme, not an unlimited permanent promise. Allocation follows the introduction-programme terms (including an active account, complete company details and further participation criteria).</p>",
"<p>Dies ist ein Einführungsprogramm, kein unbegrenztes Dauerversprechen. Die Vergabe erfolgt unter den Bedingungen des Einführungsprogramms (u. a. aktives Konto, vollständige Firmendaten und weitere Teilnahmekriterien).</p>",
"<p>Il s'agit d'un programme d'introduction, pas d'une promesse permanente illimitée. L'attribution suit les conditions du programme d'introduction (notamment compte actif, données d'entreprise complètes et autres critères de participation).</p>"
),
        items: [],
        stages: [],
        ctas: [
          { id: "ws_offer_partner", label: L(
"Word partner",
"Become a partner",
"Partner werden",
"Devenir partenaire"
), href: "/register?redirect=/partner-onboarding", variant: "primary" },
          { id: "ws_offer_login", label: L(
"Ik ben al partner — inloggen",
"I'm already a partner — sign in",
"Ich bin bereits Partner — anmelden",
"Je suis déjà partenaire — connexion"
), href: "/login?redirect=/partner-onboarding", variant: "secondary" },
        ],
      },
      {
        id: "ws_how",
        key: "steps",
        visible: true,
        sortOrder: 130,
        title: L(
"Hoe het werkt",
"How it works",
"So funktioniert es",
"Comment ça marche"
),
        body: emptyLocalized(),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        layout: "horizontal",
        items: [
          { id: "ws_h1", icon: "none", title: L(
"Aanmelden als partner via partner-onboarding",
"Register as a partner via partner onboarding",
"Als Partner über das Partner-Onboarding anmelden",
"S'inscrire comme partenaire via l'onboarding partenaire"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_h2", icon: "none", title: L(
"Producten toevoegen in de Product Cloud",
"Add products in the Product Cloud",
"Produkte in der Product Cloud hinzufügen",
"Ajouter des produits dans le Product Cloud"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_h3", icon: "none", title: L(
"Productinformatie controleren en aanvullen",
"Review and complete product information",
"Produktinformationen prüfen und ergänzen",
"Contrôler et compléter l'information produit"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_h4", icon: "none", title: L(
"Made in Europe-informatie invullen (score wordt automatisch berekend)",
"Enter Made in Europe information (score is calculated automatically)",
"Made-in-Europe-Angaben erfassen (Score wird automatisch berechnet)",
"Renseigner Made in Europe (le score est calculé automatiquement)"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_h5", icon: "none", title: L(
"Producten publiceren voor de storefront",
"Publish products to the storefront",
"Produkte für die Storefront veröffentlichen",
"Publier les produits sur la storefront"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
          { id: "ws_h6", icon: "none", title: L(
"Europese klanten bereiken — organisch en via marketingtools",
"Reach European customers — organically and via marketing tools",
"Europäische Kunden erreichen — organisch und über Marketing-Tools",
"Atteindre des clients européens — en organique et via les outils marketing"
), body: emptyLocalized(), href: "", value: emptyLocalized(), detail: emptyLocalized() },
        ],
        stages: [],
        ctas: [
          { id: "ws_how_start", label: L(
"Start verkopen",
"Start selling",
"Verkauf starten",
"Commencer à vendre"
), href: "/register?redirect=/partner-onboarding", variant: "primary" },
          { id: "ws_how_login", label: L(
"Ik ben al partner — inloggen",
"I'm already a partner — sign in",
"Ich bin bereits Partner — anmelden",
"Je suis déjà partenaire — connexion"
), href: "/login?redirect=/partner-onboarding", variant: "link" },
        ],
      },
      {
        id: "ws_faq",
        key: "faq",
        visible: true,
        sortOrder: 140,
        title: L(
"Veelgestelde vragen",
"Frequently asked questions",
"Häufig gestellte Fragen",
"Questions fréquentes"
),
        body: emptyLocalized(),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [
          {
            id: "ws_faq_9",
            icon: "none",
            title: L(
"Hoe voeg ik mijn producten toe?",
"How do I add my products?",
"Wie füge ich meine Produkte hinzu?",
"Comment ajouter mes produits ?"
),
            body: L(
"<p>Na goedkeuring als partner voeg je producten toe in de Product Cloud via de seller-productflows (handmatig). Daarna kun je Made in Europe-gegevens koppelen.</p>",
"<p>After partner approval you add products in the Product Cloud via seller product flows (manual). Then you can attach Made in Europe data.</p>",
"<p>Nach Partnerfreigabe fügen Sie Produkte in der Product Cloud über Seller-Produktflows hinzu (manuell). Danach können Sie Made-in-Europe-Daten verknüpfen.</p>",
"<p>Après validation partenaire, vous ajoutez des produits dans le Product Cloud via les parcours vendeur (manuel). Ensuite vous liez les données Made in Europe.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_3",
            icon: "none",
            title: L(
"Kan ik mijn bestaande productcatalogus importeren?",
"Can I import my existing product catalogue?",
"Kann ich meinen bestehenden Produktkatalog importieren?",
"Puis-je importer mon catalogue produits existant ?"
),
            body: L(
"<p>Je beheert producten via de Product Cloud en seller-flows. Voor Made in Europe-gegevens is er bulk- en CSV-ondersteuning. Brede catalogusimport hangt af van de beschikbare seller-tools in je account.</p>",
"<p>You manage products via the Product Cloud and seller flows. Made in Europe data supports bulk and CSV. Broader catalogue import depends on the seller tools available in your account.</p>",
"<p>Sie verwalten Produkte über die Product Cloud und Seller-Flows. Für Made-in-Europe-Daten gibt es Bulk- und CSV-Unterstützung. Breitere Katalogimporte hängen von den Seller-Tools in Ihrem Konto ab.</p>",
"<p>Vous gérez les produits via le Product Cloud et les parcours vendeur. Les données Made in Europe prennent en charge le bulk et le CSV. Un import catalogue plus large dépend des outils vendeur disponibles sur votre compte.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_10",
            icon: "none",
            title: L(
"Kan ik meerdere producten tegelijk beheren?",
"Can I manage multiple products at once?",
"Kann ich mehrere Produkte gleichzeitig verwalten?",
"Puis-je gérer plusieurs produits à la fois ?"
),
            body: L(
"<p>Ja. Voor Made in Europe kun je hetzelfde profiel/faciliteit in bulk of via CSV op meerdere eigen producten toepassen.</p>",
"<p>Yes. For Made in Europe you can apply the same profile/facility in bulk or via CSV to multiple owned products.</p>",
"<p>Ja. Für Made in Europe können Sie dasselbe Profil/dieselbe Stätte per Bulk oder CSV auf mehrere eigene Produkte anwenden.</p>",
"<p>Oui. Pour Made in Europe, vous pouvez appliquer le même profil/site en bulk ou CSV à plusieurs produits dont vous êtes propriétaire.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_11",
            icon: "none",
            title: L(
"Wat als ik honderden producten heb?",
"What if I have hundreds of products?",
"Was ist, wenn ich Hunderte Produkte habe?",
"Et si j'ai des centaines de produits ?"
),
            body: L(
"<p>Gebruik één productieprofiel of faciliteit en koppel die in bulk aan veel producten. Zo voorkom je herhaalde handmatige invoer van dezelfde assemblage-/onderdelen-/materiaalkeuzes.</p>",
"<p>Use one production profile or facility and link it in bulk to many products. That avoids repeating the same assembly/parts/materials choices by hand.</p>",
"<p>Nutzen Sie ein Produktionsprofil oder eine Stätte und verknüpfen Sie diese per Bulk mit vielen Produkten. So vermeiden Sie wiederholte manuelle Eingaben derselben Montage-/Teile-/Materialangaben.</p>",
"<p>Utilisez un profil ou site de production et liez-le en masse à de nombreux produits. Cela évite de ressaisir les mêmes choix d'assemblage/composants/matériaux.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_12",
            icon: "none",
            title: L(
"Moet ik ieder product afzonderlijk vertalen?",
"Do I have to translate every product myself?",
"Muss ich jedes Produkt selbst übersetzen?",
"Dois-je traduire chaque produit moi-même ?"
),
            body: L(
"<p>Nee. De Product Cloud-vertaallaag kan content voorbereiden voor NL, EN, DE en FR. Je beheert brontekst en status; je hoeft niet per land alles handmatig te herschrijven.</p>",
"<p>No. The Product Cloud translation layer can prepare content for NL, EN, DE and FR. You manage source text and status; you do not rewrite everything per country by hand.</p>",
"<p>Nein. Die Product-Cloud-Übersetzungsschicht kann Inhalte für NL, EN, DE und FR vorbereiten. Sie steuern Quelltext und Status; Sie müssen nicht alles landesweise manuell neu schreiben.</p>",
"<p>Non. La couche de traduction Product Cloud peut préparer le contenu pour NL, EN, DE et FR. Vous gérez le texte source et le statut ; pas besoin de tout réécrire à la main par pays.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_6",
            icon: "none",
            title: L(
"Hoe worden producten vertaald?",
"How are products translated?",
"Wie werden Produkte übersetzt?",
"Comment les produits sont-ils traduits ?"
),
            body: L(
"<p>Productcontent kan via de bestaande Product Cloud-vertaallaag worden voorbereid voor de actieve talen Nederlands, Engels, Duits en Frans. Extra talen zijn architecturaal voorbereid, maar niet als beschikbaar claimen zolang ze niet actief zijn.</p>",
"<p>Product content can be prepared via the existing Product Cloud translation layer for the active languages Dutch, English, German and French. Additional languages are architecturally prepared, but are not claimed as available until active.</p>",
"<p>Produktinhalte können über die bestehende Product-Cloud-Übersetzungsschicht für die aktiven Sprachen Niederländisch, Englisch, Deutsch und Französisch vorbereitet werden. Weitere Sprachen sind architektonisch vorbereitet, werden aber nicht als verfügbar behauptet, solange sie nicht aktiv sind.</p>",
"<p>Le contenu produit peut être préparé via la couche de traduction Product Cloud existante pour les langues actives néerlandais, anglais, allemand et français. D'autres langues sont préparées architecturalement, mais ne sont pas présentées comme disponibles tant qu'elles ne sont pas actives.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_4",
            icon: "none",
            title: L(
"Hoe werkt Made in Europe?",
"How does Made in Europe work?",
"Wie funktioniert Made in Europe?",
"Comment fonctionne Made in Europe ?"
),
            body: L(
"<p>Je vult stabiele keuzes in voor assemblage, onderdelen en materialen (en optioneel een productiefaciliteit). EuropMade berekent de score automatisch. Details staan op de pagina Made in Europe.</p>",
"<p>You enter stable choices for assembly, parts and materials (and optionally a production facility). EuropMade calculates the score automatically. Details are on the Made in Europe page.</p>",
"<p>Sie geben stabile Angaben zu Montage, Teilen und Materialien ein (optional eine Produktionsstätte). EuropMade berechnet den Score automatisch. Details stehen auf der Made-in-Europe-Seite.</p>",
"<p>Vous saisissez des choix stables pour assemblage, composants et matériaux (et optionnellement un site de production). EuropMade calcule le score automatiquement. Les détails sont sur la page Made in Europe.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_13",
            icon: "none",
            title: L(
"Kan ik productinformatie later wijzigen?",
"Can I change product information later?",
"Kann ich Produktinformationen später ändern?",
"Puis-je modifier l'information produit plus tard ?"
),
            body: L(
"<p>Ja. Product Cloud-content, merkgegevens en Made in Europe-koppelingen kun je later bijwerken volgens de bestaande seller-/eigenaarflows.</p>",
"<p>Yes. Product Cloud content, brand data and Made in Europe links can be updated later via the existing seller/owner flows.</p>",
"<p>Ja. Product-Cloud-Inhalte, Markendaten und Made-in-Europe-Verknüpfungen können Sie später über die bestehenden Seller-/Eigentümer-Flows aktualisieren.</p>",
"<p>Oui. Le contenu Product Cloud, les données de marque et les liens Made in Europe peuvent être mis à jour plus tard via les parcours vendeur/propriétaire existants.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_7",
            icon: "none",
            title: L(
"Wat kost verkopen via EuropMade?",
"What does selling on EuropMade cost?",
"Was kostet der Verkauf über EuropMade?",
"Que coûte la vente via EuropMade ?"
),
            body: L(
"<p>Er geldt een vaste verkoopcommissie van 10%. Daarnaast kun je optioneel investeren in zichtbaarheid via banners, sponsored products en gerelateerde marketing. Er is geen MVP-abonnement verplicht volgens het financiële model.</p>",
"<p>There is a fixed sales commission of 10%. You can optionally invest in visibility via banners, sponsored products and related marketing. No MVP subscription is required under the financial model.</p>",
"<p>Es gilt eine feste Verkaufsprovision von 10 %. Optional können Sie in Sichtbarkeit über Banner, Sponsored Products und verwandtes Marketing investieren. Laut Finanzmodell ist kein MVP-Abo erforderlich.</p>",
"<p>Il y a une commission de vente fixe de 10 %. Vous pouvez investir optionnellement dans la visibilité via bannières, produits sponsorisés et marketing associé. Aucun abonnement MVP n'est requis selon le modèle financier.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_14",
            icon: "none",
            title: L(
"Wat gebeurt er als ik niets verkoop?",
"What happens if I don't sell anything?",
"Was passiert, wenn ich nichts verkaufe?",
"Que se passe-t-il si je ne vends rien ?"
),
            body: L(
"<p>Zonder verkoop betaal je geen verkoopcommissie. Optionele advertenties (banners/sponsored) zijn apart en alleen van toepassing als je die inzet.</p>",
"<p>Without sales you pay no sales commission. Optional ads (banners/sponsored) are separate and only apply if you use them.</p>",
"<p>Ohne Verkauf zahlen Sie keine Verkaufsprovision. Optionale Werbung (Banner/Sponsored) ist separat und gilt nur, wenn Sie sie nutzen.</p>",
"<p>Sans vente, vous ne payez pas de commission. Les pubs optionnelles (bannières/sponsorisé) sont séparées et ne s'appliquent que si vous les utilisez.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_2",
            icon: "none",
            title: L(
"Kan ik vanuit één account in meerdere Europese landen verkopen?",
"Can I sell in multiple European countries from one account?",
"Kann ich von einem Konto aus in mehreren europäischen Ländern verkaufen?",
"Puis-je vendre dans plusieurs pays européens depuis un seul compte ?"
),
            body: L(
"<p>Ja, dat is de kernvisie: één EuropMade-partnerschap en één productcatalogus om toe te bouwen naar bereik in meerdere EU-markten. Beschikbaarheid per land hangt af van product-, seller- en marktconfiguratie.</p>",
"<p>Yes — that is the core vision: one EuropMade partnership and one product catalogue to build toward reach in multiple EU markets. Availability per country depends on product, seller and market configuration.</p>",
"<p>Ja — das ist die Kernvision: eine EuropMade-Partnerschaft und ein Produktkatalog, um Reichweite in mehreren EU-Märkten aufzubauen. Die Verfügbarkeit pro Land hängt von Produkt-, Seller- und Marktkonfiguration ab.</p>",
"<p>Oui — c'est la vision centrale : un partenariat EuropMade et un catalogue pour construire une portée sur plusieurs marchés de l'UE. La disponibilité par pays dépend de la configuration produit, vendeur et marché.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_1",
            icon: "none",
            title: L(
"Voor wie is EuropMade?",
"Who is EuropMade for?",
"Für wen ist EuropMade?",
"Pour qui est EuropMade ?"
),
            body: L(
"<p>Voor Europese producenten, merkeigenaren en verkopers die producten met Europese productie en transparante herkomst willen aanbieden aan consumenten.</p>",
"<p>For European producers, brand owners and sellers who want to offer products with European production and transparent origin to consumers.</p>",
"<p>Für europäische Produzenten, Markeninhaber und Verkäufer, die Produkte mit europäischer Produktion und transparenter Herkunft an Verbraucher anbieten wollen.</p>",
"<p>Pour les producteurs, propriétaires de marques et vendeurs européens qui veulent proposer aux consommateurs des produits à production européenne et origine transparente.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_5",
            icon: "none",
            title: L(
"Kan ik mijn merkverhaal tonen?",
"Can I show my brand story?",
"Kann ich meine Markengeschichte zeigen?",
"Puis-je montrer l'histoire de ma marque ?"
),
            body: L(
"<p>Ja. Merkpagina’s kunnen merkverhaal, marktcontent en productiefaciliteiten tonen naast je producten.</p>",
"<p>Yes. Brand pages can show brand story, market content and production facilities alongside your products.</p>",
"<p>Ja. Markenseiten können Markengeschichte, Marktinhalt und Produktionsstätten neben Ihren Produkten zeigen.</p>",
"<p>Oui. Les pages marque peuvent afficher l'histoire de marque, le contenu marché et les sites de production à côté de vos produits.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          },
          {
            id: "ws_faq_8",
            icon: "none",
            title: L(
"Hoe werkt advertentiepromotie?",
"How does advertising promotion work?",
"Wie funktioniert Werbe-Promotion?",
"Comment fonctionne la promotion publicitaire ?"
),
            body: L(
"<p>In het seller-marketinggedeelte kun je onder meer banners en sponsored products beheren. Affiliate werkt via een apart partnerprogramma. Het introductieprogramma met advertentietegoed geldt onder de voorwaarden van dat programma.</p>",
"<p>In the seller marketing area you can manage banners and sponsored products, among other things. Affiliate runs via a separate partner programme. The introduction programme with advertising credit applies under that programme’s terms.</p>",
"<p>Im Seller-Marketingbereich können Sie u. a. Banner und Sponsored Products verwalten. Affiliate läuft über ein separates Partnerprogramm. Das Einführungsprogramm mit Werbeguthaben gilt unter den Bedingungen dieses Programms.</p>",
"<p>Dans l'espace marketing vendeur, vous pouvez notamment gérer bannières et produits sponsorisés. L'affiliation passe par un programme partenaire séparé. Le programme d'introduction avec crédit publicitaire s'applique selon ses conditions.</p>"
),
            href: "",
            value: emptyLocalized(),
            detail: emptyLocalized(),
          }
        ],
        ctas: [],
        stages: [],
      },
      {
        id: "ws_final",
        key: "cta_group",
        visible: true,
        sortOrder: 150,
        title: L(
"Europa heeft duizenden sterke producenten. Wij bouwen het platform om ze samen te brengen.",
"Europe has thousands of strong producers. We are building the platform to bring them together.",
"Europa hat Tausende starker Produzenten. Wir bauen die Plattform, um sie zusammenzubringen.",
"L'Europe compte des milliers de producteurs solides. Nous construisons la plateforme pour les réunir."
),
        body: L(
"<p>Sluit je aan als Europese producent, merk of verkoper — en bouw mee aan één marketplace waarop herkomst en kwaliteit zichtbaar meetellen.</p>",
"<p>Join as a European producer, brand or seller — and help build one marketplace where origin and quality visibly count.</p>",
"<p>Werden Sie europäischer Produzent, Marke oder Verkäufer — und bauen Sie mit an einem Marketplace, auf dem Herkunft und Qualität sichtbar zählen.</p>",
"<p>Rejoignez-nous comme producteur, marque ou vendeur européen — et construisez une marketplace où l'origine et la qualité comptent de façon visible.</p>"
),
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        stages: [],
        ctas: [
          { id: "ws_final_cta", label: L(
"Start verkopen via EuropMade",
"Start selling on EuropMade",
"Verkauf über EuropMade starten",
"Commencer à vendre via EuropMade"
), href: "/register?redirect=/partner-onboarding", variant: "primary" },
          { id: "ws_final_login", label: L(
"Ik ben al partner — inloggen",
"I'm already a partner — sign in",
"Ich bin bereits Partner — anmelden",
"Je suis déjà partenaire — connexion"
), href: "/login?redirect=/partner-onboarding", variant: "secondary" },
          { id: "ws_final_mie", label: L(
"Bekijk Made in Europe",
"View Made in Europe",
"Made in Europe ansehen",
"Voir Made in Europe"
), href: "/made-in-europe", variant: "link" },
        ],
      },
    ],
  }
}


const SIMPLE: Record<
  string,
  { title: LocalizedCms; body: LocalizedCms }
> = {
  over: { title: ABOUT_TITLE, body: ABOUT_BODY },
  klantenservice: { title: SUPPORT_TITLE, body: SUPPORT_BODY },
  "werken-bij": { title: CAREERS_TITLE, body: CAREERS_BODY },
  affiliate: { title: AFF_TITLE, body: AFF_BODY },
  verified: { title: VERIFIED_TITLE, body: VERIFIED_BODY },
  duurzaam: { title: DUURZAAM_TITLE, body: DUURZAAM_BODY },
}

const STRUCTURED_SEEDS: Record<
  string,
  () => { title: LocalizedCms; body: LocalizedCms; document: CmsPageDocument }
> = {
  "made-in-europe": () => {
    const document = seedMadeInEurope()
    const hero = document.sections.find((s) => s.key === "hero")
    return {
      title: hero?.title ?? emptyLocalized(),
      body: emptyLocalized(),
      document,
    }
  },
  "waarom-kopen": () => {
    const document = seedWaaromKopen()
    const hero = document.sections.find((s) => s.key === "hero")
    return {
      title: hero?.title ?? emptyLocalized(),
      body: emptyLocalized(),
      document,
    }
  },
  "waarom-verkopen": () => {
    const document = seedWaaromVerkopen()
    const hero = document.sections.find((s) => s.key === "hero")
    return {
      title: hero?.title ?? emptyLocalized(),
      body: emptyLocalized(),
      document,
    }
  },
}

export function seedDocumentForFixedSlug(slug: string): {
  title: LocalizedCms
  body: LocalizedCms
  document: CmsPageDocument
} | null {
  const key = slug.trim().toLowerCase()
  if (STRUCTURED_SEEDS[key]) return STRUCTURED_SEEDS[key]()
  if (key.startsWith("juridisch/")) {
    const legalSlug = key.slice("juridisch/".length)
    const doc = LEGAL.find((d) => d.slug === legalSlug)
    if (!doc) return null
    const body = paragraphsHtml(doc.paragraphs)
    return {
      title: doc.title,
      body,
      document: pageDoc(doc.title, body),
    }
  }
  const simple = SIMPLE[key]
  if (!simple) return null
  return {
    title: simple.title,
    body: simple.body,
    document: pageDoc(simple.title, simple.body),
  }
}
