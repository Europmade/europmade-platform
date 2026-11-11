/**
 * Vult de bestaande V2-concepten van Huishouden, Inbouwapparatuur en Vaatwassers.
 * Lege velden worden aangevuld. Gevulde velden, blokken en published_document blijven staan.
 * Er wordt niets gepubliceerd.
 */
import { readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { prepareCategoryCmsWrite } from "../modules/cms/category-cms-write.ts"
import type { CategoryCmsProfile } from "@europmade/utils"

const require = createRequire(import.meta.url)
const pgRoot = new URL("../../../../node_modules/.pnpm/", import.meta.url)
const pgFolder = readdirSync(pgRoot).filter((name) => name.startsWith("pg@")).sort().at(-1)
if (!pgFolder) throw new Error("De lokale Postgres-client ontbreekt.")
const pg = require(fileURLToPath(new URL(`${pgFolder}/node_modules/pg`, pgRoot))) as {
  Client: new (config: { connectionString: string; connectionTimeoutMillis: number }) => {
    connect: () => Promise<void>
    query: (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
    end: () => Promise<void>
  }
}

type Loc = { nl: string; en: string; de: string; fr: string }
type Block = Record<string, unknown>
type Doc = {
  schema_version: number
  profile: CategoryCmsProfile
  blocks: Block[]
  seo: { title: Loc; meta_description: Loc; h1: Loc; structured_data_type: "CollectionPage" }
  block_meta: Record<string, unknown>
}

const DISHWASHER_ID = "prod_01M1GFGZVEKFBWYZ2251ZPSECH"
const KITCHEN_IMAGE = "/static/1788336083367-1200x675.jpg"
const PRODUCT_IMAGE = "/static/1788509822754-bosch-smd8tcx04e-serie-8-inbouw-vaatwasser-800.webp"

function databaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim()
  if (fromEnv) return fromEnv
  try {
    const env = readFileSync(new URL("../../.env", import.meta.url), "utf8")
    const line = env.split(/\r?\n/).find((row) => row.startsWith("DATABASE_URL="))
    if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "")
  } catch {
    // De lokale ontwikkeldatabase is de terugval.
  }
  return "postgres://europmade:REDACTED_DATABASE_PASSWORD@127.0.0.1:5432/europmade"
}

function L(nl: string, en: string, de: string, fr: string): Loc {
  return { nl, en, de, fr }
}

function textEmpty(value: unknown): boolean {
  if (!value || typeof value !== "object") return true
  return ["nl", "en", "de", "fr"].every((key) => {
    const item = (value as Record<string, unknown>)[key]
    return typeof item !== "string" || item.trim() === ""
  })
}

function fillText(current: unknown, next: Loc): Loc {
  return textEmpty(current) ? next : (current as Loc)
}

function blockOf(doc: Doc, type: string): Block | undefined {
  return doc.blocks.find((block) => block.type === type)
}

function insertAfter(doc: Doc, afterType: string, block: Block) {
  if (doc.blocks.some((item) => item.type === block.type)) return
  const index = doc.blocks.findIndex((item) => item.type === afterType)
  if (index < 0) doc.blocks.push(block)
  else doc.blocks.splice(index + 1, 0, block)
}

function adPositions(
  slug: string,
  keys: Array<"below_hero" | "between_content" | "above_product_grid" | "below_product_grid">
) {
  const labels: Record<string, string> = {
    below_hero: "Banner onder de USP's",
    between_content: "Banner tussen de content",
    above_product_grid: "Banner bij de producten",
    below_product_grid: "Banner onder de producten",
  }
  return keys.map((position, sort) => ({
    id: `ad_${slug}_${position}`,
    position,
    label: labels[position],
    source: "campaign_or_banner",
    banner_id: null,
    sort,
  }))
}

function usp(slug: string, profile: string, index: number, title: Loc, body: Loc) {
  return {
    id: `usp_${slug}_${profile}_${index}`,
    icon_key: "",
    title,
    body,
  }
}

const imageAlt = L(
  "Bosch inbouwvaatwasser met geopende manden in een keuken",
  "Bosch built-in dishwasher with open racks in a kitchen",
  "Bosch-Einbaugeschirrspüler mit offenen Körben in einer Küche",
  "Lave-vaisselle encastrable Bosch avec paniers ouverts dans une cuisine"
)

function fillHero(block: Block, intro: Loc, primary: Loc, primaryHref: string, secondary: Loc, secondaryHref: string, image: string | null) {
  block.title = fillText(block.title, L("", "", "", ""))
  block.intro = fillText(block.intro, intro)
  block.primary_cta_label = fillText(block.primary_cta_label, primary)
  if (!String(block.primary_cta_href ?? "").trim()) block.primary_cta_href = primaryHref
  block.secondary_cta_label = fillText(block.secondary_cta_label, secondary)
  if (!String(block.secondary_cta_href ?? "").trim()) block.secondary_cta_href = secondaryHref
  if (image && !String(block.image_url ?? "").trim()) {
    block.image_url = image
    block.image_alt = fillText(block.image_alt, imageAlt)
    block.image_frame = block.image_frame ?? { ratio: "16:9", fit: "cover", position_x: "center", position_y: "center" }
  }
  if (image && !String(block.mobile_image_url ?? "").trim()) {
    block.mobile_image_url = PRODUCT_IMAGE
    block.mobile_image_alt = fillText(block.mobile_image_alt, imageAlt)
    block.mobile_image_frame = block.mobile_image_frame ?? { ratio: "3:2", fit: "contain", position_x: "center", position_y: "center" }
  }
  block.presentation = {
    ...(typeof block.presentation === "object" && block.presentation ? block.presentation : {}),
    image_position: "right",
    button_style: "solid",
    align: "left",
  }
}

