import {
  categorySlugFromHref,
  pickDisplayableMediaReference,
  representativeCategoryCollage,
  representativeCategoryImage,
  representativeCategoryImages,
} from "../category-presentation-images"

const products = [
  {
    slug: "b-test",
    title: "Test B",
    imageUrl: "https://example.test/b.jpg",
    categorySlugs: ["wasmachines"],
    testCatalog: true,
  },
  {
    slug: "a-sale",
    title: "Verkoop A",
    imageUrl: "https://example.test/a.jpg",
    categorySlugs: ["wasmachines", "was-droog"],
    testCatalog: false,
  },
  {
    slug: "c-other",
    title: "Andere groep",
    imageUrl: "https://example.test/c.jpg",
    categorySlugs: ["wasdrogers"],
  },
  {
    slug: "d-empty",
    title: "Zonder bestand",
    imageUrl: "upload://missing.jpg",
    categorySlugs: ["wasmachines"],
  },
]

describe("category presentation images", () => {
  it("prefers a sellable product and stays stable", () => {
    const first = representativeCategoryImage(products, "wasmachines")
    const second = representativeCategoryImage([...products].reverse(), "wasmachines")
    expect(first?.slug).toBe("a-sale")
    expect(second?.slug).toBe("a-sale")
  })

  it("does not use an image from another category", () => {
    expect(representativeCategoryImage(products, "vrijstaande-vaatwassers")).toBeNull()
    expect(representativeCategoryImages(products, "wasdrogers").map((product) => product.slug)).toEqual([
      "c-other",
    ])
  })

  it("skips an unresolved primary and uses the next image of the same product", () => {
    expect(
      pickDisplayableMediaReference([
        { media_type: "Hoofdafbeelding", storage_reference: "upload://missing.jpg", sort_order: 0 },
        { media_type: "Overige afbeelding", storage_reference: "https://example.test/extra.jpg", sort_order: 1 },
      ])
    ).toBe("https://example.test/extra.jpg")
  })

  it("builds a collage from different groups before extra photos of one product", () => {
    const collage = representativeCategoryCollage(
      [
        {
          slug: "washer-a",
          title: "Wasmachine A",
          imageUrl: "https://example.test/washer-a.jpg",
          imageUrls: ["https://example.test/washer-a-side.jpg"],
          categorySlugs: ["wasmachines"],
        },
        {
          slug: "washer-b",
          title: "Wasmachine B",
          imageUrl: "https://example.test/washer-b.jpg",
          categorySlugs: ["wasmachines"],
        },
        {
          slug: "dryer",
          title: "Droger",
          imageUrl: "https://example.test/dryer.jpg",
          categorySlugs: ["wasdrogers"],
        },
      ],
      null,
      3
    )
    expect(new Set(collage.slice(0, 2).map((image) => image.slug))).toEqual(new Set(["washer-a", "dryer"]))
    expect(collage[2]?.slug).toBe("washer-b")
  })

  it("reads only a category slug from an internal link", () => {
    expect(categorySlugFromHref("/categorie/was-droog")).toBe("was-droog")
    expect(categorySlugFromHref("https://example.test/merk/bosch")).toBeNull()
  })
})
