/**
 * Seller product-import column catalog (Excel/CSV).
 * Requirement labels are seller-facing; publish gates stay in completeness.ts.
 */

import { GPSR_COMPLIANCE_ATTRIBUTES } from "./category-attributes"
import {
  ASSEMBLY_EU_BAND_LABELS,
  MATERIALS_EU_LEVEL_LABELS,
  PARTS_EU_LEVEL_LABELS,
} from "../verification/made-in-europe"
import { EUROPEAN_OWNERSHIP_BAND_LABELS } from "../verification/european-ownership"
import { USP_COLUMN_COUNT, uspFieldNlName } from "./import-usps"
import { localizedHeaderAliases } from "./import-template-i18n"

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
  list?:
    | "land"
    | "sales_status"
    | "ce_marking"
    | "ja_nee"
    | "variant_type"
    | "category"
    | "subcategory"
    | "subcategory_l3"
    | "mie_assembly"
    | "mie_parts"
    | "mie_materials"
    | "european_ownership"
}

export const PRODUCT_SPEC_SLOT_COUNT = 10

/** Optional gallery slots after Hoofdafbeelding; map to extra_image_urls (order 2–10). */
export const EXTRA_IMAGE_SLOT_LABELS = [
  "Afbeelding 2",
  "Afbeelding 3",
  "Afbeelding 4",
  "Afbeelding 5",
  "Afbeelding 6",
  "Afbeelding 7",
  "Afbeelding 8",
  "Afbeelding 9",
  "Afbeelding 10",
] as const

export const EXTRA_IMAGE_SLOT_COUNT = EXTRA_IMAGE_SLOT_LABELS.length

/**
 * Master V2 Seller tail: document/evidence URL columns (existing brand mappings).
 * Kept outside IMPORT_FIELDS so Admin header order is unchanged until Phase 3.
 * Conformiteitsverklaring is intentionally omitted — Master V2 treats CE-certificaat as equivalent.
 */
export const SELLER_TAIL_DOCUMENT_FIELDS: ImportFieldDef[] = [
  {
    column: "eu_production_evidence_url",
    nl_name: "EuropMade-bewijs / bewijs van EU-productie",
    meaning: "URL naar bewijs van EU-productie / EuropMade-bewijs",
    required: "Voorwaardelijk verplicht",
    example: "",
    allowed: "https-URL",
    help: "Voorwaardelijk verplicht. Bestaande opslag: eu_production_evidence_url (evidence). Wordt niet automatisch goedgekeurd.",
    aliases: [
      "eu_production_evidence_url",
      "europmade-bewijs / bewijs van eu-productie",
      "europmade bewijs",
      "bewijs van eu-productie",
    ],
  },
  {
    column: "ce_certificate_url",
    nl_name: "CE-certificaat",
    meaning: "URL naar CE-certificaat (tevens bedoeld als Conformiteitsverklaring per Master V2)",
    required: "Voorwaardelijk verplicht",
    example: "",
    allowed: "https-URL",
    help: "Voorwaardelijk verplicht. Bestaande opslag: ce_certificate_url / document_type CE-certificaat. Conformiteitsverklaring staat niet apart in de Master V2-lijst.",
    aliases: [
      "ce_certificate_url",
      "ce-certificaat",
      "ce certificaat",
      "conformiteitsverklaring",
    ],
  },
  {
    column: "safety_sheet_url",
    nl_name: "Veiligheidsinformatieblad",
    meaning: "URL naar veiligheidsinformatieblad (SDS) — niet hetzelfde als Veiligheidswaarschuwingen",
    required: "Optioneel",
    example: "",
    allowed: "https-URL",
    help: "Optioneel. Bestaande opslag: safety_sheet_url / document_type Veiligheidsinformatieblad. Niet verwisselen met gpsr_safety_warnings (Veiligheidswaarschuwingen).",
    aliases: [
      "safety_sheet_url",
      "veiligheidsinformatieblad",
      "safety data sheet",
      "sds",
    ],
  },
  {
    column: "manual_url",
    nl_name: "Handleiding",
    meaning: "URL naar producthandleiding",
    required: "Optioneel",
    example: "",
    allowed: "https-URL",
    help: "Optioneel. Bestaande opslag: manual_url / document_type Handleiding.",
    aliases: ["manual_url", "handleiding", "manual", "handleiding url"],
  },
  {
    column: "warranty_url",
    nl_name: "Garantiebewijs",
    meaning: "URL naar garantiebewijs",
    required: "Optioneel",
    example: "",
    allowed: "https-URL",
    help: "Optioneel. Bestaande opslag: warranty_url / document_type Garantiebewijs.",
    aliases: ["warranty_url", "garantiebewijs", "warranty"],
  },
]

