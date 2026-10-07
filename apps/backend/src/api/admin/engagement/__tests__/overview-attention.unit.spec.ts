import {
  attentionLabel,
  followUpOrganizationIds,
} from "../admin-engagement-query"

describe("vandaag aandacht", () => {
  it("toont contact en bedrijf zonder een lege combinatie", () => {
    expect(attentionLabel("Maria Müller", "ABC GmbH")).toEqual({
      title: "Maria Müller",
      subtitle: "ABC GmbH",
    })
    expect(attentionLabel(null, "ABC GmbH")).toEqual({
      title: "ABC GmbH",
      subtitle: null,
    })
    expect(attentionLabel("Maria Müller", null)).toEqual({
      title: "Maria Müller",
      subtitle: null,
    })
    expect(attentionLabel("  ", "")).toBeNull()
  })

  it("bundelt opvolging uit prospectstatus en acquisition-enrollment", () => {
    expect(
      followUpOrganizationIds(
        [
          { id: "eorg_a", outreach_status: "opvolging_nodig" },
          { id: "eorg_b", outreach_status: "te_benaderen" },
          { id: "eorg_c", outreach_status: "opvolging_nodig" },
        ],
        [
          {
            organization_id: "eorg_a",
            program_type: "acquisition",
            status: "human_follow_up",
          },
          {
            organization_id: "eorg_d",
            program_type: "acquisition",
            status: "human_follow_up",
          },
          {
            organization_id: "eorg_e",
            program_type: "onboarding",
            status: "human_follow_up",
          },
          {
            organization_id: "eorg_f",
            program_type: "acquisition",
            status: "active",
          },
        ]
      )
    ).toEqual(["eorg_a", "eorg_c", "eorg_d"])
  })
})