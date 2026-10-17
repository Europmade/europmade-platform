import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  applyAdminCentralSection,
  CentralSectionError,
  type AdminCentralDeps,
} from "../admin-central-section"
import { BRAND_TEMPLATE_LABELS, brandTemplateHeaders } from "../brand-import-template"

const BOSCH = "4242005482320"

function deps(overrides: Partial<AdminCentralDeps> = {}): AdminCentralDeps & { calls: string[] } {
  const calls: string[] = []
  const note = (name: string) => {
    calls.push(name)
    return Promise.resolve(undefined)
  }
  const base: AdminCentralDeps = {
    retrieveProduct: async () => ({ id: "prod_1", brand_id: "brand_1", manufacturer_id: "manu_1" }),
    retrieveBrand: async () => ({ id: "brand_1" }),
    retrieveManufacturer: async (id) => {
      if (id === "manu_1") return { id: "manu_1" }
      throw new Error("niet gevonden")
    },
    listManufacturers: async () => [],
    listProductVersions: async () => [
      { id: "ver_1", title: "Oud", description: "Oud", publication_status: "Concept", source_language_code: "nl" },
    ],
    updateProductVersions: (row) => {
      calls.push(`version:${row.title}`)
      if ("publication_status" in row) calls.push("publication")
      return Promise.resolve(undefined)
    },
    updateProducts: () => note("product"),
    listProductVariants: async () => [{ id: "pvar_1", variant_type: "Uitvoering", variant_value: "Standaard" }],
    updateProductVariants: () => note("variant"),
    listIdentifiers: async (q) => {
      if (q.identifier_type === "GTIN" && q.identifier_value === BOSCH) {
        return [{ id: "idn_1", identifier_type: "GTIN", identifier_value: BOSCH, product_variant_id: "pvar_1" }]
      }
      if (q.product_variant_id === "pvar_1") {
        return [{ id: "idn_1", identifier_type: "GTIN", identifier_value: BOSCH, product_variant_id: "pvar_1" }]
      }
      return []
    },
    updateIdentifiers: () => note("identifier"),
    createIdentifiers: () => note("create-identifier"),
    retrieveProductVariant: async () => ({ product_id: "prod_1" }),
    listProductCategories: async () => [],
    listCategories: async () => [],
    createProductCategories: () => note("category"),
    deleteProductCategories: () => note("delete-category"),
    listAttributeDefinitions: async () => [],
    setVersionAttributeValues: () => note("attributes"),
    listProductMedias: async () => [],
    createProductMedias: () => note("media"),
    updateProductMedias: () => note("update-media"),
    deleteProductMedias: () => note("delete-media"),
    listProductDocuments: async () => [],
    createProductDocuments: () => note("document"),
    updateProductDocuments: () => note("update-document"),
    deleteProductDocuments: () => note("delete-document"),
    listProductTranslations: async () => [
      { id: "tr_nl", field_name: "title", language_code: "nl", value: "Nederlands" },
    ],
    upsertTranslation: (row) => note(`translation:${row.language_code}:${row.field_name}`),
    createProductOriginEvidences: (row) => note(`evidence:${row.verification_status}`),
    ingest: async (url) => `stored:${url}`,
  }
  return { ...base, ...overrides, calls }
}

const info = {
  section: "information",
  title: "Nieuwe pan",
  description: "Tekst",
  brand_id: "brand_1",
  manufacturer_id: "manu_1",
  ean: BOSCH,
  mpn: "",
  variant_type: "Kleur",
  variant_value: "Rood",
  category_ids: [],
  attributes: [],
}

