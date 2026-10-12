import { composeNewsletterEmail } from "@europmade/utils"
import { contextFromTrigger, fillNewsletter } from "../newsletter-fill"

const catalog = {
  products: [
    {
      id: "prod_kleding",
      name: "Katoenen shirt",
      brand: "Merk A",
      categories: ["Kleding"],
      text: "Korte omschrijving.",
      imageUrl: "http://127.0.0.1:9000/static/shirt.jpg",
      href: "http://127.0.0.1:3000/product/prod_kleding",
      priceLabel: "Vanaf € 40,00",
      commissionLabel: "11%",
      promoLabel: "",
      promoText: "",
    },
    {
      id: "prod_outdoor",
      name: "Rugzak",
      brand: "Merk B",
      categories: ["Outdoor"],
      text: "Waterdicht.",
      imageUrl: "http://127.0.0.1:9000/static/pack.jpg",
      href: "http://127.0.0.1:3000/product/prod_outdoor",
      priceLabel: "",
      commissionLabel: "",
      promoLabel: "Actieprijs € 90,00",
      promoText: "Geldig van 1 oktober 2026 tot 20 oktober 2026.",
    },
  ],
  brands: [
    {
      id: "brand_a",
      name: "Merk A",
      slug: "merk-a",
      text: "Korte merktekst.",
      imageUrl: "http://127.0.0.1:9000/static/logo.jpg",
      href: "http://127.0.0.1:3000/merk/merk-a",
    },
    {
      id: "brand_plain",
      name: "Merk Zonder Beeld",
      slug: "merk-zonder-beeld",
      text: "",
      imageUrl: "",
      href: "http://127.0.0.1:3000/merk/merk-zonder-beeld",
    },
  ],
}

const base = {
  preheader: "Korte preheader",
  ctaLabel: "Bekijk",
  ctaUrl: "http://127.0.0.1:3000/",
  unsubscribeUrl: "http://127.0.0.1:3000/nieuwsbrief/uitschrijven/voorbeeld",
  locale: "nl",
  audience: "consumers" as const,
  catalog,
}

