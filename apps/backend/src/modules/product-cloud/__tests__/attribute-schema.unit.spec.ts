import {
  dedupeAttributeSchemaByCode,
  resolveAttributeValueByCode,
} from "../attribute-schema"

describe("attribute schema dedupe", () => {
  it("keeps one field per code and prefers the valued definition", () => {
    const fields = dedupeAttributeSchemaByCode([
      {
        id: "def_a",
        code: "gpsr_manufacturer_address",
        value: null,
        sort_order: 10,
      },
      {
        id: "def_b",
        code: "gpsr_manufacturer_address",
        value: "Straat 1",
        sort_order: 20,
      },
      {
        id: "def_c",
        code: "maat",
        value: "M",
        sort_order: 1,
      },
    ])
    expect(fields).toHaveLength(2)
    expect(
      fields.find((row) => row.code === "gpsr_manufacturer_address")?.id
    ).toBe("def_b")
    expect(fields.find((row) => row.code === "maat")?.value).toBe("M")
  })

  it("resolves values across duplicate definition ids for the same code", () => {
    const defs = [
      { id: "def_parent", code: "kleur" },
      { id: "def_child", code: "kleur" },
    ]
    const valueByDef = new Map<string, { value: string; id: string }>([
      ["def_child", { value: "Deep Black", id: "val_1" }],
    ])
    const resolved = resolveAttributeValueByCode(defs, valueByDef)
    expect(resolved.get("def_parent")?.value).toBe("Deep Black")
    expect(resolved.get("def_child")?.value).toBe("Deep Black")
  })
})
