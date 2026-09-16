/**
 * Seller product-import column catalog (Excel/CSV).
 * Requirement labels are seller-facing; publish gates stay in completeness.ts.
 */

import { GPSR_COMPLIANCE_ATTRIBUTES } from "./category-attributes"

export type FieldRequirement =
  | "Verplicht"
  | "Optioneel"
  | "Voorwaardelijk verplicht"
  | "Automatisch"
  | "Admincontrole"
  | "Via seller-wizard"

export type ImportFieldDef = {
  column: string
  nl_name: string
  meaning: string
  required: FieldRequirement
  example: string
  allowed: string
  help: string
  aliases: string[]
  /** Excel list validation key from the Lijsten sheet, if any. */
  list?: "land" | "sales_status" | "ce_marking" | "ja_nee" | "variant_type" | "category"
}

const GPSR_FIELDS: ImportFieldDef[] = GPSR_COMPLIANCE_ATTRIBUTES.map((item) => ({
  column: item.code,
  nl_name: item.name,
  meaning: item.name,
  required:
    item.requirement_tier === "compliance_required"
      ? "Voorwaardelijk verplicht"
      : "Optioneel",
  example: "",
  allowed: "Vrije tekst",
  help:
    item.requirement_tier === "compliance_required"
      ? "Verplicht vóór indienen, goedkeuring, publicatie en verkoop. Mag leeg bij een Concept."
      : "Optioneel. Veiligheidswaarschuwingen helpen de klant; blokkeren publicatie niet.",
  aliases: [item.code, item.name, item.code.replace(/_/g, " ")],
}))

