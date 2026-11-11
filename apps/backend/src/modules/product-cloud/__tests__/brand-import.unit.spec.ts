import { suggestMapping } from "../import-mapping"
import {
  assertBrandPlanHasNoOffers,
  collectBrandImageSlots,
  headerSignature,
  planBrandCommit,
  normalizeProductionCountry,
  previewBrandImport,
  profileCanAutoApply,
  undoCreatedCategoryIds,
  type ExistingProductHit,
} from "../brand-import"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { catalogOfferStats, offerCountLabel, offerListRows, offerPresence } from "../catalog-offer-summary"
import { buildBrandImportWorkbook } from "../brand-import-template"
import {
  buildProductImportTemplate,
  buildXlsxWorkbook,
  parseXlsxProductGrid,
  parseXlsxWorkbook,
} from "../import-xlsx"
import { inflateRawSync, inflateSync } from "node:zlib"

const BOSCH = "4242005482320"

describe("admin brand import", () => {
  it("keeps the seller mapper commercial so the seller import is unchanged", () => {
    const mapping = suggestMapping(["EAN-code", "Productnaam", "Prijs", "Voorraad"])
    expect(mapping.ean).toBe("EAN-code")
    expect(mapping.regular_price).toBe("Prijs")
    expect(mapping.stock).toBe("Voorraad")
  })

  it("maps two differently ordered files onto the same central fields and drops commerce", () => {
    const fileA = previewBrandImport({
      headers: [
        "Product name",
        "Brand",
        "EAN",
        "MPN",
        "Category",
        "Description",
        "Image URL",
        "Price",
        "Stock",
      ],
      rows: [
        [
          "Bosch vaatwasser",
          "Bosch",
          BOSCH,
          "SMD8TCX04E",
          "Huishouden",
          "Volledig geïntegreerd",
          "https://cdn.example.com/bosch.jpg",
          "1749",
          "4",
        ],
      ],
      source_language_code: "en",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "brand_bosch", name: "Bosch" }],
      categories: [{ id: "cat_1", name: "Huishouden", slug: "huishouden" }],
    })
    const fileB = previewBrandImport({
      headers: [
        "Barcode",
        "Artikelnaam",
        "Merknaam",
        "Fabrikantnummer",
        "Productcategorie",
        "Omschrijving",
        "Hoofdafbeelding",
        "Artikelnummer",
        "Voorraad",
      ],
      rows: [
        [
          BOSCH,
          "Bosch vaatwasser",
          "Bosch",
          "SMD8TCX04E",
          "Huishouden",
          "Volledig geïntegreerd",
          "https://cdn.example.com/bosch.jpg",
          "SKU-SELLER-1",
          "9",
        ],
      ],
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "brand_bosch", name: "Bosch" }],
      categories: [{ id: "cat_1", name: "Huishouden", slug: "huishouden" }],
    })

    expect(fileA.commercial_columns).toEqual(expect.arrayContaining(["Price", "Stock"]))
    expect(fileB.commercial_columns).toEqual(["Voorraad"])
    expect(fileA.links.find((l) => l.source === "Artikelnummer")).toBeUndefined()
    const artikel = fileB.links.find((l) => l.source === "Artikelnummer")
    expect(artikel?.imported).toBe(false)
    expect(artikel?.message || "").toMatch(/seller-SKU|MPN/i)
    expect(fileA.preview[0].ean).toBe(BOSCH)
    expect(fileB.preview[0].ean).toBe(BOSCH)
    expect(fileA.preview[0].title).toBe("Bosch vaatwasser")
    expect(fileB.preview[0].title).toBe("Bosch vaatwasser")
    expect(fileA.creates_offers).toBe(false)
    expect(fileB.creates_offers).toBe(false)

    const plan = planBrandCommit(fileA, {
      headers: fileA.headers,
      rows: [
        [
          "Bosch vaatwasser",
          "Bosch",
          BOSCH,
          "SMD8TCX04E",
          "Huishouden",
          "Volledig geïntegreerd",
          "https://cdn.example.com/bosch.jpg",
          "1749",
          "4",
        ],
      ],
      mapping_confirmed: true,
    })
    expect(plan.blocked).toBe(false)
    expect(plan.actions.map((a) => a.type)).toEqual(["create"])
    assertBrandPlanHasNoOffers(plan.actions)
    expect(JSON.stringify(plan.actions)).not.toContain("1749")
    expect(JSON.stringify(plan.actions)).not.toContain("seller_sku")
  })

  it("stores Dutch and German columns as separate language slots", () => {
    const preview = previewBrandImport({
      headers: ["EAN", "Productnaam (NL)", "Produktname (DE)", "Merk", "Categorie", "MPN"],
      rows: [[BOSCH, "Nederlandse naam", "Deutscher Name", "Bosch", "Huishouden", "SMD8"]],
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "brand_bosch", name: "Bosch" }],
      categories: [{ id: "cat_1", name: "Huishouden", slug: "huishouden" }],
    })
    const texts = preview.preview[0].texts
    expect(texts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "title", language_code: "nl", value: "Nederlandse naam" }),
        expect.objectContaining({ field: "title", language_code: "de", value: "Deutscher Name" }),
      ])
    )
  })

  it("asks for confirmation when the language is unclear", () => {
    const preview = previewBrandImport({
      headers: ["Code", "Name", "Value"],
      rows: [["ABC-1", "Widget", "12"]],
    })
    expect(preview.language.needs_confirmation).toBe(true)
    expect(preview.commit_allowed).toBe(false)
    const plan = planBrandCommit(preview, {
      headers: ["Code", "Name", "Value"],
      rows: [["ABC-1", "Widget", "12"]],
      mapping_confirmed: true,
    })
    expect(plan.blocked).toBe(true)
    expect(plan.actions).toEqual([])
  })

  it("does not overwrite an existing translation in another language", () => {
    const existing: ExistingProductHit[] = [
      {
        product_id: "prod_bosch",
        publication_status: "Gepubliceerd",
        title: "Nederlandse naam",
        description: "Bestaande tekst",
        gtin: BOSCH,
        mpn: "SMD8",
        translations: [
          { field_name: "title", language_code: "nl", value: "Nederlandse naam" },
          { field_name: "title", language_code: "de", value: "Alter deutscher Name" },
        ],
      },
    ]
    const headers = ["EAN", "Productnaam (NL)", "Produktname (DE)", "Merk", "Categorie"]
    const rows = [[BOSCH, "Nederlandse naam", "Neuer deutscher Name", "Bosch", "Huishouden"]]
    const preview = previewBrandImport({
      headers,
      rows,
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      existing,
      known_brands: [{ id: "b", name: "Bosch" }],
      categories: [{ id: "c", name: "Huishouden", slug: "huishouden" }],
    })
    expect(preview.summary.existing_products).toBe(1)
    expect(preview.summary.new_products).toBe(0)
    const plan = planBrandCommit(preview, {
      headers,
      rows,
      existing,
      mapping_confirmed: true,
    })
    expect(plan.actions.some((a) => a.type === "create")).toBe(false)
    const proposal = plan.actions.find((a) => a.type === "proposal")
    expect(proposal && proposal.type === "proposal" ? proposal.changes : []).toEqual([
      expect.objectContaining({
        field: "title",
        language_code: "de",
        current_value: "Alter deutscher Name",
        proposed_value: "Neuer deutscher Name",
      }),
    ])
    expect(plan.actions.some((a) => a.type === "add_translations")).toBe(false)
  })

  it("adds a missing language without touching the existing one", () => {
    const existing: ExistingProductHit[] = [
      {
        product_id: "prod_bosch",
        publication_status: "Gepubliceerd",
        title: "Nederlandse naam",
        description: "",
        gtin: BOSCH,
        mpn: null,
        translations: [{ field_name: "title", language_code: "nl", value: "Nederlandse naam" }],
      },
    ]
    const headers = ["EAN", "Productnaam (NL)", "Produktname (DE)"]
    const rows = [[BOSCH, "Nederlandse naam", "Deutscher Name"]]
    const preview = previewBrandImport({
      headers,
      rows,
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      existing,
    })
    const plan = planBrandCommit(preview, { headers, rows, existing, mapping_confirmed: true })
    expect(plan.actions).toEqual([
      expect.objectContaining({
        type: "add_translations",
        product_id: "prod_bosch",
        texts: [expect.objectContaining({ language_code: "de", value: "Deutscher Name" })],
      }),
    ])
  })

  it("stores an invalid EAN as a concept and still commits the other row", () => {
    const headers = ["EAN", "Productnaam", "Merk", "Categorie"]
    const rows = [
      [BOSCH, "Goed product", "Bosch", "Huishouden"],
      ["123", "Slecht product", "Bosch", "Huishouden"],
    ]
    const preview = previewBrandImport({
      headers,
      rows,
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "b", name: "Bosch" }],
      categories: [{ id: "c", name: "Huishouden", slug: "huishouden" }],
    })
    expect(preview.summary.error_rows).toBe(0)
    expect(preview.commit_allowed).toBe(true)
    expect(preview.preview[1]?.issues.some((issue) => issue.field === "ean" && !issue.blocking)).toBe(true)
    const plan = planBrandCommit(preview, { headers, rows, mapping_confirmed: true })
    expect(plan.blocked).toBe(false)
    const creates = plan.actions.filter((action) => action.type === "create")
    expect(creates).toHaveLength(2)
    expect(creates[1] && creates[1].type === "create" ? creates[1].ean : "x").toBe("")
    expect(creates[1] && creates[1].type === "create" ? creates[1].import_ref : "").toMatch(/^DRAFT-/)
  })

  it("refuses a saved profile when the columns changed", () => {
    const signature = headerSignature(["EAN", "Productnaam", "Merk"])
    const profile = {
      source_key: "Bosch",
      header_signature: signature,
      mapping: { ean: "EAN", title: "Productnaam", brand: "Merk" },
      column_languages: { title: "nl" },
    }
    expect(profileCanAutoApply(profile, ["EAN", "Productnaam", "Merk"]).ok).toBe(true)
    const changed = previewBrandImport({
      headers: ["EAN", "Productnaam", "Merk", "Extra"],
      rows: [[BOSCH, "Naam", "Bosch", "x"]],
      profile,
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
    })
    expect(changed.profile_applied).toBe(false)
    expect(changed.profile_review_required).toBe(true)
    expect(changed.commit_allowed).toBe(false)
  })
})

