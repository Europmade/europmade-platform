/**
 * Central visible labels for Seller import templates (NL/EN/DE/FR).
 * Technical column keys stay English (`ImportFieldDef.column`); import mapping
 * matches via aliases including these localized headers.
 */

export type TemplateLocale = "nl" | "en" | "de" | "fr"

export const TEMPLATE_LOCALES: TemplateLocale[] = ["nl", "en", "de", "fr"]

export function normalizeTemplateLocale(
  raw: string | null | undefined
): TemplateLocale {
  const key = String(raw || "")
    .trim()
    .toLowerCase()
    .slice(0, 2)
  if (key === "en" || key === "de" || key === "fr" || key === "nl") return key
  return "en"
}

/** Visible header (and common variants) per technical column, per locale. */
const FIELD_LABELS: Record<string, Record<TemplateLocale, string>> = {
  ean: {
    nl: "EAN / GTIN",
    en: "EAN / GTIN",
    de: "EAN / GTIN",
    fr: "EAN / GTIN",
  },
  mpn: {
    nl: "Fabrikantnummer / MPN",
    en: "Manufacturer part number / MPN",
    de: "Herstellernummer / MPN",
    fr: "Référence fabricant / MPN",
  },
  sku: {
    nl: "Seller SKU / artikelnummer",
    en: "Seller SKU / article number",
    de: "Seller-SKU / Artikelnummer",
    fr: "SKU vendeur / numéro d'article",
  },
  title: {
    nl: "Productnaam",
    en: "Product name",
    de: "Produktname",
    fr: "Nom du produit",
  },
  brand: {
    nl: "Merk",
    en: "Brand",
    de: "Marke",
    fr: "Marque",
  },
  manufacturer: {
    nl: "Fabrikant",
    en: "Manufacturer",
    de: "Hersteller",
    fr: "Fabricant",
  },
  category: {
    nl: "Niveau 1",
    en: "Level 1",
    de: "Ebene 1",
    fr: "Niveau 1",
  },
  subcategory: {
    nl: "Niveau 2",
    en: "Level 2",
    de: "Ebene 2",
    fr: "Niveau 2",
  },
  subcategory_l3: {
    nl: "Niveau 3",
    en: "Level 3",
    de: "Ebene 3",
    fr: "Niveau 3",
  },
  regular_price: {
    nl: "Reguliere verkoopprijs",
    en: "Regular selling price",
    de: "Regulärer Verkaufspreis",
    fr: "Prix de vente régulier",
  },
  promo_price: {
    nl: "Actieprijs",
    en: "Promo price",
    de: "Aktionspreis",
    fr: "Prix promotionnel",
  },
  stock: {
    nl: "Voorraad",
    en: "Stock",
    de: "Bestand",
    fr: "Stock",
  },
  sales_status: {
    nl: "Verkoopstatus",
    en: "Sales status",
    de: "Verkaufsstatus",
    fr: "Statut de vente",
  },
  short_description: {
    nl: "Korte omschrijving",
    en: "Short description",
    de: "Kurzbeschreibung",
    fr: "Description courte",
  },
  description: {
    nl: "Uitgebreide beschrijving",
    en: "Full description",
    de: "Ausführliche Beschreibung",
    fr: "Description détaillée",
  },
  usps: {
    nl: "Productspecificaties",
    en: "Product specifications",
    de: "Produktspezifikationen",
    fr: "Spécifications produit",
  },
  shipping_cost: {
    nl: "Verzendkosten",
    en: "Shipping cost",
    de: "Versandkosten",
    fr: "Frais d'expédition",
  },
  extra_delivery_cost: {
    nl: "Extra leverings-/handlingkosten",
    en: "Extra delivery / handling cost",
    de: "Zusätzliche Liefer-/Handlingkosten",
    fr: "Frais de livraison / manutention supplémentaires",
  },
  region: {
    nl: "Markt / land",
    en: "Market / country",
    de: "Markt / Land",
    fr: "Marché / pays",
  },
  delivery_days: {
    nl: "Levertijd (dagen)",
    en: "Delivery time (days)",
    de: "Lieferzeit (Tage)",
    fr: "Délai de livraison (jours)",
  },
  shipping_profile_id: {
    nl: "Verzendprofiel",
    en: "Shipping profile",
    de: "Versandprofil",
    fr: "Profil d'expédition",
  },
  primary_image_url: {
    nl: "Hoofdafbeelding (URL of pad)",
    en: "Main image (URL or path)",
    de: "Hauptbild (URL oder Pfad)",
    fr: "Image principale (URL ou chemin)",
  },
  extra_image_urls: {
    nl: "Overige afbeeldingen",
    en: "Additional images",
    de: "Weitere Bilder",
    fr: "Images supplémentaires",
  },
  video_url: {
    nl: "Video-URL",
    en: "Video URL",
    de: "Video-URL",
    fr: "URL vidéo",
  },
  production_country: {
    nl: "Productieland",
    en: "Country of production",
    de: "Produktionsland",
    fr: "Pays de production",
  },
  production_location: {
    nl: "Productieplaats",
    en: "Place of production",
    de: "Produktionsort",
    fr: "Lieu de production",
  },
  assembly_eu_band: {
    nl: "Assemblage",
    en: "Assembly",
    de: "Montage",
    fr: "Assemblage",
  },
  parts_eu_level: {
    nl: "Onderdelen",
    en: "Parts",
    de: "Teile",
    fr: "Pièces",
  },
  materials_eu_level: {
    nl: "Materialen",
    en: "Materials",
    de: "Materialien",
    fr: "Matériaux",
  },
  european_ownership_band: {
    nl: "Europees eigendom van het merk",
    en: "European brand ownership",
    de: "Europäisches Markeneigentum",
    fr: "Propriété européenne de la marque",
  },
  ce_marking: {
    nl: "CE-markering zichtbaar",
    en: "CE marking visible",
    de: "CE-Kennzeichnung sichtbar",
    fr: "Marquage CE visible",
  },
  app_required: {
    nl: "App vereist",
    en: "App required",
    de: "App erforderlich",
    fr: "Application requise",
  },
  collects_data: {
    nl: "Verwerkt gebruikersgegevens",
    en: "Processes user data",
    de: "Verarbeitet Nutzerdaten",
    fr: "Traite des données utilisateur",
  },
  product_languages: {
    nl: "Producttaal",
    en: "Product language",
    de: "Produktsprache",
    fr: "Langue du produit",
  },
  manual_languages: {
    nl: "Taal handleiding",
    en: "Manual language",
    de: "Sprache der Anleitung",
    fr: "Langue du manuel",
  },
  gpsr_manufacturer_name: {
    nl: "GPSR-fabrikantnaam (etiket)",
    en: "GPSR manufacturer name (label)",
    de: "GPSR-Herstellername (Etikett)",
    fr: "Nom fabricant GPSR (étiquette)",
  },
  gpsr_manufacturer_address: {
    nl: "Fabrikantadres (straat + nr)",
    en: "Manufacturer address (street + no.)",
    de: "Herstelleradresse (Straße + Nr.)",
    fr: "Adresse fabricant (rue + n°)",
  },
  gpsr_manufacturer_postal_city: {
    nl: "Fabrikant postcode + plaats",
    en: "Manufacturer postcode + city",
    de: "Hersteller PLZ + Ort",
    fr: "Fabricant code postal + ville",
  },
  gpsr_manufacturer_country: {
    nl: "Fabrikant land",
    en: "Manufacturer country",
    de: "Herstellerland",
    fr: "Pays du fabricant",
  },
  gpsr_manufacturer_email: {
    nl: "Fabrikant e-mail / elektronisch contact",
    en: "Manufacturer email / electronic contact",
    de: "Hersteller-E-Mail / elektronischer Kontakt",
    fr: "E-mail fabricant / contact électronique",
  },
  gpsr_eu_responsible_name: {
    nl: "EU verantwoordelijke persoon / economic operator",
    en: "EU responsible person / economic operator",
    de: "EU-verantwortliche Person / economic operator",
    fr: "Personne responsable UE / opérateur économique",
  },
  gpsr_eu_responsible_address: {
    nl: "EU verantwoordelijke — adres",
    en: "EU responsible — address",
    de: "EU-Verantwortlicher — Adresse",
    fr: "Responsable UE — adresse",
  },
  gpsr_eu_responsible_postal_city: {
    nl: "EU verantwoordelijke — postcode + plaats",
    en: "EU responsible — postcode + city",
    de: "EU-Verantwortlicher — PLZ + Ort",
    fr: "Responsable UE — code postal + ville",
  },
  gpsr_eu_responsible_country: {
    nl: "EU verantwoordelijke — land",
    en: "EU responsible — country",
    de: "EU-Verantwortlicher — Land",
    fr: "Responsable UE — pays",
  },
  gpsr_eu_responsible_contact: {
    nl: "EU verantwoordelijke — e-mail/telefoon",
    en: "EU responsible — email/phone",
    de: "EU-Verantwortlicher — E-Mail/Telefon",
    fr: "Responsable UE — e-mail/téléphone",
  },
  eu_production_evidence_url: {
    nl: "EuropMade-bewijs / bewijs van EU-productie",
    en: "EuropMade evidence / EU production proof",
    de: "EuropMade-Nachweis / Nachweis EU-Produktion",
    fr: "Preuve EuropMade / preuve de production UE",
  },
  ce_certificate_url: {
    nl: "CE-certificaat",
    en: "CE certificate",
    de: "CE-Zertifikat",
    fr: "Certificat CE",
  },
  warranty_period: {
    nl: "Garantieperiode",
    en: "Warranty period",
    de: "Garantiezeitraum",
    fr: "Période de garantie",
  },
  safety_sheet_url: {
    nl: "Veiligheidsinformatieblad",
    en: "Safety data sheet",
    de: "Sicherheitsdatenblatt",
    fr: "Fiche de données de sécurité",
  },
  manual_url: {
    nl: "Handleiding",
    en: "Manual",
    de: "Anleitung",
    fr: "Manuel",
  },
  warranty_url: {
    nl: "Garantiebewijs",
    en: "Warranty document",
    de: "Garantienachweis",
    fr: "Justificatif de garantie",
  },
}