const CORE_FIELDS: ImportFieldDef[] = [
  {
    column: "ean",
    nl_name: "EAN / GTIN",
    meaning: "EAN/GTIN van de variant (primaire matching)",
    required: "Voorwaardelijk verplicht",
    example: "4242005482320",
    allowed: "Cijfers, 8 of 12–14 tekens met geldig checksum",
    help: "Mag leeg bij een Concept (net als in de wizard). Verplicht vóór indienen ter controle, admin-goedkeuring, publicatie en verkoop. Bestaande EAN = bestaand product (geen duplicaat).",
    aliases: ["ean", "ean-code", "ean_code", "gtin", "barcode", "eancode"],
  },
  {
    column: "mpn",
    nl_name: "Fabrikantnummer / MPN",
    meaning: "Manufacturer Part Number",
    required: "Optioneel",
    example: "",
    allowed: "Vrije tekst",
    help: "Nooit de primaire productidentiteit. Alleen secundaire match als EAN ontbreekt. Seller SKU hoort niet in deze kolom.",
    aliases: ["mpn", "fabrikantnummer", "manufacturer_part_number", "artikelcode fabrikant"],
  },
  {
    column: "sku",
    nl_name: "Seller SKU / artikelnummer",
    meaning: "Intern artikelnummer van deze seller",
    required: "Optioneel",
    example: "",
    allowed: "Vrije tekst",
    help: "Blijft seller-specifiek op het verkoopaanbod. Wordt niet als catalogus-EAN gebruikt.",
    aliases: ["sku", "artikelnummer", "artnr", "seller_sku", "artikel nr", "artikel-nr"],
  },
  {
    column: "title",
    nl_name: "Productnaam",
    meaning: "Productnaam in de brontaal",
    required: "Verplicht",
    example: "Bosch Serie 8 volledig geïntegreerde vaatwasser 60 cm SMD8TCX04E",
    allowed: "Vrije tekst",
    help: "Verplicht bij aanmaken (wizard en Excel), ook zonder EAN. Vul in de taal die je bij de import kiest (brontaal). Geen aparte kolommen per doeltaal.",
    aliases: ["title", "productnaam", "product name", "titel"],
  },
  {
    column: "short_description",
    nl_name: "Korte omschrijving",
    meaning: "Korte producttekst",
    required: "Optioneel",
    example: "",
    allowed: "Vrije tekst",
    help: "Wordt samen met de uitgebreide beschrijving opgeslagen in het beschrijvingsveld van Product Cloud.",
    aliases: ["short_description", "korte omschrijving", "korte beschrijving"],
  },
  {
    column: "description",
    nl_name: "Uitgebreide beschrijving",
    meaning: "Productbeschrijving",
    required: "Optioneel",
    example: "",
    allowed: "Vrije tekst",
    help: "Optioneel bij Concept. Aanbevolen vóór publicatie. Zelfde brontaal als de productnaam. Vertalingen maakt het systeem daarna.",
    aliases: ["description", "beschrijving", "omschrijving", "lange beschrijving", "uitgebreide omschrijving", "uitgebreide beschrijving"],
  },
  {
    column: "usps",
    nl_name: "Belangrijkste kenmerken / USP's",
    meaning: "Korte USP-lijst",
    required: "Optioneel",
    example: "",
    allowed: "Vrije tekst, één kenmerk per regel",
    help: "Wordt aan de beschrijving toegevoegd. Geen apart databasemodel.",
    aliases: ["usps", "usp", "kenmerken", "usp's"],
  },
  {
    column: "specifications",
    nl_name: "Productspecificaties",
    meaning: "Vrije specificatietekst",
    required: "Optioneel",
    example: "",
    allowed: "Vrije tekst",
    help: "Wordt aan de beschrijving toegevoegd. Categoriekenmerken (zuigkracht, maat, …) map je extra ná categorie-matching.",
    aliases: ["specifications", "specificaties", "specs"],
  },
  {
    column: "brand",
    nl_name: "Merk",
    meaning: "Merknaam of merk-ID",
    required: "Verplicht",
    example: "Bosch",
    allowed: "Bestaand seller-merk",
    help: "Verplicht bij aanmaken. Moet een merk zijn dat je mag beheren.",
    aliases: ["brand", "merk", "merknaam", "brand_name"],
  },
  {
    column: "manufacturer",
    nl_name: "Fabrikant",
    meaning: "Fabrikantnaam of -ID",
    required: "Voorwaardelijk verplicht",
    example: "Bosch",
    allowed: "Naam of ID",
    help: "Verplicht vóór publicatie. Leeg bij import: het merk wordt als fallback gebruikt (zelfde als nu).",
    aliases: ["manufacturer", "fabrikant", "producent"],
  },
  {
    column: "category",
    nl_name: "Productcategorie",
    meaning: "Bestaande Product Cloud-categorie",
    required: "Verplicht",
    example: "Huishouden",
    allowed: "Bestaande EuropMade-categorie (dropdown in XLSX)",
    help: "Kies een EuropMade-categorie uit de lijst. Onbekende namen uit externe bestanden blokkeren de import niet: het product wordt Concept met status ‘Categorie moet nog worden toegewezen’. Indienen/publiceren kan pas na toewijzing.",
    aliases: ["category", "categorie", "productgroep", "category_name"],
    list: "category",
  },
  {
    column: "variant_type",
    nl_name: "Varianttype",
    meaning: "Soort variant",
    required: "Optioneel",
    example: "Uitvoering",
    allowed: "Kleur, Maat, Inhoud, Vermogen, Spanning, Materiaal, Uitvoering, Bundel",
    help: "Standaard Uitvoering als leeg.",
    aliases: ["variant_type", "varianttype", "variant soort"],
    list: "variant_type",
  },
  {
    column: "variant_value",
    nl_name: "Variantwaarde",
    meaning: "Waarde van de variant",
    required: "Optioneel",
    example: "Standaard",
    allowed: "Vrije tekst",
    help: "Bijv. Zwart, 60 cm, Standaard. Standaard 'Standaard' als leeg.",
    aliases: ["variant_value", "variantwaarde", "variant"],
  },
  {
    column: "regular_price",
    nl_name: "Reguliere verkoopprijs",
    meaning: "Centrale klantprijs excl. verzending",
    required: "Voorwaardelijk verplicht",
    example: "1749",
    allowed: "Getal ≥ 0",
    help: "Valuta volgt de markt/regio (niet invullen). Verplicht om verkoopbaar te zijn. Eén prijs voor alle markten.",
    aliases: ["regular_price", "prijs", "reguliere prijs", "price", "base_price", "klantprijs"],
  },
  {
    column: "promo_price",
    nl_name: "Actieprijs",
    meaning: "Tijdelijke prijs excl. verzending",
    required: "Optioneel",
    example: "",
    allowed: "Getal ≥ 0, lager dan reguliere prijs",
    help: "Per markt op het aanbod. Leeg = geen actie.",
    aliases: ["promo_price", "actieprijs", "aanbiedingsprijs"],
  },
  {
    column: "sales_status",
    nl_name: "Verkoopstatus",
    meaning: "Aanbod actief of gepauzeerd",
    required: "Optioneel",
    example: "active",
    allowed: "active of paused",
    help: "paused = niet te koop op die markt. Catalogusproduct blijft bestaan.",
    aliases: ["sales_status", "verkoopstatus", "status"],
    list: "sales_status",
  },
  {
    column: "stock",
    nl_name: "Voorraad",
    meaning: "Voorraad voor de markt",
    required: "Voorwaardelijk verplicht",
    example: "30",
    allowed: "Geheel getal ≥ 0",
    help: "Verplicht om verkoopbaar te zijn. Mag 0 zijn (niet te koop door voorraad).",
    aliases: ["stock", "voorraad", "quantity", "qty", "aantal"],
  },
  {
    column: "shipping_cost",
    nl_name: "Verzendkosten",
    meaning: "Verzendkosten voor de markt",
    required: "Optioneel",
    example: "4.95",
    allowed: "Getal ≥ 0",
    help: "Mag per land verschillen.",
    aliases: ["shipping_cost", "verzendkosten", "verzending", "shipping"],
  },
  {
    column: "extra_delivery_cost",
    nl_name: "Extra leverings-/handlingkosten",
    meaning: "Objectieve extra kosten per markt",
    required: "Optioneel",
    example: "0",
    allowed: "Getal ≥ 0",
    help: "Geen willekeurige landopslag op de productprijs.",
    aliases: ["extra_delivery_cost", "extra leveringskosten", "handlingkosten"],
  },
  {
    column: "region",
    nl_name: "Markt / land",
    meaning: "ISO-2 van het verkoopaanbod",
    required: "Optioneel",
    example: "NL",
    allowed: "ISO-2, bijv. NL, DE, BE",
    help: "Standaard NL. Valuta volgt deze markt.",
    aliases: ["region", "markt", "land", "country", "region_code"],
    list: "land",
  },
  {
    column: "delivery_days",
    nl_name: "Levertijd (dagen)",
    meaning: "Maximale beloofde levertijd",
    required: "Voorwaardelijk verplicht",
    example: "3",
    allowed: "Geheel getal 0–365",
    help: "Verplicht om verkoopbaar te zijn.",
    aliases: ["delivery_days", "levertijd", "levertijd_dagen"],
  },
  {
    column: "shipping_profile_id",
    nl_name: "Verzendprofiel",
    meaning: "ID van jouw verzendprofiel",
    required: "Voorwaardelijk verplicht",
    example: "",
    allowed: "cshp_… of leeg",
    help: "Koppel het profiel uit Seller → Verzending. Verplicht om verkoopbaar te zijn. Admin keurt dit niet inhoudelijk in de template.",
    aliases: ["shipping_profile_id", "verzendprofiel", "shipping profile"],
  },
  {
    column: "primary_image_url",
    nl_name: "Hoofdafbeelding (URL of pad)",
    meaning: "Vrijstaande productfoto",
    required: "Voorwaardelijk verplicht",
    example:
      "/static/1788509822754-bosch-smd8tcx04e-serie-8-inbouw-vaatwasser-800.webp",
    allowed: "URL of /static/… pad",
    help: "Verplicht vóór publicatie. De hoofdafbeelding moet vrijstaand / achtergrondvrij zijn. Bewijsstukken keurt de admin goed (Admincontrole), niet via deze kolom.",
    aliases: ["primary_image_url", "hoofdafbeelding", "main image", "image"],
  },
  {
    column: "extra_image_urls",
    nl_name: "Overige afbeeldingen",
    meaning: "Extra foto's, gescheiden door | of ;",
    required: "Optioneel",
    example: "",
    allowed: "Meerdere URL's",
    help: "Sfeerafbeeldingen mogen een achtergrond hebben. Geen PDF's in deze kolom.",
    aliases: ["extra_image_urls", "overige afbeeldingen", "gallery"],
  },
  {
    column: "video_url",
    nl_name: "Video-URL",
    meaning: "Productvideo",
    required: "Optioneel",
    example: "https://www.youtube.com/embed/ReGvfmYkrEw",
    allowed: "URL",
    help: "Optioneel. YouTube-embed of andere https-URL.",
    aliases: ["video_url", "video", "youtube"],
  },
  {
    column: "production_country",
    nl_name: "Productieland",
    meaning: "Land van productie / primaire assemblage",
    required: "Optioneel",
    example: "DE",
    allowed: "ISO-2",
    help: "Universeel veld. Made in Europe-score berekent het systeem (Automatisch). Bewijs keurt de admin goed (Admincontrole).",
    aliases: [
      "production_country",
      "land van productie",
      "productieland",
      "country_of_production",
      "oorsprongsland",
    ],
    list: "land",
  },
  {
    column: "production_location",
    nl_name: "Productieplaats",
    meaning: "Locatie / fabrieksomschrijving",
    required: "Optioneel",
    example: "BSH Hausgeräte GmbH",
    allowed: "Vrije tekst",
    help: "Optioneel, naast productieland.",
    aliases: ["production_location", "productieplaats", "fabriek"],
  },
  {
    column: "ce_marking",
    nl_name: "CE-markering zichtbaar",
    meaning: "Zichtbaar of niet van toepassing",
    required: "Voorwaardelijk verplicht",
    example: "Zichtbaar",
    allowed: "Zichtbaar of Niet van toepassing",
    help: "Zichtbaar → CE-bewijs uploaden in de wizard; admin keurt goed (Admincontrole). Bij elektronica is 'Niet van toepassing' niet toegestaan.",
    aliases: ["ce_marking", "ce", "ce-markering"],
    list: "ce_marking",
  },
  {
    column: "app_required",
    nl_name: "App vereist",
    meaning: "App nodig voor volledige functionaliteit",
    required: "Voorwaardelijk verplicht",
    example: "Nee",
    allowed: "Ja of Nee",
    help: "Verplicht in elektronica-categorieën. Anders optioneel.",
    aliases: ["app_required", "app vereist"],
    list: "ja_nee",
  },
  {
    column: "collects_data",
    nl_name: "Verwerkt gebruikersgegevens",
    meaning: "Product verwerkt persoons-/gebruiksdata",
    required: "Voorwaardelijk verplicht",
    example: "Nee",
    allowed: "Ja of Nee",
    help: "Ja → datagebruikdocument verplicht tot admin-goedkeuring. Elektronisch zijn is niet genoeg.",
    aliases: ["collects_data", "gegevensverwerking", "privacy"],
    list: "ja_nee",
  },
  {
    column: "product_languages",
    nl_name: "Producttaal",
    meaning: "Talen op het product / display",
    required: "Optioneel",
    example: "Nederlands,Engels,Duits,Frans",
    allowed: "Komma-gescheiden talen",
    help: "Aanbevolen. Meerdere waarden scheiden met komma.",
    aliases: ["product_languages", "producttaal"],
  },
  {
    column: "manual_languages",
    nl_name: "Taal handleiding",
    meaning: "Talen van de handleiding",
    required: "Voorwaardelijk verplicht",
    example: "Nederlands,Duits,Engels,Frans",
    allowed: "Komma-gescheiden talen",
    help: "Verplicht in elektronica-categorieën.",
    aliases: ["manual_languages", "taal handleiding"],
  },
]

