import {
  parseXlsxWorkbook,
  sheetToRecords,
} from "../import-xlsx"
import {
  FASE5B_SHEET_CONTENT,
  FASE5B_SHEET_IMAGES,
  FASE5B_SHEET_PRODUCTS,
} from "./constants"

export type Fase5bProductRow = {
  em_product_id: string
  bedrijf: string
  merk: string
  productnaam: string
  ean_gtin: string
  mpn: string
  claude_hoofdcategorie: string
  subcategorie: string
  product_url: string
  fabrikant: string
  fabrikantland: string
  productieland: string
  productieplaats: string
  made_in_claim: string
  eu_productie_bewijs: string
  verification_status: string
  verification_datum: string
  productstatus: string
  opmerkingen: string
}

export type Fase5bContentRow = {
  em_product_id: string
  korte_beschrijving: string
  lange_beschrijving: string
  usps: string
  specificaties: string
}

export type Fase5bImageRow = {
  em_product_id: string
  afbeeldingstype: string
  bron_url: string
  afbeelding_url: string
  geselecteerd: boolean
  kwaliteit: string
  opmerking: string
}

export type Fase5bWorkbook = {
  products: Fase5bProductRow[]
  contentByEmId: Map<string, Fase5bContentRow>
  selectedImagesByEmId: Map<string, Fase5bImageRow[]>
}

function yes(value: string): boolean {
  return ["ja", "yes", "true", "1", "x"].includes(value.trim().toLowerCase())
}

/** Decode HTML entities from Excel export cells (e.g. Sport &amp; Outdoor). */
export function decodeExcelCell(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

export function loadFase5bWorkbook(buf: Buffer): Fase5bWorkbook {
  const wb = parseXlsxWorkbook(buf)
  const productTable = wb.sheets.get(FASE5B_SHEET_PRODUCTS)
  if (!productTable) {
    throw new Error(`Tabblad ontbreekt: ${FASE5B_SHEET_PRODUCTS}`)
  }
  const productRecords = sheetToRecords(productTable)
  const products: Fase5bProductRow[] = productRecords.map((r) => ({
    em_product_id: decodeExcelCell(r["Product-ID"] || ""),
    bedrijf: decodeExcelCell(r["Bedrijf"] || ""),
    merk: decodeExcelCell(r["Merk"] || ""),
    productnaam: decodeExcelCell(r["Productnaam"] || ""),
    ean_gtin: decodeExcelCell(r["EAN/GTIN"] || ""),
    mpn: decodeExcelCell(r["MPN/artikelnummer"] || ""),
    claude_hoofdcategorie: decodeExcelCell(r["EuropMade-hoofdcategorie"] || ""),
    subcategorie: decodeExcelCell(r["Subcategorie"] || ""),
    product_url: decodeExcelCell(r["Product-URL"] || ""),
    fabrikant: decodeExcelCell(r["Fabrikant"] || ""),
    fabrikantland: decodeExcelCell(r["Fabrikantland"] || ""),
    productieland: decodeExcelCell(r["Productieland"] || ""),
    productieplaats: decodeExcelCell(r["Productieplaats"] || ""),
    made_in_claim: decodeExcelCell(r["Made-in claim"] || ""),
    eu_productie_bewijs: decodeExcelCell(r["EU-productie bewijs"] || ""),
    verification_status: decodeExcelCell(r["Verification-status"] || ""),
    verification_datum: decodeExcelCell(r["Verification-datum"] || ""),
    productstatus: decodeExcelCell(r["Productstatus"] || ""),
    opmerkingen: decodeExcelCell(r["Opmerkingen"] || ""),
  }))

  const contentByEmId = new Map<string, Fase5bContentRow>()
  const contentTable = wb.sheets.get(FASE5B_SHEET_CONTENT)
  if (contentTable) {
    for (const r of sheetToRecords(contentTable)) {
      const id = r["Product-ID"]?.trim()
      if (!id) continue
      contentByEmId.set(id, {
        em_product_id: id,
        korte_beschrijving: r["Korte beschrijving"] || "",
        lange_beschrijving: r["Lange beschrijving"] || "",
        usps: r["USP's"] || "",
        specificaties: r["Specificaties"] || "",
      })
    }
  }

  const selectedImagesByEmId = new Map<string, Fase5bImageRow[]>()
  const imageTable = wb.sheets.get(FASE5B_SHEET_IMAGES)
  if (imageTable) {
    for (const r of sheetToRecords(imageTable)) {
      if (!yes(r["Geselecteerd"] || "")) continue
      const id = r["Product-ID"]?.trim()
      if (!id) continue
      const row: Fase5bImageRow = {
        em_product_id: id,
        afbeeldingstype: r["Afbeeldingstype"] || "",
        bron_url: r["Bron-URL"] || "",
        afbeelding_url: r["Afbeelding-URL"] || "",
        geselecteerd: true,
        kwaliteit: r["Kwaliteit"] || "",
        opmerking: r["Opmerking"] || "",
      }
      const list = selectedImagesByEmId.get(id) || []
      list.push(row)
      selectedImagesByEmId.set(id, list)
    }
  }

  return { products, contentByEmId, selectedImagesByEmId }
}