function fillUsps(block: Block, slug: string, profile: string, slots: Array<[Loc, Loc]>) {
  const current = Array.isArray(block.slots) ? block.slots : []
  block.slots = slots.map(([title, body], index) => {
    const previous = (current[index] ?? {}) as Block
    const filled = !textEmpty(previous.title) || !textEmpty(previous.body)
    return filled
      ? previous
      : usp(slug, profile, index, title, body)
  })
  block.presentation = {
    ...(typeof block.presentation === "object" && block.presentation ? block.presentation : {}),
    columns: 4,
  }
}

function fillHuishouden(doc: Doc) {
  const hero = blockOf(doc, "hero")
  if (hero) {
    fillHero(
      hero,
      L(
        "Apparaten en hulpmiddelen voor een huis dat soepel draait, van inbouwapparatuur tot wassen en koffie. Ontdek de productgroepen en de aanbiedingen die echt beschikbaar zijn.",
        "Appliances and tools for a home that runs smoothly, from built-in appliances to laundry and coffee. Discover the product groups and the offers that are actually available.",
        "Geräte und Hilfsmittel für einen Haushalt, der rundläuft: von Einbaugeräten bis Waschen und Kaffee. Entdecken Sie die Produktgruppen und die Angebote, die wirklich verfügbar sind.",
        "Des appareils pour une maison qui tourne bien, de l'encastrable au linge et au café. Découvrez les groupes de produits et les offres réellement disponibles."
      ),
      L("Ontdek de categorieën", "Discover the categories", "Kategorien entdecken", "Découvrir les catégories"),
      "#blk_huishouden_level_1_subcategory_tiles",
      L("Hulp kiezen", "Help me choose", "Hilfe bei der Wahl", "Aide au choix"),
      "/categorie/inbouwapparatuur",
      null
    )
  }
  const uspBar = blockOf(doc, "usp_bar")
  if (uspBar) {
    fillUsps(uspBar, "huishouden", "level_1", [
      [L("Europese merken", "European brands", "Europäische Marken", "Marques européennes"), L("De merkenrij toont alleen merken met een aanbod in deze categorie.", "The brand row shows only brands with an offer in this category.", "Die Markenzeile zeigt nur Marken mit einem Angebot in dieser Kategorie.", "La rangée de marques n'affiche que les marques avec une offre dans cette catégorie.")],
      [L("Betrouwbare merken", "Reliable brands", "Zuverlässige Marken", "Marques fiables"), L("Productinformatie komt uit Product Cloud. Een herkomstzin verschijnt alleen bij een vastgelegd productieland.", "Product information comes from Product Cloud. An origin line appears only when a production country is stored.", "Produktinformationen kommen aus der Product Cloud. Eine Herkunftsangabe erscheint nur bei einem gespeicherten Herstellungsland.", "Les informations produit viennent du Product Cloud. Une origine n'apparaît que si le pays de fabrication est enregistré.")],
      [L("Duidelijke aanbiedingen", "Clear offers", "Klare Angebote", "Offres claires"), L("Prijs, voorraad en levertijd komen van de verkoper.", "Price, stock and delivery time come from the seller.", "Preis, Bestand und Lieferzeit kommen vom Verkäufer.", "Le prix, le stock et le délai viennent du vendeur.")],
      [L("Service en garantie", "Service and warranty", "Service und Garantie", "Service et garantie"), L("De voorwaarden horen bij de aanbieding, niet bij een algemene belofte.", "The terms belong to the offer, not to a general promise.", "Die Bedingungen gehören zum Angebot, nicht zu einem allgemeinen Versprechen.", "Les conditions appartiennent à l'offre, pas à une promesse générale.")],
    ])
  }
  const tiles = blockOf(doc, "subcategory_tiles")
  if (tiles) tiles.title = fillText(tiles.title, L("Ontdek onze categorieën binnen Huishouden", "Discover our categories in Household", "Entdecken Sie unsere Kategorien in Haushalt", "Découvrez nos catégories dans Maison"))
  const products = blockOf(doc, "product_carousel")
  if (products) {
    products.title = fillText(products.title, L("Populair in Huishouden", "Popular in Household", "Beliebt in Haushalt", "Populaire dans Maison"))
    if (!products.limit) products.limit = 4
  }
  const brands = blockOf(doc, "brand_overview")
  if (brands) brands.title = fillText(brands.title, L("Europese merken in Huishouden", "European brands in Household", "Europäische Marken in Haushalt", "Marques européennes dans Maison"))
  const why = blockOf(doc, "why_europmade")
  if (why) {
    why.title = fillText(why.title, L("Waarom EuropMade?", "Why EuropMade?", "Warum EuropMade?", "Pourquoi EuropMade ?"))
    why.body = fillText(why.body, L(
      "EuropMade verkoopt zelf geen producten. Je vergelijkt aanbiedingen van verkopers. Prijs, voorraad en levertijd komen uit het aanbod. Productinformatie komt uit Product Cloud.",
      "EuropMade does not sell products itself. You compare offers from sellers. Price, stock and delivery time come from the offer. Product information comes from Product Cloud.",
      "EuropMade verkauft selbst keine Produkte. Sie vergleichen Angebote von Verkäufern. Preis, Bestand und Lieferzeit kommen aus dem Angebot. Produktinformationen kommen aus der Product Cloud.",
      "EuropMade ne vend pas lui-même de produits. Vous comparez les offres des vendeurs. Le prix, le stock et le délai viennent de l'offre. Les informations produit viennent du Product Cloud."
    ))
  }
  insertAfter(doc, "usp_bar", {
    id: "blk_huishouden_level_1_ad_slot",
    type: "ad_slot",
    visible: true,
    slot_id: "",
    placement: "category",
    positions: adPositions("huishouden", ["below_hero", "between_content", "below_product_grid"]),
  })
  insertAfter(doc, "why_europmade", {
    id: "blk_huishouden_level_1_faq",
    type: "faq",
    visible: true,
    title: L("Veelgestelde vragen", "Frequently asked questions", "Häufige Fragen", "Questions fréquentes"),
    items: [
      item("hh-faq-1", L("Verkoopt EuropMade zelf deze producten?", "Does EuropMade sell these products itself?", "Verkauft EuropMade diese Produkte selbst?", "EuropMade vend-il lui-même ces produits ?"), L("Nee. De aanbieding, de prijs en de voorraad komen van een verkoper.", "No. The offer, price and stock come from a seller.", "Nein. Angebot, Preis und Bestand kommen von einem Verkäufer.", "Non. L'offre, le prix et le stock viennent d'un vendeur.")),
      item("hh-faq-2", L("Waarom zie ik niet alle voorbeeldproducten uit het ontwerp?", "Why do I not see every sample product from the design?", "Warum sehe ich nicht alle Beispielprodukte aus dem Entwurf?", "Pourquoi ne vois-je pas tous les produits d'exemple du design ?"), L("Alleen producten met een echte, verkoopbare aanbieding worden getoond.", "Only products with a real, sellable offer are shown.", "Es werden nur Produkte mit einem echten, verkaufbaren Angebot gezeigt.", "Seuls les produits avec une offre réelle et vendable sont affichés.")),
      item("hh-faq-3", L("Wanneer staat er dat een product in Europa is gemaakt?", "When does a product say it was made in Europe?", "Wann steht, dass ein Produkt in Europa hergestellt wurde?", "Quand indique-t-on qu'un produit est fabriqué en Europe ?"), L("Alleen als het productieland in Product Cloud is vastgelegd. De categorie doet die uitspraak niet voor het hele assortiment.", "Only when the production country is stored in Product Cloud. The category does not make that claim for the whole assortment.", "Nur wenn das Herstellungsland in der Product Cloud gespeichert ist. Die Kategorie behauptet das nicht für das ganze Sortiment.", "Seulement si le pays de fabrication est enregistré dans le Product Cloud. La catégorie ne l'affirme pas pour tout l'assortiment.")),
    ],
  })
  insertAfter(doc, "faq", {
    id: "blk_huishouden_level_1_seo_content",
    type: "seo_content",
    visible: true,
    title: L("Huishouden op EuropMade", "Household on EuropMade", "Haushalt auf EuropMade", "Maison sur EuropMade"),
    body: L(
      "Huishouden is de hoofdcategorie om productgroepen te ontdekken. Je vindt hier geen filters en geen volledige productlijst. Vanuit de tegels ga je naar een subcategorie of naar een specifieke productgroep.",
      "Household is the main category for discovering product groups. There are no filters and no full product list here. From the tiles you go to a subcategory or a specific product group.",
      "Haushalt ist die Hauptkategorie, um Produktgruppen zu entdecken. Hier gibt es keine Filter und keine vollständige Produktliste. Über die Kacheln gelangen Sie zu einer Unterkategorie oder einer bestimmten Produktgruppe.",
      "Maison est la catégorie principale pour découvrir des groupes de produits. Il n'y a ici ni filtres ni liste complète. Depuis les tuiles, vous passez à une sous-catégorie ou à un groupe précis."
    ),
  })
  doc.seo.title = fillText(doc.seo.title, L("Huishouden", "Household", "Haushalt", "Maison"))
  doc.seo.h1 = fillText(doc.seo.h1, L("Huishouden", "Household", "Haushalt", "Maison"))
  doc.seo.meta_description = fillText(doc.seo.meta_description, L(
    "Ontdek de productgroepen binnen Huishouden en bekijk aanbiedingen van verkopers op EuropMade.",
    "Discover the product groups in Household and view seller offers on EuropMade.",
    "Entdecken Sie die Produktgruppen in Haushalt und sehen Sie Verkäuferangebote auf EuropMade.",
    "Découvrez les groupes de produits dans Maison et consultez les offres des vendeurs sur EuropMade."
  ))
}

