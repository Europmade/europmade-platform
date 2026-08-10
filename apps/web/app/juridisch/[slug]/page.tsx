import type { Metadata } from "next"
import { ContentPage } from "../../_components/marketplace/content-page"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { L, pickLocalized, type LocalizedString } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"

type LegalDoc = {
  slug: string
  title: LocalizedString
  paragraphs: LocalizedString[]
}

const DOCS: LegalDoc[] = [
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
    slug: "betaalmethoden",
    title: L(
      "Betaalmethoden",
      "Payment methods",
      "Zahlungsmethoden",
      "Moyens de paiement"
    ),
    paragraphs: [
      L(
        "Beschikbare betaalmethoden (zoals iDEAL, creditcard of PayPal) worden bij checkout getoond via de aangesloten payment service provider.",
        "Available payment methods (such as iDEAL, credit card or PayPal) are shown at checkout via the connected payment service provider.",
        "Verfügbare Zahlungsmethoden (z. B. iDEAL, Kreditkarte oder PayPal) werden beim Checkout über den angebundenen Payment Service Provider angezeigt.",
        "Les moyens de paiement disponibles (comme iDEAL, carte bancaire ou PayPal) sont affichés au paiement via le prestataire de paiement connecté."
      ),
      L(
        "Betaling verloopt veilig via de PSP; EuropMade slaat geen volledige kaartgegevens op.",
        "Payment is processed securely via the PSP; EuropMade does not store full card details.",
        "Die Zahlung erfolgt sicher über den PSP; EuropMade speichert keine vollständigen Kartendaten.",
        "Le paiement est traité de façon sécurisée via le PSP ; EuropMade ne stocke pas les données complètes de carte."
      ),
      L(
        "Bij mislukte betaling wordt de bestelling niet bevestigd.",
        "If payment fails, the order is not confirmed.",
        "Bei fehlgeschlagener Zahlung wird die Bestellung nicht bestätigt.",
        "En cas d’échec du paiement, la commande n’est pas confirmée."
      ),
    ],
  },
  {
    slug: "disclaimer",
    title: L(
      "Disclaimer",
      "Disclaimer",
      "Haftungsausschluss",
      "Avertissement"
    ),
    paragraphs: [
      L(
        "Hoewel we streven naar correcte productinformatie (inclusief Verified™-controles), kunnen fouten of wijzigingen voorkomen.",
        "Although we aim for accurate product information (including Verified™ checks), errors or changes may occur.",
        "Obwohl wir uns um korrekte Produktinformationen bemühen (einschließlich Verified™-Prüfungen), können Fehler oder Änderungen vorkommen.",
        "Bien que nous visons des informations produit exactes (y compris les contrôles Verified™), des erreurs ou modifications peuvent survenir."
      ),
      L(
        "EuropMade is niet aansprakelijk voor de inhoud van externe websites waarnaar wordt verwezen, noch voor handelingen van onafhankelijke verkopers buiten het platform om.",
        "EuropMade is not liable for the content of linked external websites, nor for actions of independent sellers outside the platform.",
        "EuropMade haftet nicht für Inhalte verlinkter externer Websites und nicht für Handlungen unabhängiger Verkäufer außerhalb der Plattform.",
        "EuropMade n’est pas responsable du contenu des sites externes liés, ni des actes de vendeurs indépendants hors plateforme."
      ),
      L(
        "Prijzen en beschikbaarheid kunnen wijzigen tot het moment van orderbevestiging.",
        "Prices and availability may change until the moment of order confirmation.",
        "Preise und Verfügbarkeit können sich bis zur Auftragsbestätigung ändern.",
        "Les prix et la disponibilité peuvent changer jusqu’à la confirmation de commande."
      ),
    ],
  },
  {
    slug: "privacybeleid",
    title: L(
      "Privacybeleid",
      "Privacy policy",
      "Datenschutz",
      "Politique de confidentialité"
    ),
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
        "Les images produit et contenus de marque restent la propriété des titulaires de droits concernés (producteurs/détaillants)."
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
      L(
        "Claim garantiezaken via de verkoper (berichten/retourflow) of de producent wanneer dat zo is aangegeven.",
        "Claim warranty matters via the seller (messages/return flow) or the producer when indicated.",
        "Garantiefälle geltend machen über den Verkäufer (Nachrichten/Retourflow) oder den Produzenten, wenn so angegeben.",
        "Réclamez les garanties via le vendeur (messages/flux de retour) ou le producteur lorsque cela est indiqué."
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
      L(
        "Gedeeltelijke terugbetalingen kunnen voorkomen bij deelleveringen of gedeeltelijke retouren.",
        "Partial refunds may occur with partial deliveries or partial returns.",
        "Teilrückerstattungen können bei Teillieferungen oder Teilretouren vorkommen.",
        "Des remboursements partiels peuvent survenir en cas de livraisons ou retours partiels."
      ),
      L(
        "Platformkosten of niet-restitueerbare verzendkosten kunnen volgens de voorwaarden van de verkoper buiten de terugbetaling vallen.",
        "Platform fees or non-refundable shipping costs may fall outside the refund under the seller’s terms.",
        "Plattformgebühren oder nicht erstattungsfähige Versandkosten können laut Verkäuferbedingungen außerhalb der Rückerstattung liegen.",
        "Les frais de plateforme ou frais d’expédition non remboursables peuvent être exclus du remboursement selon les conditions du vendeur."
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
]

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const doc = DOCS.find((d) => d.slug === slug)
  if (!doc) return { title: `${t("legalIndexTitle", locale)} — EuropMade` }
  return { title: `${pickLocalized(doc.title, locale)} — EuropMade` }
}

export default async function JuridischDocPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const doc = DOCS.find((d) => d.slug === slug)
  if (!doc) {
    return (
      <ContentPage title={t("legalNotFoundTitle", locale)}>
        <p>{t("legalNotFoundBody", locale)}</p>
      </ContentPage>
    )
  }
  const title = pickLocalized(doc.title, locale)
  return (
    <ContentPage title={title}>
      {doc.paragraphs.map((p) => {
        const text = pickLocalized(p, locale)
        return <p key={text.slice(0, 40)}>{text}</p>
      })}
    </ContentPage>
  )
}
