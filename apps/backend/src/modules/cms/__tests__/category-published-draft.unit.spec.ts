import {
  computeDraftSyncState,
  documentFingerprint,
  isStaleDraftBase,
  CategoryPdError,
  assertDraftRevision,
} from "../category-published-draft"

describe("category published/draft helpers", () => {
  it("computes sync states", () => {
    expect(
      computeDraftSyncState({
        publishedDocument: { a: 1 },
        draftDocument: null,
        publishedVersion: 1,
      })
    ).toBe("absent")
    expect(
      computeDraftSyncState({
        publishedDocument: { a: 1 },
        draftDocument: { a: 1 },
        publishedVersion: 1,
      })
    ).toBe("in_sync")
    expect(
      computeDraftSyncState({
        publishedDocument: { a: 1 },
        draftDocument: { a: 2 },
        publishedVersion: 1,
      })
    ).toBe("unpublished_changes")
    expect(
      computeDraftSyncState({
        publishedDocument: null,
        draftDocument: { a: 1 },
        publishedVersion: 0,
      })
    ).toBe("unpublished_changes")
  })

  it("detects stale draft base", () => {
    expect(
      isStaleDraftBase({
        draftDocument: { x: 1 },
        publishedVersion: 2,
        draftBaseVersion: 1,
      })
    ).toBe(true)
    expect(
      isStaleDraftBase({
        draftDocument: { x: 1 },
        publishedVersion: 2,
        draftBaseVersion: 2,
      })
    ).toBe(false)
    expect(
      isStaleDraftBase({
        draftDocument: null,
        publishedVersion: 2,
        draftBaseVersion: 1,
      })
    ).toBe(false)
  })

  it("fingerprints documents stably", () => {
    expect(documentFingerprint({ a: 1, b: 2 })).toBe(
      documentFingerprint({ a: 1, b: 2 })
    )
  })

  it("throws 409-class revision conflicts", () => {
    try {
      assertDraftRevision({ id: "x", category_slug: "s", draft_revision: 3 }, 2)
      throw new Error("expected throw")
    } catch (err) {
      expect(err).toBeInstanceOf(CategoryPdError)
      expect((err as CategoryPdError).httpStatus).toBe(409)
      expect((err as CategoryPdError).code).toBe("draft_revision_conflict")
    }
  })
})
