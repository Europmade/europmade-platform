import { MedusaError } from "@medusajs/framework/utils"
import {
  assertProductsFreeForActivation,
  canonicalValuesKey,
  normalizeProductLinkProposal,
  productIdsBlockingActivation,
  proposalPersistenceTouchesCatalogOrOffers,
  type ProductLinkProposalInput,
} from "../product-link-groups"

const PRODUCTS = new Set(["prod_A", "prod_B", "prod_C", "prod_D"])

function petrolShirts(
  overrides: Partial<ProductLinkProposalInput> = {}
): ProductLinkProposalInput {
  return {
    name: "Petrol Industries 3-pack T-shirts",
    dimensions: ["Kleur", "Maat"],
    members: [
      {
        product_id: "prod_A",
        values: { Kleur: "Zwart", Maat: "M" },
      },
      {
        product_id: "prod_B",
        values: { Kleur: "Wit", Maat: "M" },
      },
    ],
    note: "Zelfde lijn, andere kleur/maat.",
    ...overrides,
  }
}

function expectInvalid(run: () => unknown, snippet: string) {
  try {
    run()
    throw new Error("expected INVALID_DATA")
  } catch (err) {
    expect(err).toBeInstanceOf(MedusaError)
    expect((err as Error).message).toContain(snippet)
  }
}

describe("product link group proposals", () => {
  it("accepts a valid proposal with one dimension", () => {
    const result = normalizeProductLinkProposal(
      {
        name: "Kleurreeks",
        dimensions: ["Kleur"],
        members: [
          { product_id: "prod_A", values: { Kleur: "Zwart" } },
          { product_id: "prod_B", values: { Kleur: "Wit" } },
        ],
      },
      "sel_submitter",
      PRODUCTS
    )
    expect(result.status).toBe("proposed")
    expect(result.dimensions).toEqual(["Kleur"])
    expect(result.members).toHaveLength(2)
    expect(result.members[0].values_key).toBe("Kleur=Zwart")
  })

  it("accepts a valid proposal with multiple dimensions", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts({
        members: [
          { product_id: "prod_A", values: { Kleur: "Zwart", Maat: "M" } },
          { product_id: "prod_B", values: { Kleur: "Wit", Maat: "M" } },
          { product_id: "prod_C", values: { Kleur: "Zwart", Maat: "L" } },
          { product_id: "prod_D", values: { Kleur: "Wit", Maat: "L" } },
        ],
      }),
      "sel_submitter",
      PRODUCTS
    )
    expect(result.dimensions).toEqual(["Kleur", "Maat"])
    expect(result.members).toHaveLength(4)
    expect(canonicalValuesKey(["Kleur", "Maat"], result.members[3].values)).toBe(
      "Kleur=Wit|Maat=L"
    )
  })

  it("keeps multiple standalone product ids", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts(),
      "sel_c",
      PRODUCTS
    )
    expect(result.members.map((m) => m.product_id)).toEqual(["prod_A", "prod_B"])
  })

  it("rejects a duplicate product within the same group", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({
            members: [
              { product_id: "prod_A", values: { Kleur: "Zwart", Maat: "M" } },
              { product_id: "prod_A", values: { Kleur: "Wit", Maat: "M" } },
            ],
          }),
          "sel_c",
          PRODUCTS
        ),
      "twee keer"
    )
  })

  it("rejects a duplicate full value tuple", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({
            members: [
              { product_id: "prod_A", values: { Kleur: "Zwart", Maat: "M" } },
              { product_id: "prod_B", values: { Kleur: "Zwart", Maat: "M" } },
            ],
          }),
          "sel_c",
          PRODUCTS
        ),
      "waardetupel"
    )
  })

  it("rejects a missing dimension value", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({
            members: [
              { product_id: "prod_A", values: { Kleur: "Zwart" } },
              { product_id: "prod_B", values: { Kleur: "Wit", Maat: "M" } },
            ],
          }),
          "sel_c",
          PRODUCTS
        ),
      "Ontbrekende waarde"
    )
  })

  it("rejects an empty dimensions list", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({ dimensions: [] }),
          "sel_c",
          PRODUCTS
        ),
      "Minimaal één dimensie"
    )
  })

  it("rejects a product that does not exist", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({
            members: [
              { product_id: "prod_missing", values: { Kleur: "Zwart", Maat: "M" } },
            ],
          }),
          "sel_c",
          PRODUCTS
        ),
      "bestaat niet"
    )
  })

  it("stores the proposal as proposed", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts(),
      "sel_c",
      PRODUCTS
    )
    expect(result.status).toBe("proposed")
  })

  it("takes seller identity from the auth context, not the body", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts({ submitter_seller_id: "sel_spoof" }),
      "sel_authenticated",
      PRODUCTS
    )
    expect(result.submitter_seller_id).toBe("sel_authenticated")
  })

  it("does not let a seller create an active group", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({ status: "active" }),
          "sel_c",
          PRODUCTS
        ),
      "proposed"
    )
  })

  it("does not describe a Product Cloud product mutation", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts(),
      "sel_c",
      PRODUCTS
    )
    expect(result).not.toHaveProperty("title")
    expect(result).not.toHaveProperty("lifecycle_status")
    expect(
      proposalPersistenceTouchesCatalogOrOffers({
        updateProducts: undefined,
        updateOffers: undefined,
        createProductVariants: undefined,
      })
    ).toBe(false)
  })

  it("does not describe an offer mutation", () => {
    expect(
      proposalPersistenceTouchesCatalogOrOffers({
        updateOffers: true,
      })
    ).toBe(true)
    const result = normalizeProductLinkProposal(
      petrolShirts(),
      "sel_c",
      PRODUCTS
    )
    expect(JSON.stringify(result)).not.toMatch(/base_price|seller_sku|quantity/)
  })

  it("does not require product ownership to submit a link proposal", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts(),
      "sel_not_owner",
      PRODUCTS
    )
    expect(result.submitter_seller_id).toBe("sel_not_owner")
    expect(result.members.map((m) => m.product_id)).toEqual(["prod_A", "prod_B"])
  })

  it("does not allow a product to join two active groups", () => {
    expect(
      productIdsBlockingActivation(["prod_A", "prod_B"], ["prod_A"])
    ).toEqual(["prod_A"])
    expect(() =>
      assertProductsFreeForActivation(["prod_A"], ["prod_A"])
    ).toThrow(/actieve koppelgroep/)
    expect(() =>
      assertProductsFreeForActivation(["prod_B"], ["prod_A"])
    ).not.toThrow()
  })
})