for (let i = 1; i <= 5; i++) {
  FIELD_LABELS[`usp_${i}`] = {
    nl: `Belangrijkste kenmerk ${i}`,
    en: `Key feature ${i}`,
    de: `Wichtigstes Merkmal ${i}`,
    fr: `Caractéristique principale ${i}`,
  }
}

for (let i = 1; i <= 10; i++) {
  FIELD_LABELS[`spec_label_${i}`] = {
    nl: `Specificatie ${i} (automatisch)`,
    en: `Specification ${i} (automatic)`,
    de: `Spezifikation ${i} (automatisch)`,
    fr: `Spécification ${i} (automatique)`,
  }
  FIELD_LABELS[`spec_value_${i}`] = {
    nl: `Waarde ${i}`,
    en: `Value ${i}`,
    de: `Wert ${i}`,
    fr: `Valeur ${i}`,
  }
  FIELD_LABELS[`unit_${i}`] = {
    nl: `Eenheid ${i}`,
    en: `Unit ${i}`,
    de: `Einheit ${i}`,
    fr: `Unité ${i}`,
  }
}

/** Requirement / style suffix shown after the field label in Excel headers. */
export function templateRequirementSuffix(
  kind: "required" | "optional" | "conditional" | "automatic" | string,
  locale: TemplateLocale
): string {
  if (locale === "nl") {
    if (kind === "required") return "Verplicht"
    if (kind === "optional") return "Optioneel"
    if (kind === "conditional") return "Voorwaardelijk verplicht"
    if (kind === "automatic") return "Automatisch"
    return kind
  }
  if (locale === "de") {
    if (kind === "required") return "Pflicht"
    if (kind === "optional") return "Optional"
    if (kind === "conditional") return "Bedingt"
    if (kind === "automatic") return "Automatisch"
    return kind
  }
  if (locale === "fr") {
    if (kind === "required") return "Obligatoire"
    if (kind === "optional") return "Facultatif"
    if (kind === "conditional") return "Conditionnel"
    if (kind === "automatic") return "Automatique"
    return kind
  }
  if (kind === "required") return "Required"
  if (kind === "optional") return "Optional"
  if (kind === "conditional") return "Conditional"
  if (kind === "automatic") return "Automatic"
  return kind
}