describe("catalog versus offers", () => {
  const products = ["prod_none", "prod_one", "prod_many"]
  const links = [
    { product_id: "prod_one", offer_id: "offr_1", seller_id: "sel_a", region_code: "NL" },
    { product_id: "prod_many", offer_id: "offr_2", seller_id: "sel_a", region_code: "NL" },
    { product_id: "prod_many", offer_id: "offr_3", seller_id: "sel_b", region_code: "DE" },
  ]

  it("lists a product without an offer in the catalog and not as an offer", () => {
    const stats = catalogOfferStats(products, links)
    expect(stats.get("prod_none")).toEqual({ offer_count: 0, seller_count: 0 })
    expect(offerListRows(links).some((row) => row.product_id === "prod_none")).toBe(false)
    expect(products).toContain("prod_none")
  })

  it("keeps one catalog row when several sellers offer the same product", () => {
    const stats = catalogOfferStats(products, links)
    expect(new Set(products).size).toBe(3)
    expect(stats.get("prod_many")).toEqual({ offer_count: 2, seller_count: 2 })
    expect(offerListRows(links)).toHaveLength(3)
    expect(offerListRows(links).filter((row) => row.product_id === "prod_many")).toHaveLength(2)
  })

  it("counts offers, including two offers from one seller, and can filter to one product", () => {
    const sameSeller = [
      { product_id: "prod_one", offer_id: "a", seller_id: "sel_a", region_code: "NL" },
      { product_id: "prod_one", offer_id: "b", seller_id: "sel_a", region_code: "DE" },
    ]
    const stats = catalogOfferStats(["prod_none", "prod_one"], [
      ...sameSeller,
    ])
    expect(offerPresence(stats.get("prod_none"))).toBe("none")
    expect(offerPresence(stats.get("prod_one"))).toBe("multi")
    expect(offerCountLabel(0)).toBe("0")
    expect(offerCountLabel(1)).toBe("1 offer")
    expect(offerCountLabel(stats.get("prod_one")?.offer_count)).toBe("2 offers")
    expect(offerListRows(sameSeller).filter((row) => row.product_id === "prod_one")).toHaveLength(2)
    expect(offerListRows(links).filter((row) => row.product_id === "prod_many")).toHaveLength(2)
  })
})

