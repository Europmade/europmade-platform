/**
 * Brand import workbook: one fill-in sheet and one explanation sheet.
 * Text columns are written once; the admin chooses the file language.
 */

import { IMPORT_FIELDS } from "./import-columns"
import { BRAND_COMMERCIAL_FIELDS, brandImportTargets } from "./brand-import"
import { buildXlsxWorkbook } from "./import-xlsx"

/** Column order for the fill-in sheet. Mapping may still offer every central target. */
export const BRAND_TEMPLATE_LABELS = [
  "EAN / GTIN",
  "Fabrikantnummer / MPN",
  "Productnaam",
  "Korte omschrijving",
  "Uitgebreide beschrijving",
  "Belangrijkste kenmerken / USP's",
  "Productspecificaties",
  "Merk",
  "Fabrikant",
  "Productcategorie",
  "Subcategorie",
  "Hoofdafbeelding (URL of pad)",
  "Afbeelding 2",
  "Afbeelding 3",
  "Afbeelding 4",
  "Afbeelding 5",
  "Afbeelding 6",
  "Afbeelding 7",
  "Afbeelding 8",
  "Afbeelding 9",
  "Afbeelding 10",
  "Overige afbeeldingen",
  "Video-URL",
  "EuropMade-bewijs / bewijs van EU-productie",
  "Handleiding",
  "CE-certificaat",
  "Veiligheidsinformatieblad",
  "Conformiteitsverklaring",
  "Garantiebewijs",
  "Productieland",
  "Productieplaats",
  "CE-markering zichtbaar",
  "App vereist",
  "Verwerkt gebruikersgegevens",
  "Producttaal",
  "Taal handleiding",
  "Fabrikantadres (straat + nr)",
  "Fabrikant postcode + plaats",
  "Fabrikant land",
  "Fabrikant e-mail / elektronisch contact",
  "EU verantwoordelijke persoon / economic operator",
  "EU verantwoordelijke — adres",
  "EU verantwoordelijke — postcode + plaats",
  "EU verantwoordelijke — land",
  "EU verantwoordelijke — e-mail/telefoon",
  "Veiligheidswaarschuwingen",
] as const

export function brandTemplateHeaders(): string[] {
  const available = new Set(brandImportTargets().map((target) => target.label))
  return BRAND_TEMPLATE_LABELS.filter(
    (label) => available.has(label) || /^Afbeelding \d+$/.test(label)
  )
}

function guideRows(): string[][] {
  const fieldRows = brandImportTargets().map((target) => {
    const field = IMPORT_FIELDS.find((item) => item.column === target.field)
    const required = field?.required || "Optioneel"
    const meaning = field?.help || field?.meaning || target.label
    const example = field?.example ? ` Voorbeeld: ${field.example}.` : ""
    return [`${target.group}: ${target.label}`, `${required}. ${meaning}${example}`]
  })
  return [
    ["Onderwerp", "Uitleg"],
    [
      "Bestand invullen en importeren",
      "Vul het tabblad Importtemplate in. Kies op Productaanleveringen de taal van dit bestand, controleer de kolomkoppeling en importeer pas daarna. Er wordt niets opgeslagen vóór die bevestiging.",
    ],
    [
      "Eén taal per bestand",
      "Elk tekstveld staat één keer in de template. De taal die je op de pagina kiest, geldt voor productnaam, korte beschrijving, uitgebreide beschrijving, USP's en specificaties. Een Duits bestand overschrijft geen bestaande Nederlandse tekst. Ontbrekende talen automatisch vertalen blijft een aparte optie en staat uit tot je die aanzet.",
    ],
    [
      "Verplicht en optioneel",
      "EAN/GTIN of MPN, productnaam en merk zijn nodig voor een nieuw product. Overige kolommen zijn optioneel, tenzij de uitleg bij het veld anders zegt.",
    ],
    [
      "Productinformatie, media en compliance",
      "Productnaam, beschrijving, merk, fabrikant, EAN, MPN en categorie horen bij productinformatie. Afbeeldingen, video en document-URL's horen bij media. Productieland, CE, GPSR-adresgegevens, EuropMade-bewijs, app en gegevensverwerking horen bij compliance.",
    ],
    [
      "EAN/GTIN en MPN",
      "EAN/GTIN is het primaire nummer waarmee een bestaand product wordt herkend. MPN is het fabrikantnummer en wordt alleen gebruikt als er geen EAN is. Een seller-SKU is geen productidentiteit en wordt niet geïmporteerd.",
    ],
    [
      "Categorie en subcategorie",
      "Vul de bestaande hoofdcategorie in Productcategorie en de subcategorie in Subcategorie. Een onbekende naam blokkeert het bestand niet. Admin bevestigt de naam en de hoofdcategorie voordat die wordt aangemaakt.",
    ],
    [
      "Variantkolommen",
      "Varianttype en variantwaarde horen niet in dit bestand. Staan ze in een ouder bestand, dan worden ze genegeerd en niet opgeslagen.",
    ],
    [
      "Fabrikant",
      "Fabrikant is het enige fabrikantveld. Een aparte kolom Fabrikantnaam of GPSR-fabrikantnaam wordt niet geïmporteerd. Adres, postcode, land en contact van de fabrikant, en de EU-verantwoordelijke persoon, blijven aparte compliancevelden.",
    ],
    [
      "Meerdere afbeeldingen en documenten",
      "Zet de hoofdfoto in Hoofdafbeelding. Extra foto's horen in Afbeelding 2 tot en met Afbeelding 10, in die volgorde. Overige afbeeldingen blijft bruikbaar voor oudere bestanden, met URL's gescheiden door | of ;. Samen maximaal 10 afbeeldingen. Een elfde afbeelding blokkeert de rij. Dezelfde URL wordt één keer gekoppeld. Handleiding en certificaat zijn https-URL's. Externe bestanden worden gekopieerd; een lokale of privé-URL wordt geweigerd.",
    ],
    [
      "Bewijs van EU-productie",
      "Gebruik EuropMade-bewijs / bewijs van EU-productie voor een document-URL. Het bestand wordt opgeslagen als bewijs en blijft in afwachting van beoordeling. Het wordt niet automatisch goedgekeurd en de verificatiestatus wordt niet VERIFIED.",
    ],
    [
      "Wat niet wordt geïmporteerd",
      `Prijs, actieprijs, voorraad, seller-SKU, levertijd, verzendkosten, verzendprofiel, verkoopstatus en markt worden niet opgeslagen en maken geen offer. Die kolommen zijn: ${BRAND_COMMERCIAL_FIELDS.join(", ")}.`,
    ],
    ...fieldRows,
  ]
}

export function buildBrandImportWorkbook(): Buffer {
  const headers = brandTemplateHeaders()
  return buildXlsxWorkbook([
    { name: "Importtemplate", rows: [headers] },
    { name: "Uitleg", rows: guideRows() },
  ])
}
