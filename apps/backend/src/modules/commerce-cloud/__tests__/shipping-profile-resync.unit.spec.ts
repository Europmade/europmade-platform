import {
  resyncOffersForShippingProfile,
  syncProfileToProductOffers,
} from "../shipping-profile-engine"
import { defaultCountryConfig } from "../shipping-profile-types"

type MockFns = {
  listProducts: jest.Mock
  retrieveProduct: jest.Mock
  updateProducts: jest.Mock
  listProductVariants: jest.Mock
  listIdentifiers: jest.Mock
  listSellerShippingProfiles: jest.Mock
  listOffers: jest.Mock
  updateOffers: jest.Mock
  listOfferPrices: jest.Mock
  updateOfferPrices: jest.Mock
}

function buildMocks(overrides: Partial<MockFns> = {}): {
  commerce: MockFns
  productCloud: MockFns
} {
  const commerce = {
    listProducts: jest.fn(),
    retrieveProduct: jest.fn(),
    updateProducts: jest.fn(),
    listProductVariants: jest.fn(),
    listIdentifiers: jest.fn(),
    listSellerShippingProfiles: jest.fn(),
    listOffers: jest.fn(),
    updateOffers: jest.fn(),
    listOfferPrices: jest.fn(),
    updateOfferPrices: jest.fn(),
    ...overrides,
  }
  const productCloud = {
    listProducts: jest.fn(),
    retrieveProduct: jest.fn(),
    updateProducts: jest.fn(),
    listProductVariants: jest.fn(),
    listIdentifiers: jest.fn(),
    listSellerShippingProfiles: jest.fn(),
    listOffers: jest.fn(),
    updateOffers: jest.fn(),
    listOfferPrices: jest.fn(),
    updateOfferPrices: jest.fn(),
    ...overrides,
  }
  return { commerce, productCloud }
}