describe("brand names, categories and the import template", () => {
  const base = {
    source_language_code: "nl",
    language_confirmed: true,
    mapping_confirmed: true,
    known_brands: [{ id: "b", name: "Bosch" }],
    categories: [{ id: "c", name: "Huishouden", slug: "huishouden", parent_id: null }],
  }

  it("creates a new brand without blocking and keeps an exact brand", () => {
    const created = previewBrandImport({
      ...base,
      headers: ["EAN", "Productnaam", "Merk", "Productcategorie"],
      rows: [[BOSCH, "Riess pan", "Riess", "Huishouden"]],
    })
    expect(created.commit_allowed).toBe(true)
    expect(created.brand_proposals).toEqual([
      expect.objectContaining({ name: "Riess", status: "create" }),
    ])
    expect(created.creates_offers).toBe(false)
    const known = previewBrandImport({
      ...base,
      headers: ["EAN", "Productnaam", "Merk", "Productcategorie"],
      rows: [[BOSCH, "Pan", "  bosch  ", "Huishouden"]],
    })
    expect(known.brand_proposals).toEqual([])
    expect(known.commit_allowed).toBe(true)
  })

  it("asks for confirmation when a brand name matches more than one brand", () => {
    const preview = previewBrandImport({
      ...base,
      known_brands: [
        { id: "home", name: "Bosch Home" },
        { id: "pro", name: "Bosch Professional" },
      ],
      headers: ["EAN", "Productnaam", "Merk", "Productcategorie"],
      rows: [[BOSCH, "Pan", "Bosch", "Huishouden"]],
    })
    expect(preview.commit_allowed).toBe(false)
    expect(preview.brand_proposals[0]?.status).toBe("ambiguous")
    const chosen = previewBrandImport({
      ...base,
      known_brands: [
        { id: "home", name: "Bosch Home" },
        { id: "pro", name: "Bosch Professional" },
      ],
      brand_choices: { bosch: { action: "use", id: "home" } },
      headers: ["EAN", "Productnaam", "Merk", "Productcategorie"],
      rows: [[BOSCH, "Pan", "Bosch", "Huishouden"]],
    })
    expect(chosen.commit_allowed).toBe(true)
  })

  it("does not block a new category or subcategory, and recognizes an existing one", () => {
    const fresh = previewBrandImport({
      ...base,
      headers: ["EAN", "Productnaam", "Merk", "Productcategorie", "Subcategorie"],
      rows: [[BOSCH, "Pan", "Bosch", "Keuken", "Pannen"]],
    })
    expect(fresh.commit_allowed).toBe(true)
    expect(fresh.category_proposals.map((item) => item.kind)).toEqual(["category", "subcategory"])
    expect(fresh.preview[0]?.issues.some((issue) => issue.blocking && issue.field === "category")).toBe(false)
    const nested = previewBrandImport({
      ...base,
      categories: [
        { id: "parent", name: "Keuken", slug: "keuken", parent_id: null },
        { id: "child", name: "Pannen", slug: "pannen", parent_id: "parent" },
      ],
      headers: ["EAN", "Productnaam", "Merk", "Productcategorie", "Subcategorie"],
      rows: [[BOSCH, "Pan", "Bosch", "Keuken", "Pannen"]],
    })
    expect(nested.category_proposals).toEqual([])
    expect(nested.commit_allowed).toBe(true)
  })

  it("offers the persistable central fields and leaves yes/no flags unmapped", () => {
    const preview = previewBrandImport({
      ...base,
      headers: ["EAN", "Productnaam", "Beschrijving beschikbaar", "Productieland", "Afbeelding 2"],
      rows: [[BOSCH, "Pan", "Ja", "Oostenrijk", "https://cdn.example.com/2.jpg"]],
    })
    const fields = preview.target_fields.map((field) => field.field)
    expect(fields).toEqual(
      expect.arrayContaining([
        "title",
        "short_description",
        "specifications",
        "primary_image_url",
        "extra_image_urls",
        "video_url",
        "production_country",
        "ce_marking",
        "gpsr_manufacturer_address",
        "category",
        "subcategory",
      ])
    )
    expect(fields).not.toEqual(
      expect.arrayContaining([
        "regular_price",
        "stock",
        "sku",
        "variant_type",
        "variant_value",
        "gpsr_manufacturer_name",
      ])
    )
    const flag = preview.links.find((link) => link.source === "Beschrijving beschikbaar")
    expect(flag?.imported).toBe(false)
    const image = preview.links.find((link) => link.source === "Afbeelding 2")
    expect(image?.field).toBe("extra_image_urls")
  })

  it("builds one workbook with Lijsten dropdowns and one text column per field", () => {
    const workbook = buildBrandImportWorkbook({
      categories: [
        { id: "cat_kleding", name: "Kleding", slug: "kleding", parent_id: null },
        {
          id: "cat_heren",
          name: "Heren",
          slug: "heren",
          parent_category_id: "cat_kleding",
        },
      ],
    })
    const parsed = parseXlsxWorkbook(workbook)
    expect([...parsed.sheets.keys()].sort()).toEqual([
      "CatDeps",
      "CatDepsL3",
      "Importtemplate",
      "Kenmerken",
      "Lijsten",
      "SpecDeps",
      "Uitleg",
    ])
    const listHeader = (parsed.sheets.get("Lijsten") || [])[0] || []
    expect(listHeader).toEqual(
      expect.arrayContaining([
        "niveau1",
        "niveau2_flat",
        "landcodes",
        "niveau1_naam",
        "niveau2_lijst_sleutel",
      ])
    )
    const kenmerken = parsed.sheets.get("Kenmerken") || []
    expect(kenmerken.some((row) => row[1] === "maat")).toBe(true)
    expect(kenmerken.some((row) => row[1] === "kleur")).toBe(true)
    const sellerMirror = buildProductImportTemplate([], {
      categories: [
        { id: "cat_kleding", name: "Kleding", slug: "kleding", parent_id: null },
        {
          id: "cat_heren",
          name: "Heren",
          slug: "heren",
          parent_category_id: "cat_kleding",
        },
      ],
    })
    expect(
      sellerMirror.sheets
        .find((s) => s.name === "Producten")
        ?.validations?.some((v) => /INDIRECT\(VLOOKUP\(/.test(v.formula))
    ).toBe(true)
    const packed = buildXlsxWorkbook(sellerMirror.sheets, {
      definedNames: sellerMirror.definedNames,
    })
    const parts = inflateXlsxParts(packed)
    expect(parts.get("xl/workbook.xml") || "").toMatch(/definedName name="cat_/)
    expect(
      [...parts.values()].some((xml) => /INDIRECT\(VLOOKUP\(/.test(xml))
    ).toBe(true)
    const grid = parseXlsxProductGrid(workbook)
    expect(grid.headers.filter((header) => header === "Productnaam")).toHaveLength(1)
    expect(grid.headers.some((header) => /\((nl|de|en|fr)\)/i.test(header))).toBe(false)
    expect(grid.headers).toEqual(
      expect.arrayContaining([
        "EAN / GTIN",
        "Productnaam",
        "Korte omschrijving",
        "Uitgebreide beschrijving",
        "Fabrikant",
        "EuropMade-bewijs / bewijs van EU-productie",
        "Niveau 2",
      ])
    )
    expect(
      grid.headers.filter(
        (header) =>
          /fabrikant/i.test(header) &&
          !/nummer|adres|postcode|land|e-mail|gpsr/i.test(header)
      )
    ).toEqual(["Fabrikant"])
    expect(grid.headers).toEqual(
      expect.arrayContaining(["GPSR-fabrikantnaam (etiket)"])
    )
    expect(grid.headers).not.toEqual(
      expect.arrayContaining(["Varianttype", "Variantwaarde", "Fabrikantnaam"])
    )
    expect(grid.headers.join(" ")).not.toMatch(/prijs|voorraad|seller-sku|verzendkosten/i)
    const guideText = (parsed.sheets.get("Uitleg") || []).flat().join(" ")
    expect(guideText).toMatch(/niet wordt geïmporteerd/i)
    expect(guideText).toMatch(/niet automatisch goedgekeurd/i)
    expect(guideText).toMatch(/Varianttype en variantwaarde horen niet in dit bestand/)
    const ean = grid.headers.indexOf("EAN / GTIN")
    const title = grid.headers.indexOf("Productnaam")
    const brand = grid.headers.indexOf("Merk")
    const row = grid.headers.map(() => "")
    row[ean] = BOSCH
    row[title] = "Testpan"
    row[brand] = "Bosch"
    const preview = previewBrandImport({
      headers: grid.headers,
      rows: [row],
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "b", name: "Bosch" }],
      categories: [{ id: "c", name: "Huishouden", slug: "huishouden" }],
    })
    expect(preview.links.find((link) => link.field === "ean")?.imported).toBe(true)
    expect(preview.preview[0]?.texts).toEqual([
      expect.objectContaining({ field: "title", language_code: "nl", value: "Testpan" }),
    ])
    expect(preview.commercial_columns).toEqual([])
    expect(preview.creates_offers).toBe(false)
  })

  it("applies the chosen file language once and leaves other translations alone", () => {
    const existing: ExistingProductHit[] = [
      {
        product_id: "prod_bosch",
        publication_status: "Gepubliceerd",
        title: "Nederlandse naam",
        description: "Bestaande tekst",
        gtin: BOSCH,
        mpn: null,
        translations: [
          { field_name: "title", language_code: "nl", value: "Nederlandse naam" },
          { field_name: "title", language_code: "de", value: "Alter deutscher Name" },
        ],
      },
    ]
    const headers = ["EAN", "Productnaam", "Merk"]
    const rows = [[BOSCH, "Neuer Name", "Bosch"]]
    const preview = previewBrandImport({
      headers,
      rows,
      source_language_code: "de",
      language_confirmed: true,
      mapping_confirmed: true,
      existing,
      known_brands: [{ id: "b", name: "Bosch" }],
    })
    expect(preview.preview[0]?.texts).toEqual([
      expect.objectContaining({ field: "title", language_code: "de", value: "Neuer Name" }),
    ])
    const plan = planBrandCommit(preview, { headers, rows, existing, mapping_confirmed: true })
    const proposal = plan.actions.find((action) => action.type === "proposal")
    expect(proposal && proposal.type === "proposal" ? proposal.changes : []).toEqual([
      expect.objectContaining({
        field: "title",
        language_code: "de",
        proposed_value: "Neuer Name",
      }),
    ])
    expect(
      plan.actions.some(
        (action) =>
          action.type === "proposal" &&
          action.changes.some((change) => change.language_code === "nl")
      )
    ).toBe(false)
  })

  it("ignores variant columns from an older file and does not store them", () => {
    const headers = ["EAN", "Productnaam", "Merk", "Varianttype", "Variantwaarde"]
    const rows = [[BOSCH, "Pan", "Bosch", "Smaak", "Rood"]]
    const preview = previewBrandImport({
      headers,
      rows,
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "b", name: "Bosch" }],
    })
    expect(preview.commit_allowed).toBe(true)
    expect(preview.preview[0]?.issues.some((issue) => issue.field === "variant_type")).toBe(false)
    for (const source of ["Varianttype", "Variantwaarde"]) {
      const link = preview.links.find((row) => row.source === source)
      expect(link?.imported).toBe(false)
      expect(link?.field).toBeNull()
      expect(link?.message).toMatch(/niet geïmporteerd/i)
    }
    const plan = planBrandCommit(preview, { headers, rows, mapping_confirmed: true })
    const created = plan.actions.find((action) => action.type === "create")
    expect(created && created.type === "create" ? created.attributes.variant_type : undefined).toBeUndefined()
    expect(created && created.type === "create" ? created.attributes.variant_value : undefined).toBeUndefined()
  })

  it("keeps catalog Fabrikant separate from GPSR-fabrikantnaam (etiket)", () => {
    const legacy = previewBrandImport({
      headers: ["EAN", "Productnaam", "Merk", "Fabrikant", "Fabrikantnaam"],
      rows: [[BOSCH, "Pan", "Bosch", "Bosch NV", "Wettelijke BV"]],
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "b", name: "Bosch" }],
    })
    expect(legacy.links.find((link) => link.source === "Fabrikant")?.field).toBe("manufacturer")
    const legacyName = legacy.links.find((link) => link.source === "Fabrikantnaam")
    expect(legacyName?.imported).toBe(true)
    expect(legacyName?.field).toBe("gpsr_manufacturer_name")
    const current = previewBrandImport({
      headers: ["EAN", "Productnaam", "Merk", "Fabrikant", "GPSR-fabrikantnaam (etiket)"],
      rows: [[BOSCH, "Pan", "Bosch", "Bosch NV", "EU BV"]],
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "b", name: "Bosch" }],
    })
    const gpsrName = current.links.find(
      (link) => link.source === "GPSR-fabrikantnaam (etiket)"
    )
    expect(gpsrName?.imported).toBe(true)
    expect(gpsrName?.field).toBe("gpsr_manufacturer_name")
    const labels = current.target_fields.map((field) => field.label)
    expect(labels.filter((label) => label === "Fabrikant")).toHaveLength(1)
    expect(labels).toContain("GPSR-fabrikantnaam (etiket)")
    const plan = planBrandCommit(current, {
      headers: ["EAN", "Productnaam", "Merk", "Fabrikant", "GPSR-fabrikantnaam (etiket)"],
      rows: [[BOSCH, "Pan", "Bosch", "Bosch NV", "EU BV"]],
      mapping_confirmed: true,
    })
    const created = plan.actions.find((action) => action.type === "create")
    expect(created && created.type === "create" ? created.manufacturer : "").toBe("Bosch NV")
    expect(
      created && created.type === "create"
        ? created.attributes.gpsr_manufacturer_name
        : undefined
    ).toBe("EU BV")
  })

  it("stores EU production evidence as a pending document slot, not an offer", () => {
    const headers = ["EAN", "Productnaam", "Merk", "EuropMade-bewijs / bewijs van EU-productie"]
    const rows = [[BOSCH, "Pan", "Bosch", "https://cdn.example.com/bewijs.pdf"]]
    const preview = previewBrandImport({
      headers,
      rows,
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "b", name: "Bosch" }],
    })
    expect(preview.links.find((link) => link.field === "eu_production_evidence_url")?.imported).toBe(
      true
    )
    expect(preview.creates_offers).toBe(false)
    const plan = planBrandCommit(preview, { headers, rows, mapping_confirmed: true })
    const created = plan.actions.find((action) => action.type === "create")
    expect(created && created.type === "create" ? created.media : []).toEqual([
      expect.objectContaining({
        role: "evidence",
        url: "https://cdn.example.com/bewijs.pdf",
      }),
    ])
    expect(created && created.type === "create" ? created.attributes.eu_production_evidence_url : "").toBe(
      undefined
    )
    const run = readFileSync(join(__dirname, "../../../api/admin/product-cloud/brand-import/run.ts"), "utf8")
    expect(run).toContain('verification_status: "pending"')
    expect(run).not.toContain('verification_status: "approved"')
    expect(run).not.toContain("VERIFIED")
    expect(run).toContain("undoCreatedCategoryIds")
  })

  it("removes a category created before a later hierarchy write fails", async () => {
    const removed: string[] = []
    const created = ["pcgy_parent"]
    await expect(
      (async () => {
        try {
          created.push("pcgy_child")
          throw new Error("subcategorie schrijven mislukt")
        } catch (err) {
          await undoCreatedCategoryIds(created, async (id) => {
            removed.push(id)
          })
          throw err
        }
      })()
    ).rejects.toThrow(/subcategorie schrijven mislukt/)
    expect(removed).toEqual(["pcgy_child", "pcgy_parent"])
    expect(removed).not.toContain("pcgy_existing")
  })
})

