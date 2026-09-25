import { normalizeProposalImageMime } from "../proposal-image-mime"

describe("normalizeProposalImageMime", () => {
  it("accepts image/jpg as jpeg", () => {
    expect(normalizeProposalImageMime("image/jpg", "photo.jpg")).toBe(
      "image/jpeg"
    )
  })

  it("accepts image/jpeg", () => {
    expect(normalizeProposalImageMime("image/jpeg", "photo.jpeg")).toBe(
      "image/jpeg"
    )
  })

  it("falls back to extension when mime is empty", () => {
    expect(normalizeProposalImageMime("", "shot.JPG")).toBe("image/jpeg")
    expect(normalizeProposalImageMime(undefined, "a.png")).toBe("image/png")
  })

  it("rejects non-images", () => {
    expect(normalizeProposalImageMime("application/pdf", "a.pdf")).toBeNull()
  })
})