const SHEET_TAB_LABELS: Record<string, Record<TemplateLocale, string>> = {
  Producten: {
    nl: "Producten",
    en: "Products",
    de: "Produkte",
    fr: "Produits",
  },
  "Uitleg velden": {
    nl: "Uitleg velden",
    en: "Field guide",
    de: "Feldhilfe",
    fr: "Guide des champs",
  },
  Kenmerken: {
    nl: "Kenmerken",
    en: "Attributes",
    de: "Merkmale",
    fr: "Caractéristiques",
  },
  Legenda: {
    nl: "Legenda",
    en: "Legend",
    de: "Legende",
    fr: "Légende",
  },
}

export function templateSheetTabLabel(
  nlName: string,
  locale: TemplateLocale
): string {
  const row = SHEET_TAB_LABELS[nlName]
  if (!row) return nlName
  return row[locale] || row.en || row.nl || nlName
}

export function templateFieldLabel(
  column: string,
  locale: TemplateLocale,
  fallbackNl?: string
): string {
  const row = FIELD_LABELS[column]
  if (!row) return fallbackNl || column
  return row[locale] || row.en || row.nl || fallbackNl || column
}

/** Extra import aliases so EN/DE/FR downloaded headers map to technical columns. */
export function localizedHeaderAliases(column: string, nlName: string): string[] {
  const out = new Set<string>([nlName, column])
  for (const locale of TEMPLATE_LOCALES) {
    out.add(templateFieldLabel(column, locale, nlName))
  }
  // Common English long forms for category levels
  if (column === "category") {
    out.add("Level 1 (Required)")
    out.add("Niveau 1 (Verplicht)")
  }
  if (column === "subcategory") {
    out.add("Level 2 (Optional)")
    out.add("Niveau 2 (Optioneel)")
  }
  if (column === "subcategory_l3") {
    out.add("Level 3 (Optional)")
    out.add("Niveau 3 (Optioneel)")
  }
  return [...out]
}

export function resolveSellerTemplateLocale(input: {
  queryLocale?: string | null
  sellerLocale?: string | null
  storefrontLocale?: string | null
}): TemplateLocale {
  return normalizeTemplateLocale(
    input.queryLocale || input.sellerLocale || input.storefrontLocale || "en"
  )
}