function fillInbouw(doc: Doc) {
  const hero = blockOf(doc, "hero")
  if (hero) {
    fillHero(
      hero,
      L(
        "Kies een productgroep om inbouwapparatuur te bekijken. De tegels openen de categorieën die in Product Cloud staan.",
        "Choose a product group to browse built-in appliances. The tiles open the categories that exist in Product Cloud.",
        "Wählen Sie eine Produktgruppe, um Einbaugeräte anzusehen. Die Kacheln öffnen die Kategorien, die in der Product Cloud stehen.",
        "Choisissez un groupe pour parcourir l'encastrable. Les tuiles ouvrent les catégories présentes dans le Product Cloud."
      ),
      L("Bekijk de productgroepen", "View the product groups", "Produktgruppen ansehen", "Voir les groupes"),
      "#blk_inbouwapparatuur_level_2_product_group_tiles",
      L("Keuzehulp", "Choice helper", "Auswahlhilfe", "Aide au choix"),
      "#blk_inbouwapparatuur_level_2_choice_assistant_cta",
      null
    )
  }
  const uspBar = blockOf(doc, "usp_bar")
  if (uspBar) {
    fillUsps(uspBar, "inbouwapparatuur", "level_2", [
      [L("Echte productgroepen", "Real product groups", "Echte Produktgruppen", "Groupes réels"), L("De tegels zijn de subcategorieën die in Product Cloud bestaan.", "The tiles are the subcategories that exist in Product Cloud.", "Die Kacheln sind die Unterkategorien, die in der Product Cloud existieren.", "Les tuiles sont les sous-catégories qui existent dans le Product Cloud.")],
      [L("Europese merken", "European brands", "Europäische Marken", "Marques européennes"), L("Alleen merken met een aanbod in deze categorie worden getoond.", "Only brands with an offer in this category are shown.", "Es werden nur Marken mit einem Angebot in dieser Kategorie gezeigt.", "Seules les marques avec une offre dans cette catégorie sont affichées.")],
      [L("Advies op maat", "Advice that fits", "Passende Beratung", "Un conseil adapté"), L("De keuzehulp stelt alleen een vraag als minstens twee verkoopbare producten die specificatie hebben.", "The choice helper asks a question only when at least two sellable products have that specification.", "Die Auswahlhilfe stellt nur eine Frage, wenn mindestens zwei verkaufbare Produkte diese Angabe haben.", "L'aide au choix ne pose une question que si au moins deux produits vendables ont cette caractéristique.")],
      [L("Geen verzonnen cijfers", "No invented figures", "Keine erfundenen Zahlen", "Pas de chiffres inventés"), L("Energie, geluid en maten verschijnen alleen als ze bij het product zijn ingevuld.", "Energy, noise and dimensions appear only when they are filled in on the product.", "Energie, Geräusch und Maße erscheinen nur, wenn sie beim Produkt ausgefüllt sind.", "L'énergie, le bruit et les dimensions n'apparaissent que s'ils sont renseignés sur le produit.")],
    ])
  }
  const tiles = blockOf(doc, "product_group_tiles")
  if (tiles) {
    tiles.title = fillText(tiles.title, L("Ontdek de productgroepen", "Discover the product groups", "Produktgruppen entdecken", "Découvrir les groupes"))
    if (!Array.isArray(tiles.include_slugs) || tiles.include_slugs.length === 0) {
      tiles.include_slugs = [
        "ovens-en-magnetrons",
        "vaatwassers",
        "koelkasten-en-vriezers",
        "kookplaten-fornuizen-en-afzuigkappen",
      ]
    }
    tiles.presentation = {
      ...(typeof tiles.presentation === "object" && tiles.presentation ? tiles.presentation : {}),
      columns: 4,
    }
  }
  const choice = blockOf(doc, "choice_assistant_cta")
  if (choice) {
    choice.title = fillText(choice.title, L("Welke inbouwapparatuur past bij jouw keuken?", "Which built-in appliance fits your kitchen?", "Welches Einbaugerät passt zu Ihrer Küche?", "Quel appareil encastrable convient à votre cuisine ?"))
    choice.body = fillText(choice.body, L(
      "Beantwoord vragen over specificaties die bij de producten in deze categorie zijn ingevuld.",
      "Answer questions about specifications filled in on the products in this category.",
      "Beantworten Sie Fragen zu Angaben, die bei den Produkten in dieser Kategorie ausgefüllt sind.",
      "Répondez à des questions sur les caractéristiques renseignées pour les produits de cette catégorie."
    ))
    choice.cta_label = fillText(choice.cta_label, L("Start de keuzehulp", "Start the choice helper", "Auswahlhilfe starten", "Démarrer l'aide au choix"))
    if (!String(choice.href ?? "").trim()) choice.href = "#blk_inbouwapparatuur_level_2_choice_assistant_cta"
    if (!Array.isArray(choice.question_codes)) choice.question_codes = []
  }
  const advice = blockOf(doc, "advice_compare")
  if (advice && (!Array.isArray(advice.items) || advice.items.length === 0)) {
    advice.title = fillText(advice.title, L("Advies en vergelijken", "Advice and comparison", "Beratung und Vergleich", "Conseil et comparaison"))
    advice.items = [
      adviceItem("ib-advice-ovens", L("Ovens en magnetrons", "Ovens and microwaves", "Backöfen und Mikrowellen", "Fours et micro-ondes"), L("Ovens en magnetrons staan in één productgroep. Open de categorie om de producten en aanbiedingen te zien die daar zijn opgenomen.", "Ovens and microwaves are one product group. Open the category to see the products and offers included there.", "Backöfen und Mikrowellen bilden eine Produktgruppe. Öffnen Sie die Kategorie, um die Produkte und Angebote zu sehen, die dort aufgenommen sind.", "Les fours et micro-ondes forment un seul groupe. Ouvrez la catégorie pour voir les produits et les offres qui y figurent."), "/categorie/ovens-en-magnetrons"),
      adviceItem("ib-advice-dish", L("Vaatwassers", "Dishwashers", "Geschirrspüler", "Lave-vaisselle"), L("Vaatwassers is een eigen categorie. Daar vergelijk je modellen en bekijk je de aanbieding van de verkoper.", "Dishwashers is its own category. There you compare models and view the seller's offer.", "Geschirrspüler ist eine eigene Kategorie. Dort vergleichen Sie Modelle und sehen das Angebot des Verkäufers.", "Le lave-vaisselle est une catégorie à part. Vous y comparez les modèles et consultez l'offre du vendeur."), "/categorie/vaatwassers"),
      adviceItem("ib-advice-cold", L("Koelkasten en vriezers", "Fridges and freezers", "Kühl- und Gefrierschränke", "Réfrigérateurs et congélateurs"), L("Koelkasten en vriezers horen hier bij elkaar in één productgroep. Open de categorie om het aanbod te bekijken.", "Fridges and freezers belong together here in one product group. Open the category to view the assortment.", "Kühl- und Gefrierschränke gehören hier in einer Produktgruppe zusammen. Öffnen Sie die Kategorie, um das Angebot anzusehen.", "Les réfrigérateurs et congélateurs sont réunis ici dans un seul groupe. Ouvrez la catégorie pour voir l'offre."), "/categorie/koelkasten-en-vriezers"),
    ]
  }
  insertAfter(doc, "usp_bar", {
    id: "blk_inbouwapparatuur_level_2_ad_slot",
    type: "ad_slot",
    visible: true,
    slot_id: "",
    placement: "category",
    positions: adPositions("inbouwapparatuur", ["below_hero", "between_content"]),
  })
  insertAfter(doc, "advice_compare", {
    id: "blk_inbouwapparatuur_level_2_brand_overview",
    type: "brand_overview",
    visible: true,
    title: L("Europese merken in Inbouwapparatuur", "European brands in Built-in appliances", "Europäische Marken in Einbaugeräte", "Marques européennes dans Encastrable"),
    max_items: 8,
    allow_sponsored: false,
  })
  insertAfter(doc, "brand_overview", {
    id: "blk_inbouwapparatuur_level_2_intro",
    type: "intro",
    visible: true,
    body: L(
      "Goed om te weten: maten, energielabels en geluid tonen we alleen als die specificatie bij het product is ingevuld. Zonder die gegevens wijst EuropMade geen beste keuze aan.",
      "Good to know: dimensions, energy labels and noise are shown only when that specification is filled in on the product. Without that data EuropMade does not name a best choice.",
      "Gut zu wissen: Maße, Energielabels und Geräusch zeigen wir nur, wenn diese Angabe beim Produkt ausgefüllt ist. Ohne diese Daten nennt EuropMade keine beste Wahl.",
      "Bon à savoir : les dimensions, labels énergie et le bruit ne s'affichent que si la caractéristique est renseignée. Sans ces données, EuropMade ne désigne pas un meilleur choix."
    ),
  })
  insertAfter(doc, "intro", {
    id: "blk_inbouwapparatuur_level_2_faq",
    type: "faq",
    visible: true,
    title: L("Veelgestelde vragen", "Frequently asked questions", "Häufige Fragen", "Questions fréquentes"),
    items: [
      item("ib-faq-1", L("Waarom zie ik geen ovens, kookplaten en afzuigkappen als losse tegels?", "Why are ovens, hobs and cooker hoods not separate tiles?", "Warum sind Backöfen, Kochfelder und Hauben keine eigenen Kacheln?", "Pourquoi les fours, tables et hottes ne sont-ils pas des tuiles séparées ?"), L("Die groepen bestaan in Product Cloud als Ovens en magnetrons, en als Kookplaten, fornuizen en afzuigkappen.", "Those groups exist in Product Cloud as Ovens and microwaves, and as Hobs, cookers and cooker hoods.", "Diese Gruppen existieren in der Product Cloud als Backöfen und Mikrowellen und als Kochfelder, Herde und Dunstabzugshauben.", "Ces groupes existent dans le Product Cloud comme Fours et micro-ondes, et comme Tables, cuisinières et hottes.")),
      item("ib-faq-2", L("Waarom geeft de keuzehulp nog geen producten?", "Why does the choice helper not recommend products yet?", "Warum empfiehlt die Auswahlhilfe noch keine Produkte?", "Pourquoi l'aide au choix ne recommande-t-elle pas encore de produits ?"), L("Er zijn nog geen twee verkoopbare producten met dezelfde ingevulde specificatie. Zonder die gegevens komt er geen aanbeveling.", "There are not yet two sellable products with the same filled-in specification. Without that data there is no recommendation.", "Es gibt noch keine zwei verkaufbaren Produkte mit derselben ausgefüllten Angabe. Ohne diese Daten gibt es keine Empfehlung.", "Il n'y a pas encore deux produits vendables avec la même caractéristique renseignée. Sans ces données, il n'y a pas de recommandation.")),
    ],
  })
  insertAfter(doc, "faq", {
    id: "blk_inbouwapparatuur_level_2_seo_content",
    type: "seo_content",
    visible: true,
    title: L("Inbouwapparatuur kiezen", "Choosing built-in appliances", "Einbaugeräte wählen", "Choisir l'encastrable"),
    body: L(
      "Inbouwapparatuur helpt je oriënteren. Je kiest een productgroep en gaat daarna naar een specifieke categorie om producten en aanbiedingen te vergelijken. Deze pagina heeft geen filters en geen volledige productlijst.",
      "Built-in appliances helps you orient yourself. You choose a product group and then go to a specific category to compare products and offers. This page has no filters and no full product list.",
      "Einbaugeräte hilft bei der Orientierung. Sie wählen eine Produktgruppe und gehen danach in eine konkrete Kategorie, um Produkte und Angebote zu vergleichen. Diese Seite hat keine Filter und keine vollständige Produktliste.",
      "L'encastrable aide à s'orienter. Vous choisissez un groupe, puis une catégorie précise pour comparer produits et offres. Cette page n'a ni filtres ni liste complète."
    ),
  })
  doc.seo.title = fillText(doc.seo.title, L("Inbouwapparatuur", "Built-in appliances", "Einbaugeräte", "Électroménager encastrable"))
  doc.seo.h1 = fillText(doc.seo.h1, L("Inbouwapparatuur", "Built-in appliances", "Einbaugeräte", "Électroménager encastrable"))
  doc.seo.meta_description = fillText(doc.seo.meta_description, L(
    "Oriënteer je in inbouwapparatuur via de bestaande productgroepen en ga daarna vergelijken.",
    "Find your way through built-in appliances via the existing product groups, then compare.",
    "Orientieren Sie sich bei Einbaugeräten über die bestehenden Produktgruppen und vergleichen Sie danach.",
    "Orientez-vous dans l'encastrable via les groupes existants, puis comparez."
  ))
}