export const IMPORT_FIELDS: ImportFieldDef[] = [
  ...CORE_FIELDS,
  ...GPSR_FIELDS,
]

export function importDisplayHeader(field: ImportFieldDef): string {
  return `${field.nl_name} (${field.required})`
}

export const CANONICAL_COLUMNS = IMPORT_FIELDS.map((f) => f.column)

export const COLUMN_ALIASES: Record<string, string[]> = Object.fromEntries(
  IMPORT_FIELDS.map((f) => [
    f.column,
    [...new Set([...f.aliases, f.nl_name, importDisplayHeader(f), f.column])],
  ])
)

/** Columns that are Product Cloud attribute codes (not identity/commerce). */
export const IMPORT_ATTRIBUTE_COLUMNS = new Set([
  ...GPSR_COMPLIANCE_ATTRIBUTES.map((i) => i.code),
  "ce_marking",
  "app_required",
  "collects_data",
  "product_languages",
  "manual_languages",
])

export const VARIANT_TYPES = [
  "Kleur",
  "Maat",
  "Inhoud",
  "Vermogen",
  "Spanning",
  "Materiaal",
  "Uitvoering",
  "Bundel",
] as const

export const EU_ISO2 = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "CH",
]

/** Live Product Cloud example — empty cells are genuinely empty in the DB. */
export const BOSCH_EXAMPLE: Record<string, string> = {
  ean: "4242005482320",
  mpn: "",
  sku: "",
  title: "Bosch Serie 8 volledig geïntegreerde vaatwasser 60 cm SMD8TCX04E",
  short_description: "",
  description:
    "De Bosch series 8 SMD8TCX04E inbouwvaatwasser is een volledig geïntegreerde vaatwasser van 60cm breed en biedt de perfecte opties om al je vaat efficiënt te reinigen. Zo heb je met PerfectDry de beste droogresultaten met een laag energiever",
  usps: "",
  specifications: "",
  brand: "Bosch",
  manufacturer: "Bosch",
  category: "Huishouden",
  variant_type: "Uitvoering",
  variant_value: "Standaard",
  regular_price: "1749",
  promo_price: "",
  sales_status: "active",
  stock: "30",
  shipping_cost: "4.95",
  extra_delivery_cost: "0",
  region: "NL",
  delivery_days: "3",
  shipping_profile_id: "",
  primary_image_url:
    "/static/1788509822754-bosch-smd8tcx04e-serie-8-inbouw-vaatwasser-800.webp",
  extra_image_urls: [
    "/static/1788336083367-1200x675.jpg",
    "/static/1788336098936-1200x675%20(1).jpg",
    "/static/1788336092452-1193x1200.jpg",
  ].join(" | "),
  video_url: "https://www.youtube.com/embed/ReGvfmYkrEw",
  production_country: "DE",
  production_location: "BSH Hausgeräte GmbH",
  gpsr_manufacturer_name: "Bosch",
  gpsr_manufacturer_address: "Achtseweg Zuid 173",
  gpsr_manufacturer_postal_city: "5651GW Eindhoven",
  gpsr_manufacturer_country: "NL",
  gpsr_manufacturer_email: "contact@nl.bosch.com",
  gpsr_eu_responsible_name: "",
  gpsr_eu_responsible_address: "",
  gpsr_eu_responsible_postal_city: "",
  gpsr_eu_responsible_country: "",
  gpsr_eu_responsible_contact: "",
  gpsr_safety_warnings: "",
  ce_marking: "Zichtbaar",
  app_required: "Nee",
  collects_data: "Nee",
  product_languages: "Nederlands,Engels,Duits,Frans",
  manual_languages: "Nederlands,Duits,Engels,Frans",
}

export function exampleRowForHeaders(headers: string[]): string[] {
  return headers.map((h) => BOSCH_EXAMPLE[h] ?? "")
}

export function fieldRequirementStyle(
  req: FieldRequirement
): "required" | "optional" | "conditional" | "automatic" | "admin" | "wizard" {
  if (req === "Verplicht") return "required"
  if (req === "Voorwaardelijk verplicht") return "conditional"
  if (req === "Automatisch") return "automatic"
  if (req === "Admincontrole") return "admin"
  if (req === "Via seller-wizard") return "wizard"
  return "optional"
}