describe("admin central section save", () => {
  it("links a unique manufacturer name and does not create a manufacturer", async () => {
    let written = ""
    const store = deps({
      retrieveProduct: async () => ({
        id: "prod_1",
        brand_id: "brand_1",
        manufacturer_id: "Riess Kelomat GmbH",
      }),
      listManufacturers: async () => [{ id: "mfr_riess", name: "Riess Kelomat GmbH" }],
      updateProducts: (row) => {
        written = row.manufacturer_id
        return Promise.resolve(undefined)
      },
    })
    await applyAdminCentralSection(
      store,
      "prod_1",
      { ...info, manufacturer_id: "Riess Kelomat GmbH" },
      "admin"
    )
    expect(written).toBe("mfr_riess")
    expect(store.calls.some((call) => call.includes("create-manufacturer"))).toBe(false)
  })

  it("keeps a valid manufacturer id", async () => {
    let written = ""
    let listed = false
    const store = deps({
      listManufacturers: async () => {
        listed = true
        return []
      },
      updateProducts: (row) => {
        written = row.manufacturer_id
        return Promise.resolve(undefined)
      },
    })
    await applyAdminCentralSection(store, "prod_1", info, "admin")
    expect(written).toBe("manu_1")
    expect(listed).toBe(false)
  })

  it("keeps an unchanged unknown manufacturer name and the stored description", async () => {
    let written = ""
    let description = ""
    const store = deps({
      retrieveProduct: async () => ({
        id: "prod_1",
        brand_id: "brand_1",
        manufacturer_id: "Riess Kelomat GmbH",
      }),
      listManufacturers: async () => [{ id: "mfr_other", name: "Alessi S.p.A." }],
      updateProducts: (row) => {
        written = row.manufacturer_id
        return Promise.resolve(undefined)
      },
      updateProductVersions: (row) => {
        description = row.description
        return Promise.resolve(undefined)
      },
    })
    await applyAdminCentralSection(
      store,
      "prod_1",
      { ...info, manufacturer_id: "Riess Kelomat GmbH", description: "Bewaarde tekst" },
      "admin"
    )
    expect(written).toBe("Riess Kelomat GmbH")
    expect(description).toBe("Oud")
    expect(store.calls.some((call) => call.includes("create-manufacturer"))).toBe(false)
  })

  it("saves only the central description and leaves the stored text when product information is saved", async () => {
    let description = ""
    let title = ""
    const store = deps({
      listProductVersions: async () => [
        {
          id: "ver_1",
          title: "Oud",
          description: "Ja\n\nJa",
          publication_status: "Concept",
          source_language_code: "nl",
        },
      ],
      updateProductVersions: (row) => {
        title = row.title
        description = row.description
        return Promise.resolve(undefined)
      },
    })
    await applyAdminCentralSection(
      store,
      "prod_1",
      { section: "description", description: "Ja\n\nJa\nExtra regel" },
      "admin"
    )
    expect(title).toBe("Oud")
    expect(description).toBe("Ja\n\nJa\nExtra regel")
    expect(store.calls).not.toContain("product")
    expect(store.calls).not.toContain("media")
    expect(store.calls.some((call) => call.startsWith("translation:"))).toBe(false)

    await applyAdminCentralSection(store, "prod_1", { ...info, description: "Andere tekst" }, "admin")
    expect(description).toBe("Ja\n\nJa")
  })

  it("rejects an unknown or ambiguous manufacturer before writing", async () => {
    const unknown = deps({
      retrieveProduct: async () => ({
        id: "prod_1",
        brand_id: "brand_1",
        manufacturer_id: "manu_1",
      }),
      listManufacturers: async () => [{ id: "mfr_other", name: "Alessi S.p.A." }],
    })
    await expect(
      applyAdminCentralSection(unknown, "prod_1", { ...info, manufacturer_id: "Onbekend GmbH" }, "admin")
    ).rejects.toMatchObject({ field: "manufacturer_id" })
    expect(unknown.calls).not.toContain("product")

    const ambiguous = deps({
      listManufacturers: async () => [
        { id: "mfr_a", name: "Riess Kelomat GmbH" },
        { id: "mfr_b", name: "riess kelomat gmbh" },
      ],
    })
    await expect(
      applyAdminCentralSection(
        ambiguous,
        "prod_1",
        { ...info, manufacturer_id: "Riess Kelomat GmbH" },
        "admin"
      )
    ).rejects.toMatchObject({ field: "manufacturer_id" })
    expect(ambiguous.calls).not.toContain("product")
  })

  it("stores a production country without changing origin status or offers", async () => {
    let origin: { production_country: string; production_location: string; status?: string } | null = null
    const store = deps({
      listProductCategories: async () => [{ id: "link_1", category_id: "cat_1" }],
      listCategories: async () => [{ id: "cat_1" }],
      listAttributeDefinitions: async () => [
        { id: "attr_country", code: "production_country", category_id: "cat_1" },
      ],
      listProductOrigins: async () => [
        { id: "porg_1", production_country: "AT", production_location: "AT", status: "Afgewezen" },
      ],
      updateProductOrigins: (row) => {
        origin = row
        return Promise.resolve(undefined)
      },
    })
    await applyAdminCentralSection(
      store,
      "prod_1",
      {
        section: "compliance",
        attributes: [{ attribute_definition_id: "attr_country", value: "DE" }],
      },
      "admin"
    )
    expect(origin).toEqual({
      id: "porg_1",
      production_country: "DE",
      production_location: "AT",
    })
    expect(store.calls.some((call) => call.includes("offer"))).toBe(false)
    expect(JSON.stringify(origin)).not.toContain("Geverifieerd")
  })

  it("restores the previous manufacturer when a later write fails", async () => {
    const product = { id: "prod_1", brand_id: "brand_1", manufacturer_id: "Riess Kelomat GmbH" }
    const store = deps({
      retrieveProduct: async () => product,
      listManufacturers: async () => [{ id: "mfr_riess", name: "Riess Kelomat GmbH" }],
      updateProducts: (row) => {
        product.manufacturer_id = row.manufacturer_id
        return Promise.resolve(undefined)
      },
      setVersionAttributeValues: async () => {
        throw new Error("schrijffout na fabrikantkoppeling")
      },
      listAttributeDefinitions: async () => [{ id: "attr_1", code: "color", category_id: "cat_1" }],
      listCategories: async () => [{ id: "cat_1" }],
    })
    await expect(
      applyAdminCentralSection(
        store,
        "prod_1",
        {
          ...info,
          manufacturer_id: "Riess Kelomat GmbH",
          category_ids: ["cat_1"],
          attributes: [{ attribute_definition_id: "attr_1", value: "Rood" }],
        },
        "admin"
      )
    ).rejects.toThrow(/schrijffout na fabrikantkoppeling/)
    expect(product.manufacturer_id).toBe("Riess Kelomat GmbH")
  })

  it("rejects an invalid EAN before any product write", async () => {
    const store = deps()
    await expect(
      applyAdminCentralSection(store, "prod_1", { ...info, ean: "123" }, "admin")
    ).rejects.toMatchObject({ field: "ean" })
    expect(store.calls).not.toContain("product")
  })

  it("rejects a GTIN that belongs to another product", async () => {
    const store = deps({
      retrieveProductVariant: async () => ({ product_id: "prod_other" }),
    })
    await expect(applyAdminCentralSection(store, "prod_1", info, "admin")).rejects.toBeInstanceOf(
      CentralSectionError
    )
    expect(store.calls).not.toContain("product")
  })

  it("rejects an unknown variant type and saves a listed type without publishing", async () => {
    const store = deps()
    await expect(
      applyAdminCentralSection(store, "prod_1", { ...info, variant_type: "Smaak" }, "admin")
    ).rejects.toMatchObject({ field: "variant_type" })
    expect(store.calls).not.toContain("product")
    const ok = deps()
    await applyAdminCentralSection(ok, "prod_1", info, "admin")
    expect(ok.calls).toContain("version:Nieuwe pan")
    expect(ok.calls).not.toContain("publication")
    expect(ok.calls).toContain("variant")
  })

  it("rolls back category links when a later link write fails", async () => {
    const links = [{ id: "pctg_old", category_id: "cat_old" }]
    let creates = 0
    const store = deps({
      listCategories: async () => [{ id: "cat_parent" }, { id: "cat_child" }],
      listProductCategories: async () => links.map((link) => ({ ...link })),
      deleteProductCategories: async (id) => {
        const index = links.findIndex((link) => link.id === id)
        if (index >= 0) links.splice(index, 1)
        return undefined
      },
      createProductCategories: async (row) => {
        creates += 1
        if (creates === 2) throw new Error("schrijffout na de eerste koppeling")
        links.push({ id: `pctg_new_${creates}`, category_id: row.category_id })
        return undefined
      },
    })
    await expect(
      applyAdminCentralSection(
        store,
        "prod_1",
        { ...info, category_ids: ["cat_parent", "cat_child"] },
        "admin"
      )
    ).rejects.toThrow(/schrijffout na de eerste koppeling/)
    expect(links.map((link) => link.category_id)).toEqual(["cat_old"])
  })

  it("stores EU evidence as pending and leaves other translations untouched", async () => {
    const evidence = deps()
    await applyAdminCentralSection(
      evidence,
      "prod_1",
      { section: "compliance", attributes: [], evidence_url: "https://cdn.example.com/bewijs.pdf" },
      "admin"
    )
    expect(evidence.calls).toContain("evidence:pending")
    expect(evidence.calls.some((call) => call.includes("approved") || call.includes("VERIFIED"))).toBe(false)
    const translations = deps()
    await applyAdminCentralSection(
      translations,
      "prod_1",
      {
        section: "translations",
        translations: [{ field_name: "title", language_code: "de", value: "Pfanne" }],
      },
      "admin"
    )
    expect(translations.calls).toEqual(["translation:de:title"])
  })

  it("keeps the review route on the central product and the template to one column list", () => {
    const review = readFileSync(
      join(__dirname, "../../../api/admin/product-cloud/products/[id]/route.ts"),
      "utf8"
    )
    expect(review).toContain("skipSellerAccess: true")
    const central = readFileSync(
      join(__dirname, "../../../api/admin/product-cloud/products/[id]/central/route.ts"),
      "utf8"
    )
    expect(central).not.toContain("COMMERCE_CLOUD")
    expect(central).not.toContain("updateOffers")
    expect(brandTemplateHeaders()).toEqual([...BRAND_TEMPLATE_LABELS])
  })
})