function fillVaatwassers(doc: Doc) {
  const hero = blockOf(doc, "hero")
  if (hero) {
    fillHero(
      hero,
      L(
        "Vergelijk vaatwassers op de specificaties die in Product Cloud staan en bekijk de actuele aanbiedingen. Ontbrekende specificaties blijven leeg.",
        "Compare dishwashers on the specifications stored in Product Cloud and view the current offers. Missing specifications stay empty.",
        "Vergleichen Sie Geschirrspüler anhand der Angaben in der Product Cloud und sehen Sie die aktuellen Angebote. Fehlende Angaben bleiben leer.",
        "Comparez les lave-vaisselle selon les caractéristiques du Product Cloud et consultez les offres actuelles. Les caractéristiques manquantes restent vides."
      ),
      L("Bekijk de vaatwassers", "View the dishwashers", "Geschirrspüler ansehen", "Voir les lave-vaisselle"),
      "#blk_vaatwassers_level_3_product_grid",
      L("Keuzehulp", "Choice helper", "Auswahlhilfe", "Aide au choix"),
      "#blk_vaatwassers_level_3_choice_assistant_cta",
      KITCHEN_IMAGE
    )
  }
  const uspBar = blockOf(doc, "usp_bar")
  if (uspBar) {
    fillUsps(uspBar, "vaatwassers", "level_3", [
      [L("Specificaties uit Product Cloud", "Specifications from Product Cloud", "Angaben aus der Product Cloud", "Caractéristiques du Product Cloud"), L("Filters gebruiken alleen specificaties die bij deze categorie horen.", "Filters use only specifications that belong to this category.", "Filter nutzen nur Angaben, die zu dieser Kategorie gehören.", "Les filtres n'utilisent que les caractéristiques de cette catégorie.")],
      [L("Actuele aanbiedingen", "Current offers", "Aktuelle Angebote", "Offres actuelles"), L("Prijs, voorraad en levertijd komen uit Commerce Cloud.", "Price, stock and delivery time come from Commerce Cloud.", "Preis, Bestand und Lieferzeit kommen aus der Commerce Cloud.", "Le prix, le stock et le délai viennent de la Commerce Cloud.")],
      [L("Geen beste koop", "No best buy", "Kein Bestkauf", "Pas de meilleur achat"), L("De vergelijking markeert geen winnaar.", "The comparison does not mark a winner.", "Der Vergleich markiert keinen Sieger.", "La comparaison ne désigne pas de gagnant.")],
      [L("Europese merken", "European brands", "Europäische Marken", "Marques européennes"), L("De merkenrij telt de merken van de producten in deze categorie.", "The brand row counts the brands of the products in this category.", "Die Markenzeile zählt die Marken der Produkte in dieser Kategorie.", "La rangée compte les marques des produits de cette catégorie.")],
    ])
  }
  const filters = blockOf(doc, "filters")
  if (filters && (!Array.isArray(filters.controls) || filters.controls.length === 0)) {
    const specs: Array<[string, Loc]> = [
      ["merk", L("Merk", "Brand", "Marke", "Marque")],
      ["inbouw_of_vrijstaand", L("Inbouw of vrijstaand", "Built-in or freestanding", "Einbau oder freistehend", "Encastrable ou pose libre")],
      ["type_vaatwasser", L("Type vaatwasser", "Dishwasher type", "Geschirrspülertyp", "Type de lave-vaisselle")],
      ["energielabel", L("Energielabel", "Energy label", "Energielabel", "Label énergie")],
      ["geluidsniveau", L("Geluidsniveau", "Noise level", "Geräuschpegel", "Niveau sonore")],
      ["breedte", L("Breedte", "Width", "Breite", "Largeur")],
      ["hoogte_van_de_nis", L("Hoogte van de nis", "Niche height", "Nischenhöhe", "Hauteur de niche")],
      ["droogtechniek", L("Droogtechniek", "Drying system", "Trocknungssystem", "Système de séchage")],
      ["deursysteem", L("Deursysteem", "Door system", "Türsystem", "Système de porte")],
      ["kleur", L("Kleur", "Colour", "Farbe", "Couleur")],
    ]
    filters.controls = specs.map(([code, label], sortOrder) => ({
      attributeKey: code,
      visible: true,
      label,
      sortOrder,
    }))
  }
  const grid = blockOf(doc, "product_grid")
  if (grid) grid.title = fillText(grid.title, L("Vaatwassers", "Dishwashers", "Geschirrspüler", "Lave-vaisselle"))
  const comparison = blockOf(doc, "product_comparison")
  if (comparison) {
    comparison.title = fillText(comparison.title, L("Vergelijk vaatwassers", "Compare dishwashers", "Geschirrspüler vergleichen", "Comparer les lave-vaisselle"))
    if (!Array.isArray(comparison.product_ids) || comparison.product_ids.length === 0) {
      comparison.product_ids = [DISHWASHER_ID]
    }
    if (!Array.isArray(comparison.spec_codes) || comparison.spec_codes.length === 0) {
      comparison.spec_codes = ["energielabel", "geluidsniveau", "breedte", "inbouw_of_vrijstaand", "type_vaatwasser"]
    }
  }
  const guide = blockOf(doc, "buying_guide")
  if (guide && (!Array.isArray(guide.sections) || guide.sections.length === 0)) {
    guide.title = fillText(guide.title, L("Koopgids vaatwassers", "Dishwasher buying guide", "Kaufberatung Geschirrspüler", "Guide d'achat lave-vaisselle"))
    guide.intro = fillText(guide.intro, L(
      "Gebruik deze gids om te weten welke specificaties je kunt vergelijken. De waarden komen uit Product Cloud. Staat een waarde er niet, dan vullen we die niet in.",
      "Use this guide to see which specifications you can compare. The values come from Product Cloud. If a value is missing, we do not fill it in.",
      "Nutzen Sie diesen Ratgeber, um zu sehen, welche Angaben Sie vergleichen können. Die Werte kommen aus der Product Cloud. Fehlt ein Wert, füllen wir ihn nicht auf.",
      "Utilisez ce guide pour voir quelles caractéristiques comparer. Les valeurs viennent du Product Cloud. Si une valeur manque, nous ne l'inventons pas."
    ))
    guide.sections = [
      {
        id: "vg-inbouw",
        heading: L("Inbouw of vrijstaand", "Built-in or freestanding", "Einbau oder freistehend", "Encastrable ou pose libre"),
        intro: L("Dit is een echte specificatie van deze categorie.", "This is a real specification of this category.", "Das ist eine echte Angabe dieser Kategorie.", "C'est une caractéristique réelle de cette catégorie."),
        body: L("Kies inbouw als het apparaat in een keukenkast komt, en vrijstaand als het zelfstandig staat. De waarde verschijnt alleen als ze bij het product is opgeslagen.", "Choose built-in when the appliance goes into a kitchen cabinet, and freestanding when it stands on its own. The value appears only when it is stored on the product.", "Wählen Sie Einbau, wenn das Gerät in einen Küchenschrank kommt, und freistehend, wenn es allein steht. Der Wert erscheint nur, wenn er beim Produkt gespeichert ist.", "Choisissez encastrable si l'appareil va dans un meuble, et pose libre s'il se tient seul. La valeur n'apparaît que si elle est enregistrée sur le produit."),
        bullets: [],
        tip: L("Filter op deze specificatie zodra producten een waarde hebben.", "Filter on this specification once products have a value.", "Filtern Sie nach dieser Angabe, sobald Produkte einen Wert haben.", "Filtrez sur cette caractéristique dès que des produits ont une valeur."),
      },
      {
        id: "vg-label",
        heading: L("Energielabel en geluid", "Energy label and noise", "Energielabel und Geräusch", "Label énergie et bruit"),
        body: L("Energielabel en geluidsniveau zijn vergelijkbare specificaties. Zonder ingevulde waarde toont de tabel een streepje en noemt de pagina het product niet zuiniger of stiller.", "Energy label and noise level are comparable specifications. Without a stored value the table shows a dash and the page does not call the product more efficient or quieter.", "Energielabel und Geräuschpegel sind vergleichbare Angaben. Ohne gespeicherten Wert zeigt die Tabelle einen Strich und die Seite nennt das Produkt nicht sparsamer oder leiser.", "Le label énergie et le niveau sonore sont comparables. Sans valeur enregistrée, le tableau affiche un tiret et la page ne dit pas que le produit est plus sobre ou plus silencieux."),
        bullets: [],
      },
      {
        id: "vg-maat",
        heading: L("Breedte en nishoogte", "Width and niche height", "Breite und Nischenhöhe", "Largeur et hauteur de niche"),
        body: L("Breedte en hoogte van de nis zijn numerieke specificaties. Een maat uit het ontwerp, zoals 60 cm of 16 couverts, wordt niet overgenomen als die niet bij het product staat.", "Width and niche height are numeric specifications. A measurement from the design, such as 60 cm or 16 place settings, is not copied when it is not stored on the product.", "Breite und Nischenhöhe sind numerische Angaben. Ein Maß aus dem Entwurf, etwa 60 cm oder 16 Maßgedecke, wird nicht übernommen, wenn es nicht beim Produkt steht.", "La largeur et la hauteur de niche sont numériques. Une mesure du design, comme 60 cm ou 16 couverts, n'est pas reprise si elle n'est pas enregistrée sur le produit."),
        bullets: [],
      },
    ]
    guide.faq = [
      item("vg-faq-1", L("Waarom zijn veel filters nog leeg?", "Why are many filters still empty?", "Warum sind viele Filter noch leer?", "Pourquoi beaucoup de filtres sont-ils encore vides ?"), L("Een filter verschijnt pas als minstens één verkoopbaar product die specificatie heeft.", "A filter appears only when at least one sellable product has that specification.", "Ein Filter erscheint erst, wenn mindestens ein verkaufbares Produkt diese Angabe hat.", "Un filtre n'apparaît que si au moins un produit vendable a cette caractéristique.")),
    ]
    guide.closing_cta_label = fillText(guide.closing_cta_label, L("Bekijk de vaatwassers", "View the dishwashers", "Geschirrspüler ansehen", "Voir les lave-vaisselle"))
    if (!String(guide.closing_cta_href ?? "").trim()) guide.closing_cta_href = "#blk_vaatwassers_level_3_product_grid"
  }
  insertAfter(doc, "usp_bar", {
    id: "blk_vaatwassers_level_3_ad_slot",
    type: "ad_slot",
    visible: true,
    slot_id: "",
    placement: "category",
    positions: adPositions("vaatwassers", ["below_hero", "above_product_grid", "below_product_grid"]),
  })
  insertAfter(doc, "product_grid", {
    id: "blk_vaatwassers_level_3_choice_assistant_cta",
    type: "choice_assistant_cta",
    visible: true,
    title: L("Welke vaatwasser past bij jou?", "Which dishwasher fits you?", "Welcher Geschirrspüler passt zu Ihnen?", "Quel lave-vaisselle vous convient ?"),
    body: L(
      "De keuzehulp stelt alleen vragen over specificaties met genoeg echte productgegevens. Met te weinig gegevens komt er geen aanbeveling.",
      "The choice helper only asks about specifications with enough real product data. With too little data there is no recommendation.",
      "Die Auswahlhilfe stellt nur Fragen zu Angaben mit genug echten Produktdaten. Bei zu wenigen Daten gibt es keine Empfehlung.",
      "L'aide au choix ne pose des questions que sur les caractéristiques avec assez de données réelles. Sans assez de données, il n'y a pas de recommandation."
    ),
    cta_label: L("Start de keuzehulp", "Start the choice helper", "Auswahlhilfe starten", "Démarrer l'aide au choix"),
    href: "#blk_vaatwassers_level_3_choice_assistant_cta",
    question_codes: ["inbouw_of_vrijstaand", "type_vaatwasser", "energielabel", "droogtechniek", "deursysteem", "kleur"],
  })
  insertAfter(doc, "buying_guide", {
    id: "blk_vaatwassers_level_3_brand_overview",
    type: "brand_overview",
    visible: true,
    title: L("Europese merken vaatwassers", "European dishwasher brands", "Europäische Marken Geschirrspüler", "Marques européennes de lave-vaisselle"),
    max_items: 8,
    allow_sponsored: false,
  })
  insertAfter(doc, "brand_overview", {
    id: "blk_vaatwassers_level_3_faq",
    type: "faq",
    visible: true,
    title: L("Veelgestelde vragen", "Frequently asked questions", "Häufige Fragen", "Questions fréquentes"),
    items: [
      item("vw-faq-1", L("Welke prijs zie ik?", "Which price do I see?", "Welchen Preis sehe ich?", "Quel prix est affiché ?"), L("De prijs van de verkoopbare aanbieding. Er wordt geen voorbeeldprijs getoond.", "The price of the sellable offer. No sample price is shown.", "Der Preis des verkaufbaren Angebots. Es wird kein Beispielpreis gezeigt.", "Le prix de l'offre vendable. Aucun prix d'exemple n'est affiché.")),
      item("vw-faq-2", L("Waarom vergelijkt de tabel maar één product?", "Why does the table compare only one product?", "Warum vergleicht die Tabelle nur ein Produkt?", "Pourquoi le tableau ne compare-t-il qu'un produit ?"), L("Omdat er nu één verkoopbaar product in deze categorie staat. Er worden geen extra producten toegevoegd.", "Because there is currently one sellable product in this category. No extra products are added.", "Weil in dieser Kategorie derzeit ein verkaufbares Produkt steht. Es werden keine zusätzlichen Produkte hinzugefügt.", "Parce qu'il n'y a actuellement qu'un produit vendable dans cette catégorie. Aucun produit supplémentaire n'est ajouté.")),
    ],
  })
  insertAfter(doc, "faq", {
    id: "blk_vaatwassers_level_3_seo_content",
    type: "seo_content",
    visible: true,
    title: L("Vaatwassers vergelijken en kopen", "Compare and buy dishwashers", "Geschirrspüler vergleichen und kaufen", "Comparer et acheter un lave-vaisselle"),
    body: L(
      "Vaatwassers is de specifieke categorie om producten te vergelijken en een aanbieding te kiezen. Filters, specificaties en de vergelijking gebruiken alleen gegevens uit Product Cloud en Commerce Cloud.",
      "Dishwashers is the specific category for comparing products and choosing an offer. Filters, specifications and the comparison use only data from Product Cloud and Commerce Cloud.",
      "Geschirrspüler ist die konkrete Kategorie, um Produkte zu vergleichen und ein Angebot zu wählen. Filter, Angaben und der Vergleich nutzen nur Daten aus Product Cloud und Commerce Cloud.",
      "Lave-vaisselle est la catégorie précise pour comparer des produits et choisir une offre. Filtres, caractéristiques et comparaison n'utilisent que les données du Product Cloud et de la Commerce Cloud."
    ),
  })
  doc.seo.title = fillText(doc.seo.title, L("Vaatwassers", "Dishwashers", "Geschirrspüler", "Lave-vaisselle"))
  doc.seo.h1 = fillText(doc.seo.h1, L("Vaatwassers", "Dishwashers", "Geschirrspüler", "Lave-vaisselle"))
  doc.seo.meta_description = fillText(doc.seo.meta_description, L(
    "Vergelijk vaatwassers op echte specificaties en bekijk de actuele aanbiedingen.",
    "Compare dishwashers on real specifications and view the current offers.",
    "Vergleichen Sie Geschirrspüler anhand echter Angaben und sehen Sie die aktuellen Angebote.",
    "Comparez les lave-vaisselle sur des caractéristiques réelles et consultez les offres actuelles."
  ))
}

