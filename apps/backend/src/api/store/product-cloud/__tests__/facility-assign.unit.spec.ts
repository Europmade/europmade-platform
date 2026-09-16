import { MedusaError } from "@medusajs/framework/utils"
import { assertFacilityAssignableToBrand } from "../made-in-europe-helpers"

describe("assertFacilityAssignableToBrand", () => {
  const facilityA = {
    brand_id: "brand_a",
    is_active: true,
  }

  it("allows a location that belongs to the selected brand", () => {
    expect(() =>
      assertFacilityAssignableToBrand({
        facility: facilityA,
        brandId: "brand_a",
        currentFacilityId: null,
        nextFacilityId: "loc_a",
      })
    ).not.toThrow()
  })

  it("rejects a location that belongs to another brand", () => {
    try {
      assertFacilityAssignableToBrand({
        facility: { brand_id: "brand_b", is_active: true },
        brandId: "brand_a",
        currentFacilityId: "loc_a",
        nextFacilityId: "loc_b",
      })
      throw new Error("expected reject")
    } catch (err) {
      expect(err).toBeInstanceOf(MedusaError)
      expect((err as Error).message).toMatch(/hoort niet bij het geselecteerde merk/)
    }
  })

  it("rejects assignment when no brand is selected", () => {
    try {
      assertFacilityAssignableToBrand({
        facility: facilityA,
        brandId: "",
        nextFacilityId: "loc_a",
      })
      throw new Error("expected reject")
    } catch (err) {
      expect(err).toBeInstanceOf(MedusaError)
      expect((err as Error).message).toMatch(/Selecteer eerst een merk/)
    }
  })

  it("rejects a deactivated location for a new link", () => {
    try {
      assertFacilityAssignableToBrand({
        facility: { brand_id: "brand_a", is_active: false },
        brandId: "brand_a",
        currentFacilityId: "loc_old",
        nextFacilityId: "loc_inactive",
      })
      throw new Error("expected reject")
    } catch (err) {
      expect(err).toBeInstanceOf(MedusaError)
      expect((err as Error).message).toMatch(/gedeactiveerd/)
    }
  })

  it("keeps an existing deactivated location link", () => {
    expect(() =>
      assertFacilityAssignableToBrand({
        facility: { brand_id: "brand_a", is_active: false },
        brandId: "brand_a",
        currentFacilityId: "loc_inactive",
        nextFacilityId: "loc_inactive",
      })
    ).not.toThrow()
  })
})
