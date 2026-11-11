/**
 * Brand import workbook: fill-in sheet, explanation, shared Lijsten / CatDeps
 * (same dropdown sources and dependent subcategory validation as seller).
 */

import {
  EXTRA_IMAGE_SLOT_LABELS,
  IMPORT_FIELDS,
  PRODUCT_SPEC_SLOT_COUNT,
  fieldRequirementStyle,
  type ImportFieldDef,
} from "./import-columns"
import { BRAND_COMMERCIAL_FIELDS, brandImportTargets } from "./brand-import"
import {
  buildProductImportTemplate,
  buildXlsxWorkbook,
} from "./import-xlsx"
import { dependentSubcategoryFormula } from "./import-category-excel"

const COMMERCIAL = new Set<string>(BRAND_COMMERCIAL_FIELDS)

/** Shared with Seller template (IMPL-05 / OB-05). */
const ADMIN_EXTRA_IMAGE_LABELS = EXTRA_IMAGE_SLOT_LABELS

const ADMIN_DOCUMENT_LABELS = [
  "EuropMade-bewijs / bewijs van EU-productie",
  "Handleiding",
  "CE-certificaat",
  "Veiligheidsinformatieblad",
  "Conformiteitsverklaring",
  "Garantiebewijs",
] as const

/**
 * Admin headers = Seller central columns (same order/labels) minus commerce,
 * plus Admin-only image slots and document URL columns.
 */
export function brandTemplateHeaders(): string[] {
  const targets = brandImportTargets()
  const availableFields = new Set(targets.map((t) => t.field))
  const availableLabels = new Set(targets.map((t) => t.label))
  const headers: string[] = []
  for (const field of IMPORT_FIELDS) {
    if (COMMERCIAL.has(field.column)) continue
    if (!availableFields.has(field.column)) continue
    headers.push(field.nl_name)
    if (field.column === "primary_image_url") {
      headers.push(...ADMIN_EXTRA_IMAGE_LABELS)
    }
    if (field.column === "video_url") {
      for (const doc of ADMIN_DOCUMENT_LABELS) {
        if (availableLabels.has(doc) || doc.startsWith("EuropMade-bewijs")) {
          headers.push(doc)
        }
      }
    }
  }
  for (const doc of ADMIN_DOCUMENT_LABELS) {
    if (!headers.includes(doc)) headers.push(doc)
  }
  return headers
}

