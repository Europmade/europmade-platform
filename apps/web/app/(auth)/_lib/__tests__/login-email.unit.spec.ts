import { isValidLoginEmail, normalizeLoginEmail } from "../login-email"

describe("login email field", () => {
  it("accepts the seller-flow test account", () => {
    expect(
      isValidLoginEmail("seller-flow-20260804144242@example.com")
    ).toBe(true)
  })

  it("accepts a simple naam@example.com address", () => {
    expect(isValidLoginEmail("naam@example.com")).toBe(true)
  })

  it("trims spaces and invisible characters", () => {
    expect(
      normalizeLoginEmail("\u00a0 seller-flow-20260804144242@example.com \n")
    ).toBe("seller-flow-20260804144242@example.com")
  })

  it("strips wrapping quotes from copy-paste", () => {
    expect(
      normalizeLoginEmail('"seller-flow-20260804144242@example.com"')
    ).toBe("seller-flow-20260804144242@example.com")
  })

  it("rejects addresses without @ or domain", () => {
    expect(isValidLoginEmail("niet-een-email")).toBe(false)
    expect(isValidLoginEmail("foo@")).toBe(false)
    expect(isValidLoginEmail("@example.com")).toBe(false)
    expect(isValidLoginEmail("a@b")).toBe(false)
  })
})
