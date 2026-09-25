import {
  buildProductManagerRequestFields,
  findProductManagerProposalChange,
  formatProductManagerStateValue,
  isAlreadyProductManager,
  isProductManagerProposalFields,
  parseProductManagerProposedValue,
  resolveProductManagerRequestKind,
} from "../product-manager-request"
import { normalizeProposedFields } from "../change-proposal-fields"

describe("product-manager-request", () => {
  it("resolves request kind: brand owner wins over offer", () => {
    expect(
      resolveProductManagerRequestKind({ hasOffer: true, isBrandOwner: true })
    ).toBe("brand_owner")
    expect(
      resolveProductManagerRequestKind({ hasOffer: true, isBrandOwner: false })
    ).toBe("seller")
    expect(
      resolveProductManagerRequestKind({ hasOffer: false, isBrandOwner: false })
    ).toBeNull()
  })

  it("detects already-manager for seller and brand_owner", () => {
    expect(
      isAlreadyProductManager({
        actorSellerId: "sel_a",
        kind: "seller",
        seller_id: "sel_a",
        isBrandOwner: false,
      })
    ).toBe(true)
    expect(
      isAlreadyProductManager({
        actorSellerId: "sel_a",
        kind: "seller",
        seller_id: "sel_b",
        isBrandOwner: false,
      })
    ).toBe(false)
    expect(
      isAlreadyProductManager({
        actorSellerId: "sel_a",
        kind: "brand_owner",
        isBrandOwner: true,
      })
    ).toBe(true)
  })

  it("builds and parses request payload", () => {
    const fields = buildProductManagerRequestFields({
      currentKind: "none",
      currentSellerId: null,
      requestKind: "seller",
      requesterSellerId: "sel_a",
    })
    expect(isProductManagerProposalFields(fields)).toBe(true)
    expect(findProductManagerProposalChange(fields)?.proposed_value).toBe(
      "seller:sel_a"
    )
    expect(parseProductManagerProposedValue("seller:sel_a")).toEqual({
      kind: "seller",
      seller_id: "sel_a",
    })
    expect(parseProductManagerProposedValue("brand_owner")).toEqual({
      kind: "brand_owner",
      seller_id: null,
    })
    expect(formatProductManagerStateValue({ kind: "none" })).toBe("none")
  })

  it("normalizeProposedFields accepts product_manager", () => {
    const n = normalizeProposedFields({
      changes: [
        {
          field: "product_manager",
          label: "Productbeheerder",
          current_value: "none",
          proposed_value: "seller:sel_x",
        },
      ],
    })
    expect(n?.changes[0]?.field).toBe("product_manager")
  })
})