describe("newsletter email", () => {
  it("builds one commercial shell and blocks a missing product image", () => {
    const result = composeNewsletterEmail({
      preheader: "Korte preheader",
      headline: "Welkom",
      intro: ["Een korte introductie."],
      stories: [],
      cards: [
        {
          id: "prod_kleding",
          name: "Katoenen shirt",
          brand: "Merk A",
          text: "Korte omschrijving.",
          imageUrl: "http://127.0.0.1:9000/static/shirt.jpg",
          href: "http://127.0.0.1:3000/product/prod_kleding",
          priceLabel: "Vanaf € 40,00",
          commissionLabel: "",
        },
      ],
      brand: { name: "Merk A", text: "", imageUrl: "", href: "http://127.0.0.1:3000/merk/merk-a" },
      offer: null,
      ctaLabel: "Bekijk",
      ctaUrl: "http://127.0.0.1:3000/",
      unsubscribeUrl: "http://127.0.0.1:3000/nieuwsbrief/uitschrijven/voorbeeld",
      locale: "nl",
      audience: "consumers",
      requireProducts: true,
      requireBrand: false,
      requireOffer: false,
      requireCommission: false,
    })
    expect(result.html).toContain("Europ<span")
    expect(result.html).toContain("Segoe UI")
    expect(result.html).not.toContain("Georgia")
    expect(result.html).toContain("Katoenen shirt")
    expect(result.html).toContain("/nieuwsbrief/uitschrijven/voorbeeld")
    expect(result.html).not.toContain('src=""')
    expect(result.warnings.some((warning) => warning.includes("geen logo"))).toBe(true)

    const broken = composeNewsletterEmail({
      preheader: "Korte preheader",
      headline: "Welkom",
      intro: ["Een korte introductie."],
      stories: [],
      cards: [
        {
          id: "prod_kleding",
          name: "Katoenen shirt",
          brand: "Merk A",
          text: "",
          imageUrl: "",
          href: "http://127.0.0.1:3000/product/prod_kleding",
          priceLabel: "",
          commissionLabel: "",
        },
      ],
      brand: null,
      offer: null,
      ctaLabel: "Bekijk",
      ctaUrl: "http://127.0.0.1:3000/",
      unsubscribeUrl: "http://127.0.0.1:3000/nieuwsbrief/uitschrijven/voorbeeld",
      locale: "nl",
      audience: "consumers",
      requireProducts: true,
      requireBrand: false,
      requireOffer: true,
      requireCommission: false,
    })
    expect(broken.problems.some((problem) => problem.includes("geen afbeelding"))).toBe(true)
    expect(broken.problems.some((problem) => problem.includes("geen geldige actie"))).toBe(true)
  })

  it("selects the category and blocks an unknown product id", () => {
    const category = fillNewsletter({
      ...base,
      body: "<!--em-layout:newsletter--><h2>Outdoor</h2><p>Een selectie.</p><!--em-bind:category:outdoor-->",
    })
    expect(category.html).toContain("Rugzak")
    expect(category.html).not.toContain("Katoenen shirt")
    expect(category.problems).toEqual([])

    const missing = fillNewsletter({
      ...base,
      body: '<!--em-layout:newsletter--><h2>Product</h2><p>Een selectie.</p><a data-em-product="prod_onbekend" href="/product/prod_onbekend">Product</a>',
    })
    expect(missing.problems.some((problem) => problem.includes("prod_onbekend"))).toBe(true)
  })

  it("uses a brand name without an empty image", () => {
    const filled = fillNewsletter({
      ...base,
      catalog: { ...catalog, brands: [catalog.brands[1]] },
      body: "<!--em-layout:newsletter--><h2>Nieuw merk</h2><p>Een selectie.</p><!--em-bind:brand-->",
      context: { brandId: "brand_plain" },
    })
    expect(filled.html).toContain("Merk Zonder Beeld")
    expect(filled.html).not.toContain('src=""')
    expect(filled.warnings.some((warning) => warning.includes("geen logo"))).toBe(true)
    expect(filled.problems).toEqual([])
  })

  it("keeps a product, brand and offer on the triggering record", () => {
    const product = fillNewsletter({
      ...base,
      body: "<!--em-layout:newsletter--><h2>Nieuw product</h2><p>Een selectie.</p><!--em-bind:product-->",
      context: { productId: "prod_kleding" },
    })
    expect(product.html).toContain("Katoenen shirt")
    expect(product.html).not.toContain("Rugzak")
    expect(product.problems).toEqual([])

    const other = fillNewsletter({
      ...base,
      body: "<!--em-layout:newsletter--><h2>Nieuw product</h2><p>Een selectie.</p><!--em-bind:product-->",
      context: { productId: "prod_ontbreekt" },
    })
    expect(other.html).not.toContain("Katoenen shirt")
    expect(other.problems.some((problem) => problem.includes("prod_ontbreekt"))).toBe(true)

    const wrongBrand = fillNewsletter({
      ...base,
      body: "<!--em-layout:newsletter--><h2>Nieuw merk</h2><p>Een selectie.</p><!--em-bind:brand-->",
      context: { brandId: "brand_ontbreekt" },
    })
    expect(wrongBrand.html).not.toContain("Merk A")
    expect(wrongBrand.problems.some((problem) => problem.includes("brand_ontbreekt"))).toBe(true)

    const offer = fillNewsletter({
      ...base,
      body: "<!--em-layout:newsletter--><h2>Actie</h2><p>Een selectie.</p><!--em-bind:offer-->",
      context: { offerId: "off_ontbreekt" },
    })
    expect(offer.html).not.toContain("Rugzak")
    expect(offer.problems.some((problem) => problem.includes("niet geldig"))).toBe(true)

    const tracked = fillNewsletter({
      ...base,
      audience: "affiliates",
      body: "<!--em-layout:newsletter--><h2>Product</h2><p>Een selectie.</p><!--em-bind:product-->",
      context: {
        productId: "prod_kleding",
        trackingByProduct: {
          prod_kleding: "http://127.0.0.1:3000/product/prod_kleding?ref=alink_echt",
        },
      },
    })
    expect(tracked.html).toContain("ref=alink_echt")
    expect(tracked.html).toContain("11%")
    expect(tracked.warnings.some((warning) => warning.includes("trackinglink"))).toBe(false)

    expect(
      contextFromTrigger("consumer_product_published", "consumer_product_published:ver_1", {
        versionProducts: { ver_1: "prod_kleding" },
      }).productId
    ).toBe("prod_kleding")
  })
})
