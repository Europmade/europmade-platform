import {
  normalizeMediaReference,
  resolveMediaUrl,
} from "../public-url"

describe("resolveMediaUrl", () => {
  const origin = "http://localhost:9000"

  it("prefixes /static paths with backend origin", () => {
    expect(resolveMediaUrl("/static/foo.jpg", origin)).toBe(
      "http://localhost:9000/static/foo.jpg"
    )
  })

  it("strips localhost from stored absolute URLs", () => {
    expect(
      resolveMediaUrl("http://localhost:9000/static/foo.jpg", origin)
    ).toBe("http://localhost:9000/static/foo.jpg")
  })

  it("returns null for upload:// markers", () => {
    expect(resolveMediaUrl("upload://pending.jpg", origin)).toBeNull()
  })

  it("normalizes legacy static/ without leading slash", () => {
    expect(normalizeMediaReference("static/foo.jpg")).toBe("/static/foo.jpg")
  })
})