describe("brand image columns", () => {
  const image = (n: number) => `https://cdn.example.com/${n}.jpg`

  it("keeps one, three and ten images in order and ignores a repeated url", () => {
    const headers = ["Hoofdafbeelding", "Afbeelding 2", "Afbeelding 3", "Overige afbeeldingen"]
    const row = [image(1), image(1), image(3), `${image(4)}|${image(3)};${image(5)}`]
    const preview = previewBrandImport({
      headers,
      rows: [row],
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
    })
    const collected = collectBrandImageSlots(headers, row, preview.links)
    expect(collected.overflow).toEqual([])
    expect(collected.slots.map((slot) => slot.url)).toEqual([image(1), image(3), image(4), image(5)])
    expect(collected.slots.map((slot) => slot.media_type)).toEqual([
      "Hoofdafbeelding",
      "Overige afbeelding",
      "Overige afbeelding",
      "Overige afbeelding",
    ])

    const tenHeaders = ["Hoofdafbeelding", ...Array.from({ length: 9 }, (_, i) => `Afbeelding ${i + 2}`)]
    const tenRow = Array.from({ length: 10 }, (_, i) => image(i + 1))
    const ten = collectBrandImageSlots(
      tenHeaders,
      tenRow,
      previewBrandImport({
        headers: tenHeaders,
        rows: [tenRow],
        source_language_code: "nl",
        language_confirmed: true,
        mapping_confirmed: true,
      }).links
    )
    expect(ten.slots).toHaveLength(10)
    expect(ten.slots.map((slot) => slot.url)).toEqual(tenRow)
    expect(ten.overflow).toEqual([])
  })

  it("blocks an eleventh image and an invalid image without touching offers", () => {
    const headers = ["EAN", "Productnaam", "Merk", "Hoofdafbeelding", "Overige afbeeldingen"]
    const extras = Array.from({ length: 10 }, (_, i) => image(i + 2)).join("|")
    const preview = previewBrandImport({
      headers,
      rows: [[BOSCH, "Pan", "Bosch", image(1), extras]],
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "b", name: "Bosch" }],
    })
    expect(preview.commit_allowed).toBe(false)
    expect(preview.preview[0]?.issues.some((issue) => /maximaal 10 afbeeldingen/.test(issue.message))).toBe(true)
    expect(preview.creates_offers).toBe(false)

    const invalid = previewBrandImport({
      headers: ["Hoofdafbeelding", "Afbeelding 2"],
      rows: [["https://cdn.example.com/ok.jpg", "http://cdn.example.com/plain.jpg"]],
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
    })
    expect(invalid.preview[0]?.issues.some((issue) => issue.field === "extra_image_urls" && /https/.test(issue.message))).toBe(true)
  })

  it("does not attach images again when the same product is imported again", () => {
    const headers = ["EAN", "Productnaam", "Merk", "Hoofdafbeelding", "Afbeelding 2"]
    const row = [BOSCH, "Pan", "Bosch", image(1), image(2)]
    const preview = previewBrandImport({
      headers,
      rows: [row],
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "b", name: "Bosch" }],
    })
    const existing: ExistingProductHit = {
      product_id: "prod_existing",
      publication_status: "Concept",
      title: "Pan",
      description: "Pan",
      gtin: BOSCH,
      mpn: null,
      translations: [],
    }
    const plan = planBrandCommit(preview, {
      headers,
      rows: [row],
      existing: [existing],
      mapping_confirmed: true,
    })
    expect(plan.blocked).toBe(false)
    expect(plan.actions.some((action) => action.type === "create")).toBe(false)
    expect(JSON.stringify(plan.actions)).not.toContain(image(1))
    expect(plan.creates_offers).toBe(false)
  })

  it("keeps image order on a new product and stops an unreachable download before any product write", () => {
    const headers = ["EAN", "Productnaam", "Merk", "Hoofdafbeelding", "Afbeelding 2", "Afbeelding 3"]
    const row = [BOSCH, "Pan", "Bosch", image(1), image(2), image(3)]
    const preview = previewBrandImport({
      headers,
      rows: [row],
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "b", name: "Bosch" }],
    })
    expect(preview.commit_allowed).toBe(true)
    const plan = planBrandCommit(preview, { headers, rows: [row], mapping_confirmed: true })
    const created = plan.actions.find((action) => action.type === "create")
    expect(created && created.type === "create" ? created.media.map((slot) => slot.url) : []).toEqual([
      image(1),
      image(2),
      image(3),
    ])
    const run = readFileSync(join(__dirname, "../../../api/admin/product-cloud/brand-import/run.ts"), "utf8")
    const stop = run.indexOf("Import gestopt bij rij")
    const write = run.indexOf("await createCentralProduct")
    expect(stop).toBeGreaterThan(0)
    expect(write).toBeGreaterThan(stop)
  })

  it("documents ten image columns in the workbook and leaves seller columns out", () => {
    const grid = parseXlsxProductGrid(buildBrandImportWorkbook())
    expect(grid.headers).toEqual(expect.arrayContaining(["Hoofdafbeelding (URL of pad)", "Afbeelding 2", "Afbeelding 10", "Overige afbeeldingen"]))
    expect(grid.headers.indexOf("Afbeelding 2")).toBeLessThan(grid.headers.indexOf("Afbeelding 10"))
    expect(grid.headers.join(" ")).not.toMatch(/prijs|voorraad|seller-sku/i)
    const wizard = readFileSync(
      join(__dirname, "../../../../../admin/components/product-cloud/admin-wizard-shell.tsx"),
      "utf8"
    )
    expect(wizard).toContain("SectionReviewAside")
    expect(wizard).not.toContain('sectionKey="claims"')
  })

  it("exposes category kenmerken and plans gap-fill attributes without offers", () => {
    const headers = [
      "EAN / GTIN",
      "Productnaam",
      "Merk",
      "Productcategorie",
      "Subcategorie",
    ]
    const row = [BOSCH, "Shirt", "Bosch", "Kleding", "Heren"]
    const preview = previewBrandImport({
      headers,
      rows: [row],
      source_language_code: "nl",
      language_confirmed: true,
      mapping_confirmed: true,
      known_brands: [{ id: "b", name: "Bosch" }],
      categories: [
        { id: "cat_kleding", name: "Kleding", slug: "kleding", parent_id: null },
        {
          id: "cat_heren",
          name: "Heren",
          slug: "heren",
          parent_category_id: "cat_kleding",
        },
      ],
      existing: [
        {
          product_id: "prod_existing",
          publication_status: "Gepubliceerd",
          title: "Shirt",
          description: "Shirt",
          gtin: BOSCH,
          mpn: null,
          translations: [],
        },
      ],
    })
    expect(preview.creates_offers).toBe(false)
    expect(preview.category_fields.map((f) => f.code)).toEqual(
      expect.arrayContaining(["maat", "kleur", "materiaal", "pasvorm"])
    )
    const plan = planBrandCommit(preview, {
      headers,
      rows: [row],
      mapping_confirmed: true,
      existing: [
        {
          product_id: "prod_existing",
          publication_status: "Gepubliceerd",
          title: "Shirt",
          description: "Shirt",
          gtin: BOSCH,
          mpn: null,
          translations: [],
        },
      ],
      attribute_overrides: {
        "2": { maat: "M", kleur: "Blauw", materiaal: "Katoen", pasvorm: "Regular" },
      },
    })
    expect(preview.preview[0]?.issues).toEqual([])
    expect(preview.commit_allowed).toBe(true)
    expect(plan.blocked).toBe(false)
    expect(preview.preview[0]?.status).toBe("existing")
    expect(plan.actions.map((a) => a.type)).toContain("fill_attributes")
    const fill = plan.actions.find((a) => a.type === "fill_attributes")
    expect(fill && fill.type === "fill_attributes" ? fill.attributes : null).toEqual({
      maat: "M",
      kleur: "Blauw",
      materiaal: "Katoen",
      pasvorm: "Regular",
    })
    expect(() => assertBrandPlanHasNoOffers(plan.actions)).not.toThrow()
  })
})