/**
 * Master V2 has Garantieperiode between CE-certificaat and Veiligheidsinformatieblad.
 * Template column only — no import mapping/storage until explicitly approved.
 * Existing candidates investigated separately (see phase-1 report); none are a safe fit without akkoord.
 */
export const SELLER_TEMPLATE_ONLY_GARANTIEPERIODE = {
  nl_name: "Garantieperiode",
  required: "Voorwaardelijk verplicht" as FieldRequirement,
  /** Exact Master V2 header including requirement suffix casing. */
  displayHeader: "Garantieperiode (Voorwaardelijk verplicht)",
  help: "Kolom uit Master V2. Geen goedgekeurde opslagmapping; niet importeren zonder akkoord.",
}

/** Exact Master V2 header for SDS (lowercase requirement label in the leading file). */
export const SELLER_MASTER_VIB_HEADER = "Veiligheidsinformatieblad (optioneel)"

/** In Master V2 Seller template these GPSR attributes are not columns (kept for older file import). */
export const SELLER_TEMPLATE_HIDDEN_COLUMNS = new Set<string>([
  "gpsr_safety_warnings",
])

function productSpecImportFields(): ImportFieldDef[] {
  const fields: ImportFieldDef[] = []
  for (let i = 1; i <= PRODUCT_SPEC_SLOT_COUNT; i++) {
    fields.push({
      column: `spec_label_${i}`,
      nl_name: `Specificatie ${i} (automatisch)`,
      meaning: `Automatische specificatienaam ${i} op basis van subcategorie`,
      required: "Automatisch",
      example: "",
      allowed: "Automatisch via subcategorie (niet handmatig kiezen)",
      help:
        i === 1
          ? "Naam volgt automatisch uit de gekozen subcategorie (Excel-formule / SpecDeps). Niet zelf een willekeurige naam invullen. Server valideert altijd tegen de catalogus. Maximaal 10 optionele productspecificaties; los van USP's en van variantkenmerken (maat/kleur)."
          : "Automatische specificatienaam voor slot " + i + ".",
      aliases: [
        `spec_label_${i}`,
        `specificatie ${i}`,
        `specificatie ${i} (automatisch)`,
        `spec ${i} name`,
        `specification ${i}`,
        `specification ${i} (automatic)`,
        `specification ${i} (automatic) (automatic)`,
      ],
    })
    fields.push({
      column: `spec_value_${i}`,
      nl_name: `Waarde ${i}`,
      meaning: `Waarde voor specificatie ${i}`,
      required: "Optioneel",
      example: "",
      allowed: "Vrije tekst, getal of keuzelijstwaarde volgens de specificatie",
      help:
        "Optioneel. Lege waarden worden niet opgeslagen en wissen bestaande data niet. Ongeldige waarden voor de subcategorie worden geweigerd.",
      aliases: [
        `spec_value_${i}`,
        `waarde ${i}`,
        `value ${i}`,
        `spec ${i} value`,
        `specification value ${i}`,
      ],
    })
  }
  return fields
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
  allowed: item.code.endsWith("_country") ? "ISO-2 landcode" : "Vrije tekst",
  help:
    item.code === "gpsr_manufacturer_name"
      ? "GPSR-etiketnaam van de fabrikant. Verschilt van kolom Fabrikant (catalogusentiteit). Oudere bestanden met 'Fabrikantnaam' blijven werken."
      : item.requirement_tier === "compliance_required"
        ? "Verplicht vóór indienen, goedkeuring, publicatie en verkoop. Mag leeg bij een Concept."
        : "Optioneel. Veiligheidswaarschuwingen helpen de klant; blokkeren publicatie niet.",
  aliases: [
    item.code,
    item.name,
    item.code.replace(/_/g, " "),
    ...(item.code === "gpsr_manufacturer_name"
      ? ["Fabrikantnaam", "fabrikantnaam", "GPSR-fabrikantnaam"]
      : []),
  ],
  list: item.code.endsWith("_country") ? "land" : undefined,
}))