describe("resyncOffersForShippingProfile", () => {
  it("resyncs offers for every product linked to the profile", async () => {
    const { commerce, productCloud } = buildMocks()
    productCloud.listProducts.mockResolvedValue([
      { id: "prod_a" },
      { id: "prod_b" },
    ])
    productCloud.retrieveProduct
      .mockResolvedValueOnce({
        id: "prod_a",
        current_owner_seller_id: "sel_1",
      })
      .mockResolvedValueOnce({
        id: "prod_b",
        current_owner_seller_id: "sel_1",
      })
    productCloud.updateProducts.mockResolvedValue(undefined)
    productCloud.listProductVariants
      .mockResolvedValueOnce([{ id: "var_a" }])
      .mockResolvedValueOnce([{ id: "var_b" }])
    productCloud.listIdentifiers
      .mockResolvedValueOnce([{ id: "ident_a" }])
      .mockResolvedValueOnce([{ id: "ident_b" }])
    commerce.listSellerShippingProfiles.mockResolvedValue([
      {
        id: "cshp_1",
        seller_id: "sel_1",
        country_rates: {
          NL: defaultCountryConfig(5.95),
        },
      },
    ])
    commerce.listOffers
      .mockResolvedValueOnce([
        { id: "off_a", region_code: "NL", delivery_days_max: 5 },
      ])
      .mockResolvedValueOnce([
        { id: "off_b", region_code: "NL", delivery_days_max: 5 },
      ])
    commerce.listOfferPrices
      .mockResolvedValueOnce([{ id: "price_a", shipping_cost: 6.95 }])
      .mockResolvedValueOnce([{ id: "price_b", shipping_cost: 6.95 }])
    commerce.updateOffers.mockResolvedValue(undefined)
    commerce.updateOfferPrices.mockResolvedValue(undefined)

    const result = await resyncOffersForShippingProfile(
      commerce as never,
      productCloud as never,
      { sellerId: "sel_1", profileId: "cshp_1" }
    )

    expect(productCloud.listProducts).toHaveBeenCalledWith({
      current_owner_seller_id: "sel_1",
      shipping_profile_id: "cshp_1",
    })
    expect(result.products_synced).toBe(2)
    expect(result.offers_updated).toBe(2)
    expect(result.errors).toEqual([])
    expect(commerce.updateOfferPrices).toHaveBeenCalledWith({
      id: "price_a",
      shipping_cost: 5.95,
    })
    expect(commerce.updateOfferPrices).toHaveBeenCalledWith({
      id: "price_b",
      shipping_cost: 5.95,
    })
  })

  it("updates delivery_days_max from country rates", async () => {
    const { commerce, productCloud } = buildMocks()
    productCloud.listProducts.mockResolvedValue([{ id: "prod_a" }])
    productCloud.retrieveProduct.mockResolvedValue({
      id: "prod_a",
      current_owner_seller_id: "sel_1",
    })
    productCloud.updateProducts.mockResolvedValue(undefined)
    productCloud.listProductVariants.mockResolvedValue([{ id: "var_a" }])
    productCloud.listIdentifiers.mockResolvedValue([{ id: "ident_a" }])
    commerce.listSellerShippingProfiles.mockResolvedValue([
      {
        id: "cshp_1",
        seller_id: "sel_1",
        country_rates: {
          NL: {
            ...defaultCountryConfig(4.95),
            delivery_time_code: "1_2",
            delivery_days_max: 2,
          },
        },
      },
    ])
    commerce.listOffers.mockResolvedValue([
      { id: "off_a", region_code: "NL", delivery_days_max: 5 },
    ])
    commerce.listOfferPrices.mockResolvedValue([
      { id: "price_a", shipping_cost: 9.95 },
    ])
    commerce.updateOffers.mockResolvedValue(undefined)
    commerce.updateOfferPrices.mockResolvedValue(undefined)

    await resyncOffersForShippingProfile(commerce as never, productCloud as never, {
      sellerId: "sel_1",
      profileId: "cshp_1",
    })

    expect(commerce.updateOffers).toHaveBeenCalledWith({
      id: "off_a",
      shipping_profile_id: "cshp_1",
      delivery_days_max: 2,
    })
    expect(commerce.updateOfferPrices).toHaveBeenCalledWith({
      id: "price_a",
      shipping_cost: 4.95,
    })
  })

  it("does not touch products that are not linked to the profile", async () => {
    const { commerce, productCloud } = buildMocks()
    productCloud.listProducts.mockResolvedValue([])

    const result = await resyncOffersForShippingProfile(
      commerce as never,
      productCloud as never,
      { sellerId: "sel_1", profileId: "cshp_1" }
    )

    expect(result.products_synced).toBe(0)
    expect(result.offers_updated).toBe(0)
    expect(productCloud.retrieveProduct).not.toHaveBeenCalled()
    expect(commerce.updateOffers).not.toHaveBeenCalled()
    expect(commerce.updateOfferPrices).not.toHaveBeenCalled()
  })

  it("fails loudly when one linked product cannot be synced", async () => {
    const { commerce, productCloud } = buildMocks()
    productCloud.listProducts.mockResolvedValue([
      { id: "prod_ok" },
      { id: "prod_bad" },
    ])
    productCloud.retrieveProduct
      .mockResolvedValueOnce({
        id: "prod_ok",
        current_owner_seller_id: "sel_1",
      })
      .mockResolvedValueOnce({
        id: "prod_bad",
        current_owner_seller_id: "other_seller",
      })
    productCloud.updateProducts.mockResolvedValue(undefined)
    productCloud.listProductVariants.mockResolvedValue([{ id: "var_ok" }])
    productCloud.listIdentifiers.mockResolvedValue([{ id: "ident_ok" }])
    commerce.listSellerShippingProfiles.mockResolvedValue([
      {
        id: "cshp_1",
        seller_id: "sel_1",
        country_rates: { NL: defaultCountryConfig(5.95) },
      },
    ])
    commerce.listOffers.mockResolvedValue([
      { id: "off_ok", region_code: "NL", delivery_days_max: 3 },
    ])
    commerce.listOfferPrices.mockResolvedValue([
      { id: "price_ok", shipping_cost: 6.95 },
    ])
    commerce.updateOffers.mockResolvedValue(undefined)
    commerce.updateOfferPrices.mockResolvedValue(undefined)

    await expect(
      resyncOffersForShippingProfile(commerce as never, productCloud as never, {
        sellerId: "sel_1",
        profileId: "cshp_1",
      })
    ).rejects.toThrow(/prod_bad/)
  })

  it("does not create duplicate offers — only updates existing ones", async () => {
    const { commerce, productCloud } = buildMocks()
    productCloud.listProducts.mockResolvedValue([{ id: "prod_a" }])
    productCloud.retrieveProduct.mockResolvedValue({
      id: "prod_a",
      current_owner_seller_id: "sel_1",
    })
    productCloud.updateProducts.mockResolvedValue(undefined)
    productCloud.listProductVariants.mockResolvedValue([{ id: "var_a" }])
    productCloud.listIdentifiers.mockResolvedValue([{ id: "ident_a" }])
    commerce.listSellerShippingProfiles.mockResolvedValue([
      {
        id: "cshp_1",
        seller_id: "sel_1",
        country_rates: { NL: defaultCountryConfig(3.5) },
      },
    ])
    commerce.listOffers.mockResolvedValue([
      { id: "off_a", region_code: "NL", delivery_days_max: 3 },
    ])
    commerce.listOfferPrices.mockResolvedValue([
      { id: "price_a", shipping_cost: 10 },
    ])
    commerce.updateOffers.mockResolvedValue(undefined)
    commerce.updateOfferPrices.mockResolvedValue(undefined)

    await resyncOffersForShippingProfile(commerce as never, productCloud as never, {
      sellerId: "sel_1",
      profileId: "cshp_1",
    })

    expect(commerce.updateOffers).toHaveBeenCalledTimes(1)
    expect(commerce.updateOfferPrices).toHaveBeenCalledTimes(1)
    expect((commerce as { createOffers?: jest.Mock }).createOffers).toBeUndefined()
  })
})

