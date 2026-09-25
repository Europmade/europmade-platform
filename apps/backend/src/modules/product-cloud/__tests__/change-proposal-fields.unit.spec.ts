import {
  adminProductSearchMatches,
  hasAnyProposalContent,
  normalizeProposedFields,
  summarizeProposedFields,
  titleDescriptionFromProposedFields,
} from "../change-proposal-fields"

describe("change-proposal-fields", () => {
  it("accepts structured central field proposals", () => {
    const fields = normalizeProposedFields({
      changes: [
        {
          field: "attribute",
          label: "Kleur",
          current_value: "Zwart",
          proposed_value: "Grijs",
          attribute_definition_id: "attr_1",
        },
        {
          field: "brand_id",
          label: "Merk",
          current_value: "brand_a",
          proposed_value: "brand_b",
        },
      ],
    })
    expect(fields?.changes).toHaveLength(2)
    expect(summarizeProposedFields(fields)).toEqual(["Kleur", "Merk"])
  })

  it("maps title/description from proposed_fields for legacy columns", () => {
    const fields = normalizeProposedFields({
      changes: [
        {
          field: "title",
          label: "Productnaam",
          current_value: "Oud",
          proposed_value: "Nieuw",
        },
      ],
    })
    expect(titleDescriptionFromProposedFields(fields)).toEqual({
      title: "Nieuw",
      description: undefined,
    })
  })

  it("allows proposal content via proposed_fields alone", () => {
    expect(
      hasAnyProposalContent({
        proposed_title: null,
        proposed_description: null,
        proposed_fields: {
          changes: [
            {
              field: "media_note",
              label: "Media",
              current_value: null,
              proposed_value: "Betere hoofdafbeelding nodig",
            },
          ],
        },
      })
    ).toBe(true)
  })

  it("rejects empty proposed values", () => {
    expect(
      normalizeProposedFields({
        changes: [
          {
            field: "title",
            label: "Productnaam",
            current_value: "x",
            proposed_value: "   ",
          },
        ],
      })
    ).toBeNull()
  })

  it("keeps media proposal with storage refs even without note text", () => {
    const fields = normalizeProposedFields({
      changes: [
        {
          field: "media_note",
          label: "Media",
          current_value: null,
          proposed_value: "",
          storage_references: ["https://cdn.example/img.webp"],
        },
      ],
    })
    expect(fields?.changes).toHaveLength(1)
    expect(fields?.changes[0].storage_references).toEqual([
      "https://cdn.example/img.webp",
    ])
  })

  it("matches admin product search by tokens across brand+title", () => {
    expect(
      adminProductSearchMatches(
        "dt 1990 pro mkii beyerdynamic",
        "beyerdynamic DT 1990 PRO MKII"
      )
    ).toBe(true)
    expect(
      adminProductSearchMatches("dt 1990 pro mkii", "beyerdynamic DT 1990")
    ).toBe(false)
  })
})