function item(id: string, question: Loc, answer: Loc) {
  return { id, question, answer }
}

function adviceItem(id: string, label: Loc, summary: Loc, href: string) {
  return {
    id,
    label,
    href,
    summary,
    body: L("", "", "", ""),
    cta_label: L("Bekijk de groep", "View the group", "Gruppe ansehen", "Voir le groupe"),
  }
}

function fill(slug: string, doc: Doc) {
  if (slug === "huishouden") fillHuishouden(doc)
  else if (slug === "inbouwapparatuur") fillInbouw(doc)
  else if (slug === "vaatwassers") fillVaatwassers(doc)
  else throw new Error(`Onbekende categorie ${slug}`)
}

const slugs = ["huishouden", "inbouwapparatuur", "vaatwassers"] as const
const profiles: Record<(typeof slugs)[number], CategoryCmsProfile> = {
  huishouden: "level_1",
  inbouwapparatuur: "level_2",
  vaatwassers: "level_3",
}

const client = new pg.Client({ connectionString: databaseUrl(), connectionTimeoutMillis: 8000 })
await client.connect()
try {
  await client.query("BEGIN")
  for (const slug of slugs) {
    const found = await client.query(
      "SELECT id, draft_document, draft_revision, published_document FROM cms_category WHERE category_slug = $1 FOR UPDATE",
      [slug]
    )
    const row = found.rows[0]
    if (!row?.draft_document) throw new Error(`Geen concept voor ${slug}`)
    const previousPublished = row.published_document == null ? null : JSON.stringify(row.published_document)
    const original = structuredClone(row.draft_document) as Doc
    const draft = structuredClone(original)
    fill(slug, draft)
    const next = prepareCategoryCmsWrite({
      raw: draft,
      slug,
      profile: profiles[slug],
      previous: original,
    })
    const revision = Number(row.draft_revision ?? 0) + 1
    const saved = await client.query(
      `UPDATE cms_category
       SET draft_document = $2::jsonb,
           draft_revision = $3,
           draft_updated_at = now(),
           draft_sync_state = 'unpublished_changes'
       WHERE id = $1
         AND published_document IS NOT DISTINCT FROM $4::jsonb
       RETURNING category_slug, draft_revision, (published_document IS NULL) AS published_untouched`,
      [row.id, JSON.stringify(next), revision, previousPublished]
    )
    if (saved.rows.length !== 1) throw new Error(`Opslaan geweigerd voor ${slug}`)
    console.log(JSON.stringify({
      slug,
      revision: saved.rows[0]?.draft_revision,
      published_untouched: saved.rows[0]?.published_untouched,
      blocks: next.blocks.map((block) => block.type),
    }))
  }
  await client.query("COMMIT")
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