const CORE_FIELDS: ImportFieldDef[] = [
  {
    column: "ean",
    nl_name: "EAN / GTIN",
    meaning: "EAN/GTIN van dit zelfstandige product (primaire matching)",
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
  ...Array.from({ length: USP_COLUMN_COUNT }, (_, i) => {
    const n = i + 1
    const column = `usp_${n}`
    const nl = uspFieldNlName(n)
    return {
      column,
      nl_name: nl,
      meaning: `Afzonderlijk productkenmerk / USP ${n}`,
      required: "Optioneel" as const,
      example: n === 1 ? "Duurzaam Europees leer" : "",
      allowed: "Vrije tekst (één kenmerk)",
      help:
        n === 1
          ? "Vul elk kenmerk in een aparte kolom. Oudere bestanden met één kolom 'Belangrijkste kenmerken / USP's' blijven werken (regels worden gesplitst). Dit zijn geen categoriekenmerken (maat/kleur); die staan op blad Kenmerken."
          : "Optioneel apart kenmerk. Lege kolommen laten bestaande USP's bij gap-fill onaangeroerd.",
      aliases:
        n === 1
          ? [
              column,
              nl,
              "usps",
              "usp",
              "kenmerken",
              "usp's",
              "Belangrijkste kenmerken / USP's",
              "Belangrijkste kenmerken / USP's (Optioneel)",
            ]
          : [column, nl, `usp ${n}`, `kenmerk ${n}`],
    }
  }),
  {
    column: "specifications",
    nl_name: "Productspecificaties",
    meaning: "Vrije specificatietekst",
    required: "Optioneel",
    example: "",
    allowed: "Vrije tekst",
    help: "Vrije tekst voor de beschrijving. Gestructureerde specificaties per subcategorie staan in Specificatie 1–10 / Waarde 1–10 (na Subcategorie).",
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
    nl_name: "Niveau 1",
    meaning: "Bestaande Product Cloud-hoofdcategorie (niveau 1)",
    required: "Verplicht",
    example: "Huishouden",
    allowed: "Bestaande EuropMade-hoofdcategorie (dropdown in XLSX)",
    help: "Kies niveau 1. Daarna niveau 2 en 3. Onbekende namen blokkeren de import niet: het product wordt Concept tot toewijzing.",
    aliases: [
      "category",
      "categorie",
      "productcategorie",
      "product categorie",
      "productgroep",
      "category_name",
      "hoofdcategorie",
      "niveau 1",
      "niveau1",
    ],
    list: "category",
  },
  {
    column: "subcategory",
    nl_name: "Niveau 2",
    meaning: "Bestaande Product Cloud-categorie op niveau 2",
    required: "Optioneel",
    example: "",
    allowed: "Bestaande EuropMade-categorie niveau 2 (dropdown in XLSX)",
    help: "Moet bij het gekozen niveau 1 horen. Zelfde bron als Seller- en Admin-UI.",
    aliases: [
      "subcategory",
      "subcategorie",
      "ondercategorie",
      "sub category",
      "sub_categorie",
      "niveau 2",
      "niveau2",
    ],
    list: "subcategory",
  },
  {
    column: "subcategory_l3",
    nl_name: "Niveau 3",
    meaning: "Bestaande Product Cloud-categorie op niveau 3",
    required: "Optioneel",
    example: "",
    allowed: "Bestaande EuropMade-categorie niveau 3 (dropdown in XLSX)",
    help: "Moet bij het gekozen niveau 2 horen. Inclusief expliciete 'Alles in …'-categorieën uit de bronboom.",
    aliases: [
      "subcategory_l3",
      "niveau 3",
      "niveau3",
      "l3",
      "derde laag",
      "categorie niveau 3",
    ],
    list: "subcategory_l3",
  },
  ...productSpecImportFields(),
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
    required: "Optioneel",
    example: "",
    allowed: "cshp_… of leeg",
    help: "Geen productgegeven. Concept, indiening, goedkeuring en publicatie gaan door. Zonder geldig profiel blijft het aanbod niet verkoopbaar.",
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
    help: "Legacy/gecombineerde kolom: URL's gescheiden door | of ;. Bij voorkeur Afbeelding 2–10 gebruiken (vaste volgorde). Samen met hoofdafbeelding maximaal 10 unieke URL's. Sfeerafbeeldingen mogen een achtergrond hebben. Geen PDF's.",
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
      "country of origin",
      "country of production",
      "production country",
      "made in",
      "herkomstland",
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
    column: "assembly_eu_band",
    nl_name: "Assemblage",
    meaning: "Made in Europe — aandeel assemblage in de EU",
    required: "Optioneel",
    example: ASSEMBLY_EU_BAND_LABELS.eu_100,
    allowed: Object.values(ASSEMBLY_EU_BAND_LABELS).join(" | "),
    help: "Zelfde keuzes als Seller/Admin-compliance. Samen met Onderdelen en Materialen berekent EuropMade de Made in Europe-score. Geen bewijs-upload via Excel.",
    aliases: [
      "assembly_eu_band",
      "assemblage",
      "made in europe assemblage",
      "mie assemblage",
    ],
    list: "mie_assembly",
  },
  {
    column: "parts_eu_level",
    nl_name: "Onderdelen",
    meaning: "Made in Europe — herkomst onderdelen",
    required: "Optioneel",
    example: PARTS_EU_LEVEL_LABELS.eu_majority,
    allowed: Object.values(PARTS_EU_LEVEL_LABELS).join(" | "),
    help: "Zelfde keuzes als Seller/Admin-compliance. Vereist samen met Assemblage en Materialen voor een berekende score.",
    aliases: [
      "parts_eu_level",
      "onderdelen",
      "made in europe onderdelen",
      "mie onderdelen",
    ],
    list: "mie_parts",
  },
  {
    column: "materials_eu_level",
    nl_name: "Materialen",
    meaning: "Made in Europe — herkomst materialen",
    required: "Optioneel",
    example: MATERIALS_EU_LEVEL_LABELS.eu_partial,
    allowed: Object.values(MATERIALS_EU_LEVEL_LABELS).join(" | "),
    help: "Zelfde keuzes als Seller/Admin-compliance. Vereist samen met Assemblage en Onderdelen voor een berekende score.",
    aliases: [
      "materials_eu_level",
      "materialen",
      "made in europe materialen",
      "mie materialen",
    ],
    list: "mie_materials",
  },
  {
    column: "european_ownership_band",
    nl_name: "Europees eigendom van het merk",
    meaning: "EU-eigendomsband van het merk (niet de productiescore)",
    required: "Optioneel",
    example: EUROPEAN_OWNERSHIP_BAND_LABELS.eu_100,
    allowed: Object.values(EUROPEAN_OWNERSHIP_BAND_LABELS).join(" | "),
    help: "Geldt op merkniveau voor alle producten van dit merk. Los van Made in Europe-score en van bewijsdocumenten. Gebruik de dropdownwaarden (0% … 100% / Niet bekend).",
    aliases: [
      "european_ownership_band",
      "europees eigendom",
      "europees eigendom van het merk",
      "eu eigendom",
      "european ownership",
      "ownership_band",
    ],
    list: "european_ownership",
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
    allowed: "Komma-gescheiden waarden uit Lijsten!talen (zelfde bron als UI)",
    help: "Aanbevolen. Meerdere waarden scheiden met komma. Gebruik alleen talen uit tabblad Lijsten → talen (zelfde keuzes als Seller/Admin).",
    aliases: ["product_languages", "producttaal"],
  },
  {
    column: "manual_languages",
    nl_name: "Taal handleiding",
    meaning: "Talen van de handleiding",
    required: "Optioneel",
    example: "Nederlands,Duits,Engels,Frans",
    allowed: "Komma-gescheiden waarden uit Lijsten!talen (zelfde bron als UI)",
    help: "Niet verplicht. Leeg laten blokkeert concept, indiening, goedkeuring en publicatie niet. Meerdere waarden met komma; bron = Lijsten → talen.",
    aliases: ["manual_languages", "taal handleiding"],
  },
]