function inflateXlsxParts(buf: Buffer): Map<string, string> {
  const out = new Map<string, string>()
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return out
  const cdOffset = buf.readUInt32LE(eocd + 16)
  const cdSize = buf.readUInt32LE(eocd + 12)
  let i = cdOffset
  const end = cdOffset + cdSize
  while (i + 46 <= end && buf.readUInt32LE(i) === 0x02014b50) {
    const method = buf.readUInt16LE(i + 10)
    const compSize = buf.readUInt32LE(i + 20)
    const nameLen = buf.readUInt16LE(i + 28)
    const extraLen = buf.readUInt16LE(i + 30)
    const commentLen = buf.readUInt16LE(i + 32)
    const localOffset = buf.readUInt32LE(i + 42)
    const name = buf.slice(i + 46, i + 46 + nameLen).toString("utf8")
    const lh = localOffset
    const nameLen2 = buf.readUInt16LE(lh + 26)
    const extraLen2 = buf.readUInt16LE(lh + 28)
    const start = lh + 30 + nameLen2 + extraLen2
    const compressed = buf.slice(start, start + compSize)
    let data = compressed
    if (method === 8) {
      try {
        data = inflateRawSync(compressed)
      } catch {
        data = inflateSync(compressed)
      }
    }
    out.set(name, data.toString("utf8"))
    i += 46 + nameLen + extraLen + commentLen
  }
  return out
}

describe("production country mapping", () => {
  it("stores NL and BE from codes and country names", () => {
    expect(normalizeProductionCountry("NL")).toBe("NL")
    expect(normalizeProductionCountry("be")).toBe("BE")
    expect(normalizeProductionCountry("Nederland")).toBe("NL")
    expect(normalizeProductionCountry("België")).toBe("BE")
    expect(normalizeProductionCountry("Belgium")).toBe("BE")
  })
})

describe("producten en offers menu", () => {
  it("keeps one menu item and leaves the other product routes in place", () => {
    const registry = readFileSync(
      join(__dirname, "../../../../../admin/lib/module-registry.ts"),
      "utf8"
    )
    expect(registry).toContain('naam: "Producten en offers"')
    expect(registry).not.toContain('naam: "Offerlijst"')
    expect(registry).not.toContain('naam: "Productaanleveringen"')
    expect(registry).toContain('{ route: "/product-cloud/offers", parentId: "products" }')
    expect(registry).toContain('{ route: "/product-cloud/deliveries", parentId: "products" }')
    expect(registry).toContain('naam: "Productkoppelingen"')
    expect(registry).toContain('naam: "Wijzigingsvoorstellen"')
    expect(registry).toContain('naam: "Categorieën"')
  })
})