describe("syncProfileToProductOffers (assign path still works)", () => {
  it("assigns profile and updates offer shipping data", async () => {
    const { commerce, productCloud } = buildMocks()
    productCloud.retrieveProduct.mockResolvedValue({
      id: "prod_a",
      current_owner_seller_id: "sel_1",
    })
    productCloud.updateProducts.mockResolvedValue(undefined)
    productCloud.listProductVariants.mockResolvedValue([{ id: "var_a" }])
    productCloud.listIdentifiers.mockResolvedValue([{ id: "ident_a" }])
    commerce.listSellerShippingProfiles.mockResolvedValue([
      {
        id: "cshp_1",
        seller_id: "sel_1",
        country_rates: {
          BE: defaultCountryConfig(9.95),
        },
      },
    ])
    commerce.listOffers.mockResolvedValue([
      { id: "off_be", region_code: "BE", delivery_days_max: 4 },
    ])
    commerce.listOfferPrices.mockResolvedValue([
      { id: "price_be", shipping_cost: 12 },
    ])
    commerce.updateOffers.mockResolvedValue(undefined)
    commerce.updateOfferPrices.mockResolvedValue(undefined)

    const result = await syncProfileToProductOffers(
      commerce as never,
      productCloud as never,
      { sellerId: "sel_1", productId: "prod_a", profileId: "cshp_1" }
    )

    expect(productCloud.updateProducts).toHaveBeenCalledWith({
      id: "prod_a",
      shipping_profile_id: "cshp_1",
    })
    expect(result.offers_updated).toBe(1)
    expect(commerce.updateOfferPrices).toHaveBeenCalledWith({
      id: "price_be",
      shipping_cost: 9.95,
    })
  })

  it("clears offer profile link when unassigning", async () => {
    const { commerce, productCloud } = buildMocks()
    productCloud.retrieveProduct.mockResolvedValue({
      id: "prod_a",
      current_owner_seller_id: "sel_1",
    })
    productCloud.updateProducts.mockResolvedValue(undefined)
    productCloud.listProductVariants.mockResolvedValue([{ id: "var_a" }])
    productCloud.listIdentifiers.mockResolvedValue([{ id: "ident_a" }])
    commerce.listOffers.mockResolvedValue([
      { id: "off_a", region_code: "NL", delivery_days_max: 3 },
    ])
    commerce.updateOffers.mockResolvedValue(undefined)

    const result = await syncProfileToProductOffers(
      commerce as never,
      productCloud as never,
      { sellerId: "sel_1", productId: "prod_a", profileId: null }
    )

    expect(productCloud.updateProducts).toHaveBeenCalledWith({
      id: "prod_a",
      shipping_profile_id: null,
    })
    expect(commerce.updateOffers).toHaveBeenCalledWith({
      id: "off_a",
      shipping_profile_id: null,
    })
    expect(commerce.updateOfferPrices).not.toHaveBeenCalled()
    expect(result.offers_updated).toBe(1)
  })
})