export const IMPORT_FIELDS: ImportFieldDef[] = [
  ...CORE_FIELDS,
  ...GPSR_FIELDS,
]

/** Present in older files only. Not in templates; import ignores these columns. */
export const IGNORED_IMPORT_FIELDS: ImportFieldDef[] = [
  {
    column: "variant_type",
    nl_name: "Varianttype",
    meaning: "Niet meer in het importbestand",
    required: "Optioneel",
    example: "",
    allowed: "—",
    help: "Kolom wordt genegeerd. Een artikel is een zelfstandig product. De interne technische variant voor EAN en offers wordt niet via deze kolom bepaald.",
    aliases: [
      "variant_type",
      "varianttype",
      "variant soort",
      "Varianttype (Optioneel)",
    ],
  },
  {
    column: "variant_value",
    nl_name: "Variantwaarde",
    meaning: "Niet meer in het importbestand",
    required: "Optioneel",
    example: "",
    allowed: "—",
    help: "Kolom wordt genegeerd. Kleur, maat en uitvoering horen bij de productspecificaties of bij een eigen productregel met een eigen EAN.",
    aliases: [
      "variant_value",
      "variantwaarde",
      "variant",
      "Variantwaarde (Optioneel)",
    ],
  },
  {
    column: "category_path_active",
    nl_name: "Categoriepad (actief)",
    meaning: "Excel-hulpkolom (formule)",
    required: "Automatisch",
    example: "",
    allowed: "—",
    help: "Alleen ter controle in Excel. Wordt niet geïmporteerd.",
    aliases: [
      "categoriepad (actief)",
      "categoriepad",
      "category path",
      "category_path_active",
    ],
  },
  {
    column: "value_check_warning",
    nl_name: "Waarde-controle (automatisch)",
    meaning: "Excel-waarschuwing na categorie-wijziging",
    required: "Automatisch",
    example: "",
    allowed: "—",
    help: "Alleen ter waarschuwing in Excel. Wordt niet geïmporteerd.",
    aliases: [
      "waarde-controle (automatisch)",
      "waarde-controle",
      "waarde controle",
      "value_check_warning",
    ],
  },
  ...Array.from({ length: PRODUCT_SPEC_SLOT_COUNT }, (_, i) => {
    const n = i + 1
    return {
      column: `spec_unit_${n}`,
      nl_name: `Eenheid ${n} (automatisch)`,
      meaning: `Automatische eenheid voor specificatie ${n}`,
      required: "Automatisch" as const,
      example: "",
      allowed: "—",
      help: "Alleen ter weergave in Excel. Wordt niet geïmporteerd; eenheid volgt uit de specificatiecatalogus.",
      aliases: [
        `spec_unit_${n}`,
        `eenheid ${n}`,
        `eenheid ${n} (automatisch)`,
        `unit ${n}`,
      ],
    }
  }),
]

export function importDisplayHeader(field: ImportFieldDef): string {
  return `${field.nl_name} (${field.required})`
}

export const CANONICAL_COLUMNS = IMPORT_FIELDS.map((f) => f.column)

export const COLUMN_ALIASES: Record<string, string[]> = Object.fromEntries(
  [...IMPORT_FIELDS, ...IGNORED_IMPORT_FIELDS].map((f) => [
    f.column,
    [
      ...new Set([
        ...f.aliases,
        f.nl_name,
        importDisplayHeader(f),
        f.column,
        ...localizedHeaderAliases(f.column, f.nl_name),
      ]),
    ],
  ])
)

export const IGNORED_IMPORT_COLUMNS = new Set(
  IGNORED_IMPORT_FIELDS.map((field) => field.column)
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
  usp_1: "",
  usp_2: "",
  usp_3: "",
  usp_4: "",
  usp_5: "",
  usps: "",
  specifications: "",
  brand: "Bosch",
  manufacturer: "Bosch",
  category: "Huishouden",
  subcategory: "",
  subcategory_l3: "",
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
  assembly_eu_band: "",
  parts_eu_level: "",
  materials_eu_level: "",
  european_ownership_band: "",
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
