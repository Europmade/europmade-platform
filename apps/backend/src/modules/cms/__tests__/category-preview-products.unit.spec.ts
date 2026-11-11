import { listCategoryConceptPreviewProducts } from "../category-preview-products"

function scopeFor() {
  const writes: string[] = []
  const productCloud = new Proxy(
    {
      async listCategories() {
        return [
          { id: "cat_home", slug: "huishouden", name: "Huishouden", parent_category: null },
          {
            id: "cat_inbouw",
            slug: "inbouwapparatuur",
            name: "Inbouwapparatuur",
            parent_category: { id: "cat_home" },
          },
          {
            id: "cat_dish",
            slug: "vaatwassers",
            name: "Vaatwassers",
            parent_category: { id: "cat_inbouw" },
          },
          {
            id: "cat_wash",
            slug: "was-droog",
            name: "Was & Drogen",
            parent_category: { id: "cat_home" },
          },
        ]
      },
      async listProductVersions(filters: { publication_status?: string; product_id?: string[] }) {
        const rows = [
          {
            id: "ver_dish",
            product_id: "prod_dish",
            title: "Miele vaatwasser",
            version_number: 1,
            publication_status: "Concept",
          },
          {
            id: "ver_wash",
            product_id: "prod_wash",
            title: "Miele wasmachine",
            version_number: 1,
            publication_status: "Concept",
          },
          {
            id: "ver_old",
            product_id: "prod_published",
            title: "Oude conceptversie",
            version_number: 1,
            publication_status: "Concept",
          },
          {
            id: "ver_live",
            product_id: "prod_published",
            title: "Bosch live",
            version_number: 2,
            publication_status: "Gepubliceerd",
          },
          {
            id: "ver_arch",
            product_id: "prod_arch",
            title: "Gearchiveerd",
            version_number: 1,
            publication_status: "Concept",
          },
        ]
        if (filters.publication_status) {
          return rows.filter((row) => row.publication_status === filters.publication_status)
        }
        const ids = new Set(filters.product_id ?? [])
        return rows.filter((row) => ids.has(row.product_id))
      },
      async listProducts() {
        return [
          { id: "prod_dish", brand_id: "brand_miele", lifecycle_status: "Concept gecontroleerd" },
          { id: "prod_wash", brand_id: "brand_miele", lifecycle_status: "Concept gecontroleerd" },
          { id: "prod_published", brand_id: "brand_bosch", lifecycle_status: "Actief" },
          { id: "prod_arch", brand_id: "brand_miele", lifecycle_status: "Gearchiveerd" },
        ]
      },
      async listProductCategories() {
        return [
          { product_id: "prod_dish", category_id: "cat_dish" },
          { product_id: "prod_dish", category_id: "cat_inbouw" },
          { product_id: "prod_wash", category_id: "cat_wash" },
          { product_id: "prod_published", category_id: "cat_dish" },
          { product_id: "prod_arch", category_id: "cat_dish" },
        ]
      },
      async listProductMedias() {
        return [
          {
            product_version_id: "ver_dish",
            media_type: "Hoofdafbeelding",
            storage_reference: "/static/miele-dish.webp",
          },
        ]
      },
      async listAttributeValues() {
        return [
          { product_version_id: "ver_dish", attribute_definition_id: "def_energy", value: "D" },
          { product_version_id: "ver_dish", attribute_definition_id: "def_empty", value: "  " },
          { product_version_id: "ver_wash", attribute_definition_id: "def_energy", value: "A" },
        ]
      },
      async listAttributeDefinitions() {
        return [
          { id: "def_energy", code: "energielabel" },
          { id: "def_empty", code: "kleur" },
        ]
      },
      async listProductVariants() {
        return [{ id: "var_dish", product_id: "prod_dish" }]
      },
      async listIdentifiers() {
        return [{ id: "idn_dish", product_variant_id: "var_dish" }]
      },
    },
    {
      get(target, prop, receiver) {
        if (typeof prop === "string" && /^(create|update|delete|upsert)/.test(prop)) {
          writes.push(prop)
        }
        return Reflect.get(target, prop, receiver)
      },
    }
  )
  const commerce = new Proxy(
    {
      async listOffers() {
        return [{ id: "off_dish", identifier_id: "idn_dish" }]
      },
      async listOfferPrices() {
        return [{ offer_id: "off_dish", base_price: 899 }]
      },
    },
    {
      get(target, prop, receiver) {
        if (typeof prop === "string" && /^(create|update|delete|upsert)/.test(prop)) {
          writes.push(prop)
        }
        return Reflect.get(target, prop, receiver)
      },
    }
  )
  const partner = {
    async retrieveBrand(id: string) {
      return { id, name: id === "brand_miele" ? "Miele" : "Bosch" }
    },
  }
  return {
    writes,
    scope: {
      resolve(key: string) {
        if (key === "productCloud") return productCloud
        if (key === "commerceCloud") return commerce
        if (key === "partner") return partner
        throw new Error(key)
      },
    },
  }
}

describe("listCategoryConceptPreviewProducts", () => {
  it("returns concept products for the category and leaves commerce unsellable", async () => {
    const { scope, writes } = scopeFor()
    const products = await listCategoryConceptPreviewProducts(scope, "vaatwassers")
    expect(products.map((product) => product.id)).toEqual(["prod_dish"])
    expect(products[0]).toMatchObject({
      title: "Miele vaatwasser",
      brand_name: "Miele",
      image_url: "/static/miele-dish.webp",
      from_price: 899,
      publication_status: "Concept",
      attributes: [{ code: "energielabel", value: "D" }],
    })
    expect(writes).toEqual([])
  })

  it("includes a descendant concept on the parent and excludes other branches", async () => {
    const { scope } = scopeFor()
    const inbouw = await listCategoryConceptPreviewProducts(scope, "inbouwapparatuur")
    expect(inbouw.map((product) => product.id)).toEqual(["prod_dish"])
    const home = await listCategoryConceptPreviewProducts(scope, "huishouden")
    expect(home.map((product) => product.id).sort()).toEqual(["prod_dish", "prod_wash"])
  })
})
