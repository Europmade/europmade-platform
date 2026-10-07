import {
  contentFieldsInPatch,
  isSendableVersion,
  normalizeTokenWhitelist,
  resolveVersionTransition,
} from "../communication-cms-rules"

const draft = {
  used_at: null,
  approval_status: "draft",
  activation_status: "inactive",
}

describe("communication CMS rules", () => {
  it("treats only approved and active as sendable", () => {
    expect(
      isSendableVersion({
        approval_status: "approved",
        activation_status: "active",
      })
    ).toBe(true)
    expect(
      isSendableVersion({
        approval_status: "approved",
        activation_status: "inactive",
      })
    ).toBe(false)
    expect(
      isSendableVersion({
        approval_status: "draft",
        activation_status: "active",
      })
    ).toBe(false)
  })

  it("rejects content patches on an existing version", () => {
    expect(contentFieldsInPatch({ subject: "Nieuw" })).toEqual(["subject"])
    expect(contentFieldsInPatch({ approval_status: "approved" })).toEqual([])
  })

  it("allows approval then activation, and blocks active without approved", () => {
    const pending = resolveVersionTransition(draft, {
      approval_status: "pending_review",
    })
    expect(pending).toEqual({
      approval_status: "pending_review",
      activation_status: "inactive",
    })

    const approved = resolveVersionTransition(
      { ...draft, approval_status: "pending_review" },
      { approval_status: "approved" }
    )
    expect(approved.approval_status).toBe("approved")

    const active = resolveVersionTransition(
      { ...draft, approval_status: "approved" },
      { activation_status: "active" }
    )
    expect(active).toEqual({
      approval_status: "approved",
      activation_status: "active",
    })

    expect(() =>
      resolveVersionTransition(draft, { activation_status: "active" })
    ).toThrow(/approved/)
  })

  it("refuses any status change after the version is used", () => {
    expect(() =>
      resolveVersionTransition(
        {
          used_at: new Date(),
          approval_status: "approved",
          activation_status: "active",
        },
        { activation_status: "archived" }
      )
    ).toThrow(/onwijzigbaar/)
  })

  it("accepts a token whitelist and rejects free text", () => {
    expect(normalizeTokenWhitelist(["company_name", " company_name "])).toEqual(
      ["company_name"]
    )
    expect(() => normalizeTokenWhitelist(["Beste klant"])).toThrow(/token/)
  })
})