/** Snapshot of headers for tests that compare against a fixed list shape. */
export const BRAND_TEMPLATE_LABELS = brandTemplateHeaders()

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
      "Vul de bestaande hoofdcategorie in Niveau 1. De Niveau 2-dropdown toont alleen kinderen van niveau 1; Niveau 3 toont kinderen van niveau 2. Oudere bestanden met Productcategorie of Subcategorie blijven herkend. Ongeldige combinaties worden bij import geweigerd. Zie ook tabblad Kenmerken voor categoriegebonden productkenmerken (Maat, Kleur, …) die je na upload in de preview aanvult.",
    ],
    [
      "Productspecificaties (Specificatie 1–10)",
      "Namen volgen automatisch uit de gekozen subcategorie (SpecDeps / Excel-formules). Vul alleen Waarde 1–10 in. Lege waarden worden niet opgeslagen. Er is geen apart Specificaties-importblad. Server valideert altijd tegen de catalogus.",
    ],
    [
      "Variantkolommen",
      "Varianttype en variantwaarde horen niet in dit bestand. Staan ze in een ouder bestand, dan worden ze genegeerd en niet opgeslagen.",
    ],
    [
      "Fabrikant",
      "Kolom Fabrikant koppelt de catalogusentiteit (manufacturer_id). GPSR-fabrikantnaam (etiket) is de etiketnaam en staat los van de catalogusfabrikant. Adres, postcode, land en contact, en de EU-verantwoordelijke persoon, blijven aparte compliancevelden.",
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

function listKeyForBrandHeader(
  label: string
): NonNullable<ImportFieldDef["list"]> | null {
  const field = IMPORT_FIELDS.find((item) => item.nl_name === label)
  if (field?.list) return field.list
  return null
}

function colName(index: number): string {
  let n = index
  let s = ""
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

export function buildBrandImportWorkbook(
  options: {
    categories?: Array<{
      id: string
      name: string
      slug?: string | null
      parent_id?: string | null
      parent_category_id?: string | null
    }>
  } = {}
): Buffer {
  const headers = brandTemplateHeaders()
  const sellerTpl = buildProductImportTemplate([], {
    categories: options.categories || [],
  })
  const listSheet = sellerTpl.sheets.find((sheet) => sheet.name === "Lijsten")
  const catDeps = sellerTpl.sheets.find((sheet) => sheet.name === "CatDeps")
  const catDepsL3 = sellerTpl.sheets.find((sheet) => sheet.name === "CatDepsL3")
  const specDeps = sellerTpl.sheets.find((sheet) => sheet.name === "SpecDeps")
  const kenmerken = sellerTpl.sheets.find((sheet) => sheet.name === "Kenmerken")
  const styleForRequired = (required: ImportFieldDef["required"] | undefined): number => {
    const kind = fieldRequirementStyle(required || "Optioneel")
    if (kind === "required") return 1
    if (kind === "optional") return 2
    if (kind === "conditional") return 3
    if (kind === "automatic") return 4
    return 2
  }
  const headerStyles = headers.map((label) => {
    if (ADMIN_EXTRA_IMAGE_LABELS.includes(label as (typeof ADMIN_EXTRA_IMAGE_LABELS)[number])) {
      return 2
    }
    if ((ADMIN_DOCUMENT_LABELS as readonly string[]).includes(label)) {
      return 2
    }
    const field = IMPORT_FIELDS.find((item) => item.nl_name === label)
    return styleForRequired(field?.required)
  })
  const listRows = listSheet?.rows || [
    [
      "landcodes",
      "sales_status",
      "ce_marking",
      "ja_nee",
      "hoofdcategorieen",
      "subcategorieen",
      "hoofdcategorie_naam",
      "sublijst_sleutel",
    ],
  ]
  const rootCount = Math.max(
    listRows.slice(1).filter((row) => row[4]).length,
    1
  )
  const mapLast = Math.max(rootCount, 1) + 1
  const hasDependent = Boolean(
    sellerTpl.definedNames?.length &&
      listRows.slice(1).some((row) => row[7])
  )
  const categoryIdx = headers.findIndex((h) =>
    /^(Niveau 1|Productcategorie)$/i.test(h.trim())
  )
  const subcategoryIdx = headers.findIndex((h) =>
    /^(Niveau 2|Subcategorie)$/i.test(h.trim())
  )
  const l3Count = listRows.slice(1).filter((row) => row[17]).length
  const hasL3Dependent = Boolean(
    sellerTpl.definedNames?.some((d) => String(d.refersTo || "").includes("CatDepsL3"))
  )
  const l2MapLast =
    Math.max(listRows.slice(1).filter((row) => row[15]).length, 1) + 1
  const categoryCol = colName(Math.max(categoryIdx, 0))
  const subcategoryCol = colName(Math.max(subcategoryIdx, 0))
  const specMapLast =
    Math.max(
      listRows.slice(1).filter((row) => row[13]).length,
      1
    ) + 1

  const mieAssemblyLast =
    Math.max(
      listRows.slice(1).filter((row) => row[9]).length,
      1
    ) + 1
  const miePartsLast =
    Math.max(
      listRows.slice(1).filter((row) => row[10]).length,
      1
    ) + 1
  const mieMaterialsLast =
    Math.max(
      listRows.slice(1).filter((row) => row[11]).length,
      1
    ) + 1
  const eoLast =
    Math.max(
      listRows.slice(1).filter((row) => row[12]).length,
      1
    ) + 1

  const listCols: Record<
    Exclude<NonNullable<ImportFieldDef["list"]>, "variant_type">,
    string
  > = {
    land: "'Lijsten'!$A$2:$A$32",
    sales_status: "'Lijsten'!$B$2:$B$3",
    ce_marking: "'Lijsten'!$C$2:$C$3",
    ja_nee: "'Lijsten'!$D$2:$D$3",
    category: `'Lijsten'!$E$2:$E$${rootCount + 1}`,
    subcategory:
      hasDependent && categoryIdx >= 0
        ? dependentSubcategoryFormula(
            `${categoryCol}2`,
            "Lijsten",
            2,
            mapLast,
            "G",
            "H"
          )
        : `'Lijsten'!$F$2:$F$${Math.max(listRows.slice(1).filter((r) => r[5]).length, 1) + 1}`,
    subcategory_l3:
      hasL3Dependent && subcategoryIdx >= 0
        ? dependentSubcategoryFormula(
            `${subcategoryCol}2`,
            "Lijsten",
            2,
            l2MapLast,
            "P",
            "Q"
          )
        : `'Lijsten'!$R$2:$R$${Math.max(l3Count, 1) + 1}`,
    mie_assembly: `'Lijsten'!$J$2:$J$${mieAssemblyLast}`,
    mie_parts: `'Lijsten'!$K$2:$K$${miePartsLast}`,
    mie_materials: `'Lijsten'!$L$2:$L$${mieMaterialsLast}`,
    european_ownership: `'Lijsten'!$M$2:$M$${eoLast}`,
  }

  const validations = headers
    .map((label, idx) => {
      const list = listKeyForBrandHeader(label)
      if (!list || list === "sales_status") return null
      if (list === "subcategory" && !hasDependent && !listRows.slice(1).some((r) => r[5])) {
        return null
      }
      if (list === "subcategory_l3" && !hasL3Dependent && l3Count === 0) {
        return null
      }
      if (!listCols[list]) return null
      return {
        sqref: `${colName(idx)}2:${colName(idx)}200`,
        formula: listCols[list],
      }
    })
    .filter(Boolean) as Array<{ sqref: string; formula: string }>

  const hasSpecMap = listRows.slice(1).some((row) => row[13] && row[14])
  const importRows: string[][] = []
  for (let excelRow = 2; excelRow <= 200; excelRow++) {
    const row = headers.map(() => "")
    if (hasSpecMap && subcategoryIdx >= 0) {
      for (let slot = 1; slot <= PRODUCT_SPEC_SLOT_COUNT; slot++) {
        const label = `Specificatie ${slot} (automatisch)`
        const colIdx = headers.indexOf(label)
        if (colIdx < 0) continue
        row[colIdx] =
          `=IFERROR(INDEX(INDIRECT(VLOOKUP(${subcategoryCol}${excelRow},Lijsten!$N$2:$O$${specMapLast},2,FALSE)),${slot}),"")`
      }
    }
    importRows.push(row)
  }

  const sheets = [
    {
      name: "Importtemplate",
      rows: [headers, ...importRows],
      headerStyles,
      validations,
    },
    { name: "Uitleg", rows: guideRows(), headerStyles: [1, 1] },
    { name: "Lijsten", rows: listRows },
  ]
  if (catDeps) sheets.push({ name: "CatDeps", rows: catDeps.rows })
  if (catDepsL3) sheets.push({ name: "CatDepsL3", rows: catDepsL3.rows })
  if (specDeps) sheets.push({ name: "SpecDeps", rows: specDeps.rows })
  if (kenmerken) sheets.push({ name: "Kenmerken", rows: kenmerken.rows })

  return buildXlsxWorkbook(sheets, {
    definedNames: sellerTpl.definedNames || [],
  })
}
