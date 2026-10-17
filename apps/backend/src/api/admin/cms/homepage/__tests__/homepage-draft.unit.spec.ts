import {
  DRAFT_HOMEPAGE_KEY,
  LIVE_HOMEPAGE_KEY,
  planHomepageSave,
  resolveHomepageEditor,
} from "../homepage-draft"

describe("homepage draft save", () => {
  it("stores a concept on a separate key and leaves the live row untouched", () => {
    expect(planHomepageSave(false)).toEqual({
      writeKey: DRAFT_HOMEPAGE_KEY,
      writePublished: false,
      touchLive: false,
      deleteDraft: false,
    })
  })

  it("replaces the live homepage only when publishing", () => {
    expect(planHomepageSave(true)).toEqual({
      writeKey: LIVE_HOMEPAGE_KEY,
      writePublished: true,
      touchLive: true,
      deleteDraft: true,
    })
  })

  it("reopens the concept while the live homepage stays published", () => {
    const live = { id: "live", title: "Freiluft" }
    const draft = { id: "draft", title: "concept" }
    expect(
      resolveHomepageEditor({
        live,
        draft,
        isLivePublished: true,
      })
    ).toEqual({
      editor: draft,
      published: true,
      hasDraft: true,
    })
  })

  it("opens the live homepage when no concept exists", () => {
    const live = { id: "live" }
    expect(
      resolveHomepageEditor({
        live,
        draft: null,
        isLivePublished: true,
      })
    ).toEqual({
      editor: live,
      published: true,
      hasDraft: false,
    })
  })
})
